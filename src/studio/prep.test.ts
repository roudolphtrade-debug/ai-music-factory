import { beforeEach, describe, expect, it } from "vitest";
import {
  ANON,
  CLAIM_TTL_MS,
  PREP_PREFIX,
  PREP_PROMPT_MAX,
  PREP_TTL_MS,
  adoptAnonymousPrep,
  clearPrep,
  discardAnonymousPrep,
  hasPrep,
  memberOwner,
  parsePrep,
  peekAnonymousPrep,
  purgeExpiredPreps,
  readPrep,
  recoverAnonymousPrep,
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

describe("the confirmed recovery of an anonymous preparation", () => {
  const fields: PrepFields = { prompt: "made before the account", genre: "Trap", mood: "Warm", voice: "Alto" };
  let storage: MemoryStorage;
  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it("peeks without moving anything, and ignores an expired one", () => {
    expect(peekAnonymousPrep(Date.now(), storage)).toBeNull();
    savePrep(ANON, fields, { storage });
    expect(peekAnonymousPrep(Date.now(), storage)?.fields.prompt).toBe("made before the account");
    expect(readPrep(ANON, Date.now(), storage)).not.toBeNull(); // still there
    const old = new MemoryStorage();
    savePrep(ANON, fields, { storage: old, now: Date.now() - PREP_TTL_MS - 1 });
    expect(peekAnonymousPrep(Date.now(), old)).toBeNull();
  });

  it("hands an unclaimed preparation to the member who confirms, and empties the anonymous slot", () => {
    savePrep(ANON, fields, { storage }); // no claim: the visitor never clicked Generate
    expect(adoptAnonymousPrep("alice", Date.now(), storage)).toBeNull(); // nothing moves by itself
    const result = recoverAnonymousPrep("alice", Date.now(), storage);
    expect(result.status).toBe("recovered");
    expect(readPrep(memberOwner("alice"), Date.now(), storage)?.fields).toEqual(fields);
    expect(readPrep(ANON, Date.now(), storage)).toBeNull();
  });

  it("does not extend the seven days, and gives nothing to anyone else", () => {
    const savedAt = Date.now() - 3 * 24 * 3_600_000;
    savePrep(ANON, fields, { storage, now: savedAt });
    recoverAnonymousPrep("alice", Date.now(), storage);
    expect(readPrep(memberOwner("alice"), Date.now(), storage)?.savedAt).toBe(savedAt);
    expect(readPrep(memberOwner("bob"), Date.now(), storage)).toBeNull();
    // the slot is empty now: a second account has nothing to take
    expect(recoverAnonymousPrep("bob", Date.now(), storage).status).toBe("gone");
  });

  it("says 'gone' when there is nothing, when it expired, or when there is no storage", () => {
    expect(recoverAnonymousPrep("alice", Date.now(), storage).status).toBe("gone");
    savePrep(ANON, fields, { storage, now: Date.now() - PREP_TTL_MS - 1 });
    expect(recoverAnonymousPrep("alice", Date.now(), storage).status).toBe("gone");
    expect(readPrep(memberOwner("alice"), Date.now(), storage)).toBeNull();
    expect(recoverAnonymousPrep("alice", Date.now(), null).status).toBe("gone");
  });

  it("expires between the offer and the confirmation: nothing moves", () => {
    const now = Date.now();
    savePrep(ANON, fields, { storage, now: now - PREP_TTL_MS + 1000 });
    expect(peekAnonymousPrep(now, storage)).not.toBeNull(); // offered
    expect(recoverAnonymousPrep("alice", now + 5000, storage).status).toBe("gone"); // confirmed too late
    expect(readPrep(memberOwner("alice"), now + 5000, storage)).toBeNull();
  });

  it("fails without losing anything when the storage refuses the member's slot", () => {
    savePrep(ANON, fields, { storage });
    const refusing = Object.create(storage) as MemoryStorage;
    refusing.setItem = (key: string, value: string) => {
      if (key.startsWith(PREP_PREFIX + "u:")) throw new Error("quota");
      storage.setItem(key, value);
    };
    expect(recoverAnonymousPrep("alice", Date.now(), refusing).status).toBe("failed");
    expect(readPrep(ANON, Date.now(), storage)?.fields).toEqual(fields); // intact
    expect(readPrep(memberOwner("alice"), Date.now(), storage)).toBeNull();
  });

  it("an erase refused by the storage reports failure and keeps the preparation", () => {
    savePrep(ANON, fields, { storage });
    const refusing = Object.create(storage) as MemoryStorage;
    refusing.removeItem = () => {
      throw new Error("locked");
    };
    expect(discardAnonymousPrep(refusing)).toBe(false);
    expect(readPrep(ANON, Date.now(), storage)).not.toBeNull();
    expect(discardAnonymousPrep(storage)).toBe(true);
    expect(readPrep(ANON, Date.now(), storage)).toBeNull();
    expect(discardAnonymousPrep(null)).toBe(false);
  });
});

/** A storage that can be told to alter, refuse or silently ignore operations, to play a misbehaving browser. */
class ScriptedStorage extends MemoryStorage {
  /** May return another value to store instead (a write that does not store what it was given). */
  onSet: ((key: string, value: string, self: ScriptedStorage) => string | void) | null = null;
  blockSet: ((key: string) => "throw" | undefined) | null = null;
  blockRemove: ((key: string) => "throw" | "noop" | undefined) | null = null;
  override setItem(key: string, value: string) {
    if (this.blockSet?.(key) === "throw") throw new Error("quota");
    super.setItem(key, this.onSet?.(key, value, this) ?? value);
  }
  override removeItem(key: string) {
    const mode = this.blockRemove?.(key);
    if (mode === "throw") throw new Error("locked");
    if (mode === "noop") return;
    super.removeItem(key);
  }
  /** What another tab would do: write without going through the hooks. */
  raw(key: string, value: string) {
    MemoryStorage.prototype.setItem.call(this, key, value);
  }
}

describe("the recovery keeps the storage consistent when the browser misbehaves", () => {
  const ANON_KEY = PREP_PREFIX + "anon";
  const slot = (id: string) => PREP_PREFIX + "u:" + id;
  const anon: PrepFields = { prompt: "made before the account", genre: "Trap", mood: "Warm", voice: "Alto" };
  const own: PrepFields = { prompt: "alice's own words", genre: "Neo-Soul", mood: "Hypnotic", voice: "Soprano" };
  const NOW = T0 + 1000;
  let s: ScriptedStorage;
  const keys = () => Array.from({ length: s.length }, (_, i) => s.key(i)).sort();

  beforeEach(() => {
    s = new ScriptedStorage();
    savePrep(ANON, anon, { storage: s, now: T0, claim: true });
  });

  // ------------------------------------------------------------ the check compared the prompt only
  it.each([
    ["genre", '"genre":"Trap"', '"genre":"Hip-Hop"'],
    ["mood", '"mood":"Warm"', '"mood":"Calm"'],
    ["voice", '"voice":"Alto"', '"voice":"Tenor"'],
  ])("a write that keeps the prompt but changes the %s is refused, and the anonymous words stay", (_f, from, to) => {
    s.onSet = (key, value) => (key === slot("alice") ? value.replace(from, to) : undefined);
    const result = recoverAnonymousPrep("alice", NOW, s);
    expect(result.status).toBe("failed");
    expect(readPrep(ANON, NOW, s)?.fields).toEqual(anon); // nothing lost
    expect(s.getItem(slot("alice"))).toBeNull(); // nothing attached
  });

  it("a time that is not the anonymous one (another writer got there) is refused too", () => {
    s.onSet = (key, value) => (key === slot("alice") ? value.replace(/"savedAt":\d+/, '"savedAt":' + (T0 + 5)) : undefined);
    expect(recoverAnonymousPrep("alice", NOW, s).status).toBe("failed");
    expect(readPrep(ANON, NOW, s)?.fields).toEqual(anon);
    expect(s.getItem(slot("alice"))).toBeNull();
  });

  it("puts the account's own earlier preparation back exactly when it refuses", () => {
    savePrep(memberOwner("alice"), own, { storage: s, now: T0 });
    const before = s.getItem(slot("alice"));
    s.onSet = (key, value) => (key === slot("alice") ? value.replace('"genre":"Trap"', '"genre":"Hip-Hop"') : undefined);
    expect(recoverAnonymousPrep("alice", NOW, s).status).toBe("failed");
    expect(s.getItem(slot("alice"))).toBe(before);
    expect(readPrep(ANON, NOW, s)?.fields).toEqual(anon);
  });

  // ------------------------------------------------------------ the erase of the anonymous slot failed silently
  it.each([["throws", "throw"], ["silently does nothing", "noop"]] as const)(
    "an erase of the anonymous slot that %s after the write is a failure, not a success: nothing moves",
    (_name, mode) => {
      s.blockRemove = (key) => (key === ANON_KEY ? mode : undefined);
      expect(recoverAnonymousPrep("alice", NOW, s).status).toBe("failed");
      expect(readPrep(ANON, NOW, s)?.fields).toEqual(anon); // still there, still anonymous
      expect(s.getItem(slot("alice"))).toBeNull(); // no second copy attached to the account
    },
  );

  it("an erase refused after the write puts the account's own earlier preparation back exactly", () => {
    savePrep(memberOwner("alice"), own, { storage: s, now: T0 });
    const before = s.getItem(slot("alice"));
    s.blockRemove = (key) => (key === ANON_KEY ? "noop" : undefined);
    expect(recoverAnonymousPrep("alice", NOW, s).status).toBe("failed");
    expect(s.getItem(slot("alice"))).toBe(before);
    expect(readPrep(memberOwner("alice"), NOW, s)?.fields).toEqual(own);
  });

  it("if even the rollback is refused, the anonymous words are still not lost", () => {
    s.blockRemove = () => "noop"; // nothing can be erased: neither the anonymous slot nor the copy
    const result = recoverAnonymousPrep("alice", NOW, s);
    expect(result.status).toBe("failed");
    expect(readPrep(ANON, NOW, s)?.fields).toEqual(anon);
  });

  it("words typed in another tab between the copy and the erase are never erased", () => {
    const newer = new ScriptedStorage();
    savePrep(ANON, { ...anon, prompt: "newer words from another tab" }, { storage: newer, now: T0 + 500 });
    s.onSet = (key, _value, self) => {
      if (key === slot("alice")) self.raw(ANON_KEY, newer.getItem(ANON_KEY) as string); // the other tab writes now
    };
    expect(recoverAnonymousPrep("alice", NOW, s).status).toBe("failed");
    expect(readPrep(ANON, NOW, s)?.fields.prompt).toBe("newer words from another tab");
    expect(s.getItem(slot("alice"))).toBeNull();
  });

  // ------------------------------------------------------------ the receiving account
  it.each([[""], ["   "]])("refuses a missing or blank account identity (%j) and writes nothing", (id) => {
    const before = keys();
    expect(recoverAnonymousPrep(id, NOW, s).status).toBe("failed");
    expect(keys()).toEqual(before);
    expect(readPrep(ANON, NOW, s)?.fields).toEqual(anon);
  });

  it("writes only the intended account's slot, and touches no other account", () => {
    savePrep(memberOwner("bob"), own, { storage: s, now: T0 });
    const bobBefore = s.getItem(slot("bob"));
    const result = recoverAnonymousPrep("alice", NOW, s);
    expect(result.status).toBe("recovered");
    expect(keys()).toEqual([slot("alice"), slot("bob")].sort()); // the anonymous slot is gone, nothing else appeared
    expect(s.getItem(slot("bob"))).toBe(bobBefore);
    expect(readPrep(memberOwner("alice"), NOW, s)?.fields).toEqual(anon);
    expect(readPrep(memberOwner("alice"), NOW, s)?.savedAt).toBe(T0);
  });

  it("a recovery that goes through returns exactly the four fields that were stored", () => {
    const result = recoverAnonymousPrep("alice", NOW, s);
    expect(result.status === "recovered" && result.prep.fields).toEqual(anon);
  });

  // ------------------------------------------------------------ the claimed path (Generate click) has the same duty
  it("a claimed preparation whose erase fails is not handed over: nothing moves, the claim stays", () => {
    s.blockRemove = (key) => (key === ANON_KEY ? "noop" : undefined);
    expect(adoptAnonymousPrep("alice", NOW, s)).toBeNull();
    expect(s.getItem(slot("alice"))).toBeNull();
    expect(readPrep(ANON, NOW, s)?.claimUntil).toBeGreaterThan(NOW);
  });

  it("a claimed preparation that cannot be moved reports nothing moved, even when the account has its own", () => {
    savePrep(memberOwner("alice"), own, { storage: s, now: T0 });
    s.blockRemove = (key) => (key === ANON_KEY ? "noop" : undefined);
    expect(adoptAnonymousPrep("alice", NOW, s)).toBeNull(); // not the account's own words passed off as the result
    expect(readPrep(memberOwner("alice"), NOW, s)?.fields).toEqual(own);
  });

  it("a claimed preparation that is written wrongly is not handed over either", () => {
    s.onSet = (key, value) => (key === slot("alice") ? value.replace('"voice":"Alto"', '"voice":"Tenor"') : undefined);
    expect(adoptAnonymousPrep("alice", NOW, s)).toBeNull();
    expect(readPrep(ANON, NOW, s)?.fields).toEqual(anon);
    expect(s.getItem(slot("alice"))).toBeNull();
  });
});
