import { describe, expect, it } from "vitest";
import { authCopy, authText, fillCopy, type AuthKey } from "@/i18n/auth";
import { LANGS } from "@/i18n/translations";
import { classifyAuthError, isAlreadyRegistered } from "./errors";
import { AUTH_PATHS, absoluteUrl, readAuthUrlOutcome } from "./redirects";
import {
  forgotSchema,
  PASSWORD_MIN,
  normalizeHandle,
  profileSchema,
  resetSchema,
  safeRedirect,
  signInSchema,
  signUpSchema,
} from "./validation";

type Issue = { message: string; path: (string | number)[] };
/** What a form shows: the first message of each field (react-hook-form keeps the first issue). */
const messages = (result: { success: boolean; error?: { issues: Issue[] } }) => {
  if (result.success) return [];
  const seen = new Set<string>();
  return result
    .error!.issues.filter((i) => !seen.has(i.path.join(".")) && seen.add(i.path.join(".")))
    .map((i) => i.message);
};

// 15 characters with an uppercase letter, a lowercase letter, a digit and a symbol
const GOOD = "Amina-Studio-26";

describe("sign-up and sign-in validation", () => {
  it("accepts a plain address and a password that follows the policy", () => {
    expect(signUpSchema.safeParse({ email: " a@b.co ", password: GOOD }).success).toBe(true);
  });

  it("wants at least 12 characters and at most 72 bytes", () => {
    const check = (password: string) =>
      messages(signUpSchema.safeParse({ email: "a@b.co", password }));
    expect(PASSWORD_MIN).toBe(12);
    const pad = (n: number) => "Aa1!" + "x".repeat(n - 4); // n characters, all four classes
    expect(check(pad(11))).toEqual(["errPasswordMissing"]);
    expect(check(pad(12))).toEqual([]);
    expect(check(pad(72))).toEqual([]);
    expect(check(pad(73))).toEqual(["errPasswordLong"]);
    // two-byte letters: 34 of them make 72 bytes with the four classes, one more makes 74
    expect(check("Aa1!" + "é".repeat(34))).toEqual([]);
    expect(check("Aa1!" + "é".repeat(35))).toEqual(["errPasswordLong"]);
  });

  it.each(LANGS.map((l) => l.code))("states the same password rule as the code in %s", (lang) => {
    const copy = authCopy[lang];
    expect(copy.critLength).toContain(String(PASSWORD_MIN));
    expect(copy.errPasswordLong).toContain("72");
    expect(copy.passwordSymbols).toContain("{symbols}");
    expect(copy.errPasswordMissing).toContain("{missing}");
    expect(copy.critLength + copy.errPasswordLong).not.toMatch(/\b10\b/); // the old rule
  });

  it("explains each problem with a catalog key, never a raw message", () => {
    expect(messages(signUpSchema.safeParse({ email: "", password: "" }))).toEqual([
      "errRequired",
      "errRequired",
    ]);
    expect(messages(signUpSchema.safeParse({ email: "nope", password: GOOD }))).toEqual([
      "errEmail",
    ]);
    expect(messages(signUpSchema.safeParse({ email: "a@b.co", password: "123456789" }))).toEqual([
      "errPasswordMissing",
    ]);
  });

  it("refuses a password that is the address itself", () => {
    expect(
      messages(
        signUpSchema.safeParse({
          email: "Amina-Studio_26@example.test",
          password: "Amina-Studio_26@example.test", // follows the policy, but is the address
        }),
      ),
    ).toEqual(["errPasswordWeak"]);
  });

  it("does not impose the length rule at sign-in, so older passwords still work", () => {
    expect(signInSchema.safeParse({ email: "a@b.co", password: "short" }).success).toBe(true);
    expect(messages(signInSchema.safeParse({ email: "a@b.co", password: "" }))).toEqual([
      "errRequired",
    ]);
  });

  it("asks for the address only on the forgot-password form", () => {
    expect(messages(forgotSchema.safeParse({ email: "x" }))).toEqual(["errEmail"]);
  });

  it("checks the confirmation on the reset form", () => {
    expect(messages(resetSchema.safeParse({ password: GOOD, confirm: GOOD + "x" }))).toEqual([
      "errPasswordMismatch",
    ]);
    expect(resetSchema.safeParse({ password: GOOD, confirm: GOOD }).success).toBe(true);
    // the reset form applies the same policy as the sign-up form
    expect(
      messages(
        resetSchema.safeParse({ password: "alllowercase1234", confirm: "alllowercase1234" }),
      ),
    ).toEqual(["errPasswordMissing"]);
  });
});

describe("profile validation", () => {
  it("normalizes a handle: no @, lower case", () => {
    expect(normalizeHandle("  @Studio_A ")).toBe("studio_a");
  });

  it("accepts an empty handle (optional) and a valid one", () => {
    expect(profileSchema.safeParse({ displayName: "Amina", handle: "" }).success).toBe(true);
    const parsed = profileSchema.parse({ displayName: " Amina ", handle: "@Amina_O" });
    expect(parsed).toEqual({ displayName: "Amina", handle: "amina_o" });
  });

  it("refuses a handle that is too short, too long or has other characters", () => {
    const expected: [string, string][] = [
      ["ab", "errHandleShort"],
      ["a".repeat(25), "errHandleLong"],
      ["a b c", "errHandleChars"],
      ["ça_va", "errHandleChars"],
      ["a-b-c", "errHandleChars"],
    ];
    for (const [handle, key] of expected) {
      expect(messages(profileSchema.safeParse({ displayName: "Amina", handle })), handle).toEqual([
        key,
      ]);
    }
  });

  it("requires a name of 1 to 60 characters", () => {
    expect(messages(profileSchema.safeParse({ displayName: "  ", handle: "" }))).toEqual([
      "errName",
    ]);
    expect(messages(profileSchema.safeParse({ displayName: "x".repeat(61), handle: "" }))).toEqual([
      "errName",
    ]);
  });
});

describe("post-sign-in destination", () => {
  it("keeps same-site paths only", () => {
    expect(safeRedirect("/settings")).toBe("/settings");
    expect(safeRedirect("/library?tab=favorites")).toBe("/library?tab=favorites");
  });

  it.each([
    "https://evil.test",
    "//evil.test",
    "/\\evil",
    "javascript:alert(1)",
    "settings",
    "",
    42,
    undefined,
    null,
  ])("refuses %j", (value) => {
    expect(safeRedirect(value)).toBeUndefined();
  });

  it("never sends the member back to an account page", () => {
    expect(safeRedirect("/auth/sign-in")).toBeUndefined();
    expect(safeRedirect("/auth/reset-password")).toBeUndefined();
  });
});

describe("what the backend says, mapped to what the screens show", () => {
  const cases: [string, number, string][] = [
    ["invalid_credentials", 400, "credentials"],
    ["email_not_confirmed", 400, "not_confirmed"],
    ["over_request_rate_limit", 429, "rate_limit"],
    ["over_email_send_rate_limit", 429, "rate_limit"],
    ["weak_password", 422, "weak_password"],
    ["same_password", 422, "same_password"],
    ["signup_disabled", 422, "signup_disabled"],
    ["session_expired", 401, "session"],
    ["refresh_token_not_found", 400, "session"],
    ["otp_expired", 403, "expired"],
    ["email_address_invalid", 400, "invalid_email"],
    ["validation_failed", 400, "invalid_email"],
    ["23505", 409, "handle_taken"],
    ["something_new", 400, "generic"],
    ["something_new", 500, "service_error"],
    ["email_address_not_authorized", 400, "email_failed"],
  ];
  it.each(cases)("%s (%i) is %s", (code, status, kind) => {
    expect(
      classifyAuthError({ name: "AuthApiError", code, status, message: "RAW TEXT" }).kind,
    ).toBe(kind);
  });

  it("recognizes a network failure however it surfaces", () => {
    expect(classifyAuthError({ name: "AuthRetryableFetchError", message: "x" }).kind).toBe(
      "network",
    );
    expect(classifyAuthError(new TypeError("Failed to fetch")).kind).toBe("network");
    expect(
      classifyAuthError({ message: "NetworkError when attempting to fetch resource." }).kind,
    ).toBe("network");
  });

  it("falls back on the HTTP status or the legacy message when there is no code", () => {
    expect(classifyAuthError({ status: 429 }).kind).toBe("rate_limit");
    expect(classifyAuthError({ message: "Invalid login credentials" }).kind).toBe("credentials");
    expect(classifyAuthError({ message: "Email not confirmed" }).kind).toBe("not_confirmed");
  });

  it("never exposes the backend's own wording", () => {
    for (const [code, status] of cases) {
      const failure = classifyAuthError({
        name: "AuthApiError",
        code,
        status,
        message: "RAW TEXT user@example.test",
      });
      for (const lang of LANGS)
        expect(authText(lang.code, failure.key)).not.toMatch(/RAW TEXT|user@example/);
    }
    expect(classifyAuthError(undefined).kind).toBe("generic");
    expect(classifyAuthError("boom").kind).toBe("generic");
  });

  it("treats an address that already has an account as a normal sign-up", () => {
    expect(isAlreadyRegistered({ code: "user_already_exists" })).toBe(true);
    expect(isAlreadyRegistered({ code: "email_exists" })).toBe(true);
    expect(isAlreadyRegistered({ code: "weak_password" })).toBe(false);
    expect(isAlreadyRegistered(null)).toBe(false);
  });
});

describe("links coming back from an email", () => {
  it("reads an expired link from the URL fragment (implicit flow)", () => {
    const hash =
      "#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired";
    expect(readAuthUrlOutcome({ hash, search: "" })).toEqual({
      kind: "error",
      code: "otp_expired",
      expired: true,
    });
  });

  it("reads an expired link from the query string too", () => {
    const search = "?error=access_denied&error_code=otp_expired";
    expect(readAuthUrlOutcome({ hash: "", search })).toMatchObject({
      kind: "error",
      expired: true,
    });
  });

  it("tells an unusable link from an expired one", () => {
    expect(
      readAuthUrlOutcome({
        hash: "#error=access_denied&error_code=bad_code&error_description=nope",
        search: "",
      }),
    ).toEqual({
      kind: "error",
      code: "bad_code",
      expired: false,
    });
  });

  it("recognizes a link that carries a session, with its type", () => {
    expect(
      readAuthUrlOutcome({ hash: "#access_token=abc&refresh_token=def&type=signup", search: "" }),
    ).toEqual({ kind: "link", type: "signup" });
    expect(readAuthUrlOutcome({ hash: "#access_token=abc&type=recovery", search: "" })).toEqual({
      kind: "link",
      type: "recovery",
    });
    expect(readAuthUrlOutcome({ hash: "", search: "?code=pkce" })).toEqual({
      kind: "link",
      type: undefined,
    });
  });

  it("answers 'none' for a page opened by hand", () => {
    expect(readAuthUrlOutcome({ hash: "", search: "" })).toEqual({ kind: "none" });
    expect(readAuthUrlOutcome(null)).toEqual({ kind: "none" });
  });

  it("builds absolute addresses for the links inside emails", () => {
    expect(absoluteUrl(AUTH_PATHS.confirm, "https://app.example")).toBe(
      "https://app.example/auth/confirm",
    );
    expect(absoluteUrl(AUTH_PATHS.reset, "http://localhost:8080")).toBe(
      "http://localhost:8080/auth/reset-password",
    );
  });
});

describe("account catalog, six languages", () => {
  const codes = LANGS.map((l) => l.code);
  const keys = Object.keys(authCopy.fr) as AuthKey[];
  const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

  it("has every key in every language, none empty", () => {
    for (const lang of codes) {
      expect(Object.keys(authCopy[lang]).sort(), lang).toEqual([...keys].sort());
      for (const key of keys)
        expect(authCopy[lang][key].trim().length, `${lang}:${key}`).toBeGreaterThan(0);
    }
  });

  it("uses the same placeholders in every language", () => {
    for (const key of keys) {
      for (const lang of codes)
        expect(placeholders(authCopy[lang][key]), `${lang}:${key}`).toEqual(
          placeholders(authCopy.fr[key]),
        );
    }
  });

  it("fills them", () => {
    expect(authText("fr", "checkDesc", { email: "a@b.co" })).toContain("a@b.co");
    expect(authText("ar", "resendIn", { s: 42 })).toContain("42");
    expect(fillCopy("Hi {name} {other}", { name: "Amina" })).toBe("Hi Amina {other}");
    for (const lang of codes) {
      for (const key of keys)
        expect(
          authText(lang, key, {
            email: "x",
            s: 1,
            name: "n",
            chars: "c",
            count: 1,
            suggestion: "s",
            symbols: "y",
            missing: "m",
          }),
          `${lang}:${key}`,
        ).not.toMatch(/[{}]/);
    }
  });

  it("really translates: no language repeats the English text for key sentences", () => {
    for (const key of [
      "signUpTitle",
      "checkTitle",
      "expiredTitle",
      "errCredentials",
      "resetTitle",
      "welcomeDesc",
      "localDesc",
    ] as AuthKey[]) {
      for (const lang of codes.filter((c) => c !== "en"))
        expect(authCopy[lang][key], `${lang}:${key}`).not.toBe(authCopy.en[key]);
    }
  });

  it("uses the right script for Chinese and Arabic", () => {
    for (const key of keys) {
      expect(authCopy.zh[key], key).toMatch(/[一-鿿]/);
      expect(authCopy.ar[key], key).toMatch(/[؀-ۿ]/);
    }
  });

  it("keeps the editorial punctuation: no em dash", () => {
    for (const lang of codes)
      for (const key of keys) expect(authCopy[lang][key]).not.toContain("—");
  });

  it("never leaks a technical word in a visible error", () => {
    for (const lang of codes) {
      for (const key of keys.filter((k) => k.startsWith("err"))) {
        expect(authCopy[lang][key], `${lang}:${key}`).not.toMatch(
          /supabase|gotrue|jwt|token|\b4\d\d\b|\b5\d\d\b/i,
        );
      }
    }
  });
});
