import { describe, expect, it } from "vitest";
import {
  OWNER_DEMO_MAX_CALLS,
  PrivateDemoBudgetError,
  completeOwnerDemoCall,
  isOwner,
  reserveOwnerDemoCall,
  type BudgetDatabase,
  type BudgetStatement,
} from "./private-demo-budget";

const IDS = Array.from({ length: 8 }, (_, i) =>
  "11111111-1111-4111-8111-" + String(i).padStart(12, "0"),
);

/** Deterministic fake D1 for the public contract. NOT a substitute for real D1 integration tests. */
class FakeD1 implements BudgetDatabase {
  used_calls = 0;
  active_request_id: string | null = null;
  request_ids: string[] = [];
  available = true;
  failWrites = false;
  lastUpdateSql = "";
  prepare(sql: string): BudgetStatement {
    const self = this;
    let values: (string | number | null)[] = [];
    const statement: BudgetStatement = {
      bind(...args) {
        values = args;
        return statement;
      },
      async first<T>() {
        if (!self.available || self.failWrites) throw new Error("D1 unavailable");
        if (sql.startsWith("UPDATE")) {
          self.lastUpdateSql = sql;
          const id = values[0];
          if (typeof id !== "string") throw new Error("bad identifier");
          if (sql.includes("SET used_calls")) {
            if (self.used_calls >= 5 || self.active_request_id || self.request_ids.includes(id)) return null;
            self.used_calls += 1;
            self.active_request_id = id;
            self.request_ids.push(id);
            return { used_calls: self.used_calls } as T;
          }
          if (sql.includes("SET active_request_id")) {
            if (self.active_request_id !== id) return null;
            self.active_request_id = null;
            return { used_calls: self.used_calls } as T;
          }
        }
        if (sql.startsWith("SELECT")) {
          return {
            used_calls: self.used_calls,
            active_request_id: self.active_request_id,
            request_ids: JSON.stringify(self.request_ids),
          } as T;
        }
        throw new Error("unexpected statement");
      },
    };
    return statement;
  }
}

describe("private Lyria pilot owner identity", () => {
  it("fails closed when the owner is not configured", () => {
    expect(isOwner("user-1", undefined)).toBe(false);
    expect(isOwner("user-1", "")).toBe(false);
    expect(isOwner("user-1", "user-2")).toBe(false);
    expect(isOwner("user-1", "user-1")).toBe(true);
  });
});

describe("private Lyria pilot durable budget contract", () => {
  it("fails closed without a database or with invalid request ID", async () => {
    await expect(reserveOwnerDemoCall(null, IDS[0])).rejects.toMatchObject({ reason: "unavailable" });
    const db = new FakeD1();
    await expect(reserveOwnerDemoCall(db, "repeat-me")).rejects.toMatchObject({ reason: "invalid_request" });
    expect(db.used_calls).toBe(0);
  });

  it("allows only five distinct reservations total, even after completing", async () => {
    const db = new FakeD1();
    for (let i = 0; i < OWNER_DEMO_MAX_CALLS; i++) {
      await expect(reserveOwnerDemoCall(db, IDS[i])).resolves.toBe(i + 1);
      await completeOwnerDemoCall(db, IDS[i]);
    }
    await expect(reserveOwnerDemoCall(db, IDS[5])).rejects.toMatchObject({ reason: "exhausted" });
    expect(db.used_calls).toBe(5);
    expect(db.request_ids).toHaveLength(5);
  });

  it("refuses a different request while another generation is in flight", async () => {
    const db = new FakeD1();
    await reserveOwnerDemoCall(db, IDS[0]);
    await expect(reserveOwnerDemoCall(db, IDS[1])).rejects.toMatchObject({ reason: "busy" });
    expect(db.request_ids).toEqual([IDS[0]]);
    expect(db.used_calls).toBe(1);
  });

  it("does not spend twice on replay, even after completion", async () => {
    const db = new FakeD1();
    await reserveOwnerDemoCall(db, IDS[0]);
    await expect(reserveOwnerDemoCall(db, IDS[0])).rejects.toMatchObject({ reason: "duplicate" });
    await completeOwnerDemoCall(db, IDS[0]);
    await expect(reserveOwnerDemoCall(db, IDS[0])).rejects.toMatchObject({ reason: "duplicate" });
    expect(db.used_calls).toBe(1);
  });

  it("never auto-releases an uncertain or failed upstream call", async () => {
    const db = new FakeD1();
    await reserveOwnerDemoCall(db, IDS[0]);
    expect(db.active_request_id).toBe(IDS[0]);
    await expect(reserveOwnerDemoCall(db, IDS[1])).rejects.toMatchObject({ reason: "busy" });
    expect(db.active_request_id).toBe(IDS[0]);
  });

  it("does not let the wrong ID release a held reservation", async () => {
    const db = new FakeD1();
    await reserveOwnerDemoCall(db, IDS[0]);
    await expect(completeOwnerDemoCall(db, IDS[1])).rejects.toMatchObject({ reason: "unavailable" });
    expect(db.active_request_id).toBe(IDS[0]);
  });

  it("turns database faults into closed refusals, not permission to spend", async () => {
    const db = new FakeD1();
    db.available = false;
    await expect(reserveOwnerDemoCall(db, IDS[0])).rejects.toBeInstanceOf(PrivateDemoBudgetError);
    await expect(completeOwnerDemoCall(db, IDS[0])).rejects.toMatchObject({ reason: "unavailable" });
  });

  it("uses an atomic conditional UPDATE with idempotence and an in-flight lock", async () => {
    const db = new FakeD1();
    await reserveOwnerDemoCall(db, IDS[0]);
    expect(db.lastUpdateSql).toMatch(/UPDATE aimf_owner_demo_budget/);
    expect(db.lastUpdateSql).toMatch(/SET used_calls = used_calls \+ 1/);
    expect(db.lastUpdateSql).toMatch(/active_request_id IS NULL/);
    expect(db.lastUpdateSql).toMatch(/json_each\(request_ids\)/);
    expect(db.lastUpdateSql).toMatch(/RETURNING used_calls/);
  });
});
