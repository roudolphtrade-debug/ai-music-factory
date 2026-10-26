import { beforeEach, describe, expect, it } from "vitest";
import {
  ANON,
  CLAIM_TTL_MS,
  PREP_PREFIX,
  PREP_PROMPT_MAX,
  PREP_TTL_MS,
  adoptAnonymousPrep,
  clearPrep,
  hasPrep,
  memberOwner,
  parsePrep,
  purgeExpiredPreps,
  readPrep,
  savePrep,
  type PrepFields,
} from "./prep";

/** A minimal in-memory Storage, so that no test depends on a browser. */
class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  clear() {
    this.map.clear();
  }
  getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  key(index: number) {
    return [...this.map.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
}

const DAY = 24 * 60 * 60 * 1000;
const T0 = 1_800_000_000_000;
const fields = (prompt = "A slow ballad"): PrepFields => ({
  prompt,
  genre: "Afrobeats",
  mood: "Warm",
  voice: "Alto",
});
let storage: MemoryStorage;
beforeEach(() => {
  storage = new MemoryStorage();
});

describe("seven days on this device", () => {
  it("is kept for seven days after the last change, then gone", () => {
    expect(PREP_TTL_MS).toBe(7 * DAY);
    const owner = memberOwner("user-1");
    savePrep(owner, fields(), { now: T0, storage });
    expect(readPrep(owner, T0 + 6 * DAY + 23 * 3_600_000, storage)?.fields).toEqual(fields());
    expect(readPrep(owner, T0 + 7 * DAY, storage)).toBeNull();
    // and the expired record has been removed, not just hidden
    expect(storage.length).toBe(0);
  });

  it("counts from the last change: a later change starts a new seven days", () => {
    const owner = memberOwner("user-1");
    savePrep(owner, fields("first"), { now: T0, storage });
    savePrep(owner, fields("second"), { now: T0 + 5 * DAY, storage });
    expect(readPrep(owner, T0 + 9 * DAY, storage)?.fields.prompt).toBe("second");
    expect(readPrep(owner, T0 + 12 * DAY + 1, storage)).toBeNull();
  });

  it("reading it does not extend it", () => {
    const owner = memberOwner("user-1");
    savePrep(owner, fields(), { now: T0, storage });
    readPrep(owner, T0 + 6 * DAY, storage);
    expect(readPrep(owner, T0 + 7 * DAY, storage)).toBeNull();
  });

  it("drops a record dated in the future or with the wrong shape", () => {
    const owner = memberOwner("user-1");
    storage.setItem(
      `${PREP_PREFIX}u:user-1`,
      JSON.stringify({ v: 1, savedAt: T0 + DAY, fields: fields() }),
    );
    expect(readPrep(owner, T0, storage)).toBeNull();
    for (const bad of [
      "not json",
      "{}",
      '{"v":2}',
      JSON.stringify({ v: 1, savedAt: "x", fields: fields() }),
    ]) {
      storage.setItem(`${PREP_PREFIX}u:user-1`, bad);
      expect(readPrep(owner, T0, storage), bad).toBeNull();
    }
  });

  it("bounds what it reads and what it writes", () => {
    const owner = memberOwner("user-1");
    savePrep(owner, fields("x".repeat(PREP_PROMPT_MAX + 50)), { now: T0, storage });
    expect(readPrep(owner, T0, storage)?.fields.prompt).toHaveLength(PREP_PROMPT_MAX);
    expect(
      parsePrep({
        v: 1,
        savedAt: T0,
        fields: { ...fields(), prompt: "x".repeat(PREP_PROMPT_MAX + 1) },
      }),
    ).toBeNull();
    expect(parsePrep({ v: 1, savedAt: T0, fields: { ...fields(), genre: 5 } })).toBeNull();
  });

  it("purges every expired slot and keeps the others", () => {
    savePrep(memberOwner("a"), fields(), { now: T0, storage });
    savePrep(memberOwner("b"), fields(), { now: T0 + 6 * DAY, storage });
    storage.setItem("unrelated", "kept");
    purgeExpiredPreps(T0 + 8 * DAY, storage);
    expect(storage.getItem(`${PREP_PREFIX}u:a`)).toBeNull();
    expect(storage.getItem(`${PREP_PREFIX}u:b`)).not.toBeNull();
    expect(storage.getItem("unrelated")).toBe("kept");
  });
});

describe("no resumption by another account", () => {
  it("gives each account its own slot: one never reads another's", () => {
    savePrep(memberOwner("alice"), fields("alice's song"), { now: T0, storage });
    expect(readPrep(memberOwner("bob"), T0, storage)).toBeNull();
    expect(readPrep(ANON, T0, storage)).toBeNull();
    expect(hasPrep(memberOwner("bob"), T0, storage)).toBe(false);
    expect(readPrep(memberOwner("alice"), T0, storage)?.fields.prompt).toBe("alice's song");
  });

  it("hands the anonymous preparation to the account that signs in through the Generate click", () => {
    savePrep(ANON, fields("visitor's song"), { now: T0, claim: true, storage });
    const taken = adoptAnonymousPrep("alice", T0 + 60_000, storage);
    expect(taken?.fields.prompt).toBe("visitor's song");
    expect(readPrep(memberOwner("alice"), T0 + 60_000, storage)?.fields.prompt).toBe(
      "visitor's song",
    );
    // the anonymous slot is empty: the next account finds nothing to take
    expect(readPrep(ANON, T0 + 60_000, storage)).toBeNull();
    expect(adoptAnonymousPrep("bob", T0 + 120_000, storage)).toBeNull();
    expect(readPrep(memberOwner("bob"), T0 + 120_000, storage)).toBeNull();
  });

  it("does not hand it to anyone without the claim set by the Generate click", () => {
    savePrep(ANON, fields("typed, never submitted"), { now: T0, storage });
    expect(adoptAnonymousPrep("alice", T0 + 1000, storage)).toBeNull();
    expect(readPrep(memberOwner("alice"), T0 + 1000, storage)).toBeNull();
    expect(readPrep(ANON, T0 + 1000, storage)?.fields.prompt).toBe("typed, never submitted");
  });

  it("lets the claim lapse after 24 hours", () => {
    expect(CLAIM_TTL_MS).toBe(DAY);
    savePrep(ANON, fields(), { now: T0, claim: true, storage });
    expect(adoptAnonymousPrep("alice", T0 + DAY, storage)).toBeNull();
    expect(readPrep(memberOwner("alice"), T0 + DAY, storage)).toBeNull();
  });

  it("keeps an unexpired claim through later edits, and keeps the original date for the seven days", () => {
    savePrep(ANON, fields("v1"), { now: T0, claim: true, storage });
    savePrep(ANON, fields("v2"), { now: T0 + 3_600_000, storage });
    const taken = adoptAnonymousPrep("alice", T0 + 2 * 3_600_000, storage);
    expect(taken?.fields.prompt).toBe("v2");
    expect(taken?.savedAt).toBe(T0 + 3_600_000);
  });

  it("an account that signs in again replaces its older preparation with the one it just made", () => {
    savePrep(memberOwner("alice"), fields("old"), { now: T0, storage });
    savePrep(ANON, fields("new"), { now: T0 + DAY, claim: true, storage });
    adoptAnonymousPrep("alice", T0 + DAY + 1000, storage);
    expect(readPrep(memberOwner("alice"), T0 + DAY + 1000, storage)?.fields.prompt).toBe("new");
  });

  it("erases only the owner's slot", () => {
    savePrep(memberOwner("alice"), fields(), { now: T0, storage });
    savePrep(memberOwner("bob"), fields(), { now: T0, storage });
    clearPrep(memberOwner("alice"), storage);
    expect(hasPrep(memberOwner("alice"), T0, storage)).toBe(false);
    expect(hasPrep(memberOwner("bob"), T0, storage)).toBe(true);
  });
});

describe("storage that cannot be used", () => {
  it("does nothing and says so, without throwing", () => {
    expect(savePrep(ANON, fields(), { storage: null })).toBe(false);
    expect(readPrep(ANON, T0, null)).toBeNull();
    expect(adoptAnonymousPrep("alice", T0, null)).toBeNull();
    const full: Storage = {
      ...new MemoryStorage(),
      length: 0,
      clear() {},
      getItem: () => null,
      key: () => null,
      removeItem() {},
      setItem() {
        throw new DOMException("quota", "QuotaExceededError");
      },
    };
    expect(savePrep(ANON, fields(), { storage: full })).toBe(false);
  });
});
