import { describe, expect, it } from "vitest";
import { isHttpHeaderSafe, normalizeAccessToken } from "./access-token";

describe("normalizeAccessToken", () => {
  it("accepts typical JWT-like ASCII tokens", () => {
    const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.sig";
    expect(normalizeAccessToken(token)).toBe(token);
  });

  it("rejects tokens containing non ISO-8859-1 characters", () => {
    expect(normalizeAccessToken("中文token")).toBeNull();
    expect(normalizeAccessToken("微信用户")).toBeNull();
  });

  it("trims whitespace", () => {
    expect(normalizeAccessToken("  abc.def.ghi  ")).toBe("abc.def.ghi");
  });
});

describe("isHttpHeaderSafe", () => {
  it("allows ASCII", () => {
    expect(isHttpHeaderSafe("Bearer abc")).toBe(true);
  });

  it("disallows unicode", () => {
    expect(isHttpHeaderSafe("用户")).toBe(false);
  });
});
