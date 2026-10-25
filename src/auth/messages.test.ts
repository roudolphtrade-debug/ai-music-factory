import { describe, expect, it } from "vitest";
import { authCopy, authText, type AuthKey } from "@/i18n/auth";
import { LANGS } from "@/i18n/translations";
import { classifyAuthError } from "./errors";
import {
  formatRefusedChars,
  handleProblem,
  HANDLE_EXAMPLE,
  isolate,
  normalizeHandle,
  suggestHandle,
} from "./handle";

const codes = LANGS.map((l) => l.code);

describe("why a handle is refused", () => {
  it("accepts an empty handle (it is optional), a valid one, and what normalization fixes", () => {
    expect(handleProblem("")).toBeNull();
    expect(handleProblem("amina_o")).toBeNull();
    expect(handleProblem("abc")).toBeNull();
    expect(handleProblem("a".repeat(24))).toBeNull();
    // capitals, a leading @ and surrounding spaces are not mistakes
    expect(handleProblem(normalizeHandle("  @Amina_O "))).toBeNull();
  });

  it("names the characters that are not allowed, once each, in the order typed", () => {
    expect(handleProblem("ça_va")).toEqual({ key: "errHandleChars", chars: ["ç"] });
    expect(handleProblem("a-b-c")).toEqual({ key: "errHandleChars", chars: ["-"] });
    expect(handleProblem("é-é- ü")).toEqual({ key: "errHandleChars", chars: ["é", "-", " ", "ü"] });
    expect(handleProblem("amina.o@x")).toEqual({ key: "errHandleChars", chars: [".", "@"] });
  });

  it("gives the length typed when it is too short or too long", () => {
    expect(handleProblem("ab")).toEqual({ key: "errHandleShort", count: 2 });
    expect(handleProblem("a")).toEqual({ key: "errHandleShort", count: 1 });
    expect(handleProblem("a".repeat(25))).toEqual({ key: "errHandleLong", count: 25 });
    expect(handleProblem("a".repeat(40))).toEqual({ key: "errHandleLong", count: 40 });
  });

  it("reports the characters first: shortening does not help while they are there", () => {
    expect(handleProblem("é")?.key).toBe("errHandleChars"); // also too short
    expect(handleProblem("é".repeat(30))?.key).toBe("errHandleChars"); // also too long
  });

  it("counts a character that takes two code units once", () => {
    expect(handleProblem("a😀")).toEqual({ key: "errHandleChars", chars: ["😀"] });
  });

  it("shows at most six refused characters, spaces by name, isolated for right-to-left text", () => {
    const text = formatRefusedChars(["é", " ", "-"], "space");
    expect(text).toContain("é, (space), -");
    expect(
      formatRefusedChars(
        ["a", "b", "c", "d", "e", "f", "g", "h"].map((c) => c.toUpperCase()),
        "space",
      ),
    ).toContain(", …");
    expect(text.codePointAt(0)).toBe(0x2066);
    expect(text.codePointAt(text.length - 1)).toBe(0x2069);
    expect(isolate("x")).toBe(`${String.fromCodePoint(0x2066)}x${String.fromCodePoint(0x2069)}`);
  });

  it("suggests another handle that is itself valid", () => {
    expect(suggestHandle("amina_o")).toBe("amina_o2");
    expect(handleProblem(suggestHandle("amina_o"))).toBeNull();
    expect(suggestHandle("a".repeat(24))).toHaveLength(24);
    expect(handleProblem(suggestHandle("a".repeat(24)))).toBeNull();
    expect(handleProblem(suggestHandle("ça"))).toBeNull(); // too short once cleaned: falls back to the example
    expect(suggestHandle("@AMINA O")).toBe("aminao2");
  });
});

describe.each(codes)("the handle messages in %s", (lang) => {
  const say = (key: AuthKey, vars: Record<string, string | number> = {}) =>
    authText(lang, key, vars);

  it("shows the refused characters, the length and a valid example", () => {
    const chars = say("errHandleChars", { chars: "XCHARSX" });
    expect(chars).toContain("XCHARSX");
    expect(chars).toContain(HANDLE_EXAMPLE);
    for (const key of ["errHandleShort", "errHandleLong"] as const) {
      const text = say(key, { count: 37 });
      expect(text, key).toContain("37");
      expect(text, key).toContain(key === "errHandleShort" ? "3" : "24");
      expect(text, key).toContain(HANDLE_EXAMPLE);
    }
    expect(say("handleHint")).toContain(HANDLE_EXAMPLE);
  });

  it("says the handle is taken and offers another one", () => {
    const text = say("errHandleTaken", { suggestion: "XSUGGESTX" });
    expect(text).toContain("XSUGGESTX");
    expect(text).not.toMatch(/[{}]/);
  });

  it("is translated: not the English sentence", () => {
    if (lang === "en") return;
    for (const key of [
      "errHandleChars",
      "errHandleShort",
      "errHandleTaken",
      "handleHint",
      "charSpace",
    ] as const)
      expect(authCopy[lang][key], key).not.toBe(authCopy.en[key]);
  });
});

describe("a network problem, a mail failure and a service failure are three different messages", () => {
  const smtp = {
    name: "AuthRetryableFetchError",
    status: 500,
    message: "Error sending confirmation email",
  };

  it("an HTTP 500 about sending the mail is a mail failure, not a network problem", () => {
    expect(classifyAuthError(smtp)).toEqual({ kind: "email_failed", key: "errEmailSend" });
    expect(
      classifyAuthError({
        name: "AuthApiError",
        status: 500,
        code: "unexpected_failure",
        message: "Error sending confirmation email",
      }).kind,
    ).toBe("email_failed");
  });

  it("an address the mail service may not write to is a mail failure too", () => {
    expect(
      classifyAuthError({
        name: "AuthApiError",
        status: 400,
        code: "email_address_not_authorized",
        message: "x",
      }).kind,
    ).toBe("email_failed");
  });

  it("other 5xx answers (including gateway ones) are a service failure", () => {
    for (const status of [500, 502, 503, 504, 522])
      expect(
        classifyAuthError({
          name: "AuthRetryableFetchError",
          status,
          message: "Database error saving new user",
        }),
        String(status),
      ).toEqual({
        kind: "service_error",
        key: "errServiceDown",
      });
  });

  it("only a request that got no HTTP answer is a network problem", () => {
    expect(
      classifyAuthError({ name: "AuthRetryableFetchError", status: 0, message: "Failed to fetch" })
        .kind,
    ).toBe("network");
    expect(classifyAuthError(new TypeError("Failed to fetch")).kind).toBe("network");
    expect(classifyAuthError({ name: "AuthRetryableFetchError", message: "x" }).kind).toBe(
      "network",
    );
  });

  it.each(codes)(
    "the three messages differ in %s, and only the network one talks about the connection to blame",
    (lang) => {
      const network = authCopy[lang].errNetwork;
      const mail = authCopy[lang].errEmailSend;
      const service = authCopy[lang].errServiceDown;
      expect(new Set([network, mail, service]).size).toBe(3);
      // The two service-side messages tell the member it is not their connection; they never ask them to check it.
      expect(mail).not.toBe(network);
      expect(service).not.toBe(network);
    },
  );

  it("the English texts say what happened without technical details", () => {
    expect(authCopy.en.errNetwork).toMatch(/network/i);
    expect(authCopy.en.errEmailSend).toMatch(/email could not be sent/i);
    expect(authCopy.en.errEmailSend).not.toMatch(/check your network/i);
    expect(authCopy.en.errServiceDown).not.toMatch(/check your network/i);
  });

  it.each(codes)("no message leaks a technical detail in %s", (lang) => {
    const technical =
      /\b(smtp|supabase|http|https|api|token|jwt|535|500|502|503|504|unexpected_failure|error_code|sqlstate|postgres)\b/i;
    for (const key of [
      "errNetwork",
      "errEmailSend",
      "errServiceDown",
      "errHandleChars",
      "errHandleShort",
      "errHandleLong",
      "errHandleTaken",
      "handleHint",
    ] as const)
      expect(authCopy[lang][key], `${lang}:${key}`).not.toMatch(technical);
  });
});
