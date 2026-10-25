import { describe, expect, it } from "vitest";
import {
  missingCriteria,
  passwordCriteria,
  passwordTooLong,
  PASSWORD_CRITERIA,
  PASSWORD_MIN,
  PASSWORD_SYMBOLS,
  type PasswordCriterion,
} from "./password";
import { newPasswordSchema, resetSchema, signInSchema, signUpSchema } from "./validation";

/** One sample for each criterion; a password is built from the samples it should meet. */
const PIECE: Record<Exclude<PasswordCriterion, "length">, string> = {
  upper: "Q",
  lower: "z",
  digit: "7",
  special: "!",
};
const FILLER = "x"; // lower case: the lower-case criterion is met by it, so it is added back in only when asked
const build = (met: PasswordCriterion[]) => {
  // letters that would meet a criterion by accident are avoided: filler is a symbol-free, digit-free, case-neutral run
  const pieces = (Object.keys(PIECE) as (keyof typeof PIECE)[])
    .filter((k) => met.includes(k))
    .map((k) => PIECE[k]);
  const body = pieces.join("");
  // length: pad with a character that meets no other criterion (a space is none of the four classes)
  const pad = met.includes("length")
    ? Math.max(0, PASSWORD_MIN - body.length)
    : 3 - Math.min(3, body.length);
  return body + " ".repeat(pad);
};

describe("each criterion on its own", () => {
  it("is 12 characters at least, counted in characters", () => {
    expect(PASSWORD_MIN).toBe(12);
    expect(passwordCriteria("a".repeat(11)).length).toBe(false);
    expect(passwordCriteria("a".repeat(12)).length).toBe(true);
    expect(passwordCriteria("a".repeat(13)).length).toBe(true);
    // two UTF-16 units but one character each: 6 emoji are 6 characters, not 12
    expect(passwordCriteria("😀".repeat(6)).length).toBe(false);
    expect(passwordCriteria("😀".repeat(12)).length).toBe(true);
    expect(passwordCriteria("é".repeat(12)).length).toBe(true);
  });

  it("wants an uppercase letter A to Z", () => {
    expect(passwordCriteria("abc").upper).toBe(false);
    expect(passwordCriteria("abcA").upper).toBe(true);
    expect(passwordCriteria("Zabc").upper).toBe(true);
    // accented capitals are not uppercase letters for the service
    expect(passwordCriteria("ÉÈÀÇ").upper).toBe(false);
  });

  it("wants a lowercase letter a to z", () => {
    expect(passwordCriteria("ABC").lower).toBe(false);
    expect(passwordCriteria("ABCa").lower).toBe(true);
    expect(passwordCriteria("zABC").lower).toBe(true);
    expect(passwordCriteria("éèàç").lower).toBe(false);
  });

  it("wants a digit 0 to 9", () => {
    expect(passwordCriteria("abcDEF").digit).toBe(false);
    expect(passwordCriteria("abc0").digit).toBe(true);
    expect(passwordCriteria("9abc").digit).toBe(true);
    // digits of other scripts are not the service's digits
    expect(passwordCriteria("٣٤٥").digit).toBe(false);
  });

  it("wants a symbol from the service's own list, and nothing else counts", () => {
    for (const symbol of Array.from(PASSWORD_SYMBOLS)) {
      expect(passwordCriteria("a" + symbol).special, symbol).toBe(true);
    }
    for (const other of [" ", "é", "€", "£", "§", "°", "😀", "“", "–", "·", "¿"]) {
      expect(passwordCriteria("a" + other + "A1").special, JSON.stringify(other)).toBe(false);
    }
  });

  it("the symbol list is the documented one, with the quote, the backslash and the backtick", () => {
    expect(PASSWORD_SYMBOLS).toBe("!@#$%^&*()_+-=[]{};'\\:\"|<>?,./`~");
    expect(Array.from(PASSWORD_SYMBOLS)).toHaveLength(32);
  });

  it("refuses more than 72 bytes", () => {
    expect(passwordTooLong("a".repeat(72))).toBe(false);
    expect(passwordTooLong("a".repeat(73))).toBe(true);
    expect(passwordTooLong("é".repeat(36))).toBe(false); // 72 bytes
    expect(passwordTooLong("é".repeat(37))).toBe(true);
  });
});

describe("every combination of the five criteria", () => {
  // 32 combinations: build a password that meets exactly the chosen criteria and check what is missing
  const all = PASSWORD_CRITERIA;
  const combos: PasswordCriterion[][] = [];
  for (let mask = 0; mask < 1 << all.length; mask += 1)
    combos.push(all.filter((_, i) => mask & (1 << i)));

  it.each(combos.map((c) => [c.join("+") || "none", c] as const))(
    "meets exactly: %s",
    (_name, met) => {
      const password = build(met);
      expect(missingCriteria(password), JSON.stringify(password)).toEqual(
        all.filter((c) => !met.includes(c)),
      );
      // the schema accepts a password exactly when nothing is missing
      const result = newPasswordSchema.safeParse(password);
      expect(result.success, JSON.stringify(password)).toBe(met.length === all.length);
      if (!result.success) {
        // one precise outcome: either required (empty) or the "still missing" message
        expect(result.error.issues[0].message).toBe(
          password === "" ? "errRequired" : "errPasswordMissing",
        );
      }
    },
  );

  it("lists what is missing in a fixed order: length, uppercase, lowercase, digit, symbol", () => {
    expect(missingCriteria("")).toEqual(["length", "upper", "lower", "digit", "special"]);
    expect(missingCriteria("abcdefghijkl")).toEqual(["upper", "digit", "special"]);
    expect(missingCriteria("ABCDEFGHIJKL")).toEqual(["lower", "digit", "special"]);
    expect(missingCriteria("Abcdefghijkl")).toEqual(["digit", "special"]);
    expect(missingCriteria("Abcdefghijk1")).toEqual(["special"]);
    expect(missingCriteria("Abcdefghij1!")).toEqual([]);
    expect(missingCriteria("Aa1!")).toEqual(["length"]);
  });

  it("a compliant password of exactly 12 characters passes, 11 does not", () => {
    expect(missingCriteria("Abcdefghi1!x")).toEqual([]);
    expect(missingCriteria("Abcdefgh1!x")).toEqual(["length"]);
  });
});

describe("the same policy on sign-up and reset, and none at sign-in", () => {
  const email = "a@b.co";
  const weak = "alllowercase1234";
  const good = "Amina-Studio-26";

  it("sign-up and reset refuse the same passwords", () => {
    for (const password of [
      weak,
      "UPPERCASE-1234",
      "NoDigits-Here-!!",
      "NoSymbol1234ABC",
      "Short-1A",
    ]) {
      expect(signUpSchema.safeParse({ email, password }).success, password).toBe(false);
      expect(resetSchema.safeParse({ password, confirm: password }).success, password).toBe(false);
    }
    expect(signUpSchema.safeParse({ email, password: good }).success).toBe(true);
    expect(resetSchema.safeParse({ password: good, confirm: good }).success).toBe(true);
  });

  it("an existing account can still sign in with the password it already has", () => {
    for (const password of ["short", weak, "12345678", "a"]) {
      expect(signInSchema.safeParse({ email, password }).success, password).toBe(true);
    }
  });
});

describe("test helper sanity", () => {
  it("build() meets exactly what it is asked", () => {
    expect(FILLER).toBe("x");
    expect(passwordCriteria(build(["upper", "lower", "digit", "special", "length"]))).toEqual({
      length: true,
      upper: true,
      lower: true,
      digit: true,
      special: true,
    });
    expect(passwordCriteria(build([]))).toEqual({
      length: false,
      upper: false,
      lower: false,
      digit: false,
      special: false,
    });
  });
});
