import { describe, expect, it } from "vitest";
import {
  parseDevAccessTokenInput,
  readJwtDisplayName,
} from "@/utils/dev-token-login";

describe("parseDevAccessTokenInput", () => {
  it("accepts plain JWT token", () => {
    const token = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyIn0.sig";
    expect(parseDevAccessTokenInput(token)).toBe(token);
  });

  it("strips Bearer prefix", () => {
    const token = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyIn0.sig";
    expect(parseDevAccessTokenInput(`Bearer ${token}`)).toBe(token);
  });

  it("reads token from JSON payload", () => {
    const token = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyIn0.sig";
    expect(parseDevAccessTokenInput(JSON.stringify({ access_token: token }))).toBe(token);
  });

  it("rejects invalid characters", () => {
    expect(parseDevAccessTokenInput("微信用户")).toBeNull();
  });
});

describe("readJwtDisplayName", () => {
  it("reads nickname from JWT payload", () => {
    const payload = btoa(JSON.stringify({ nickname: "demo-user" }));
    const token = `header.${payload}.sig`;
    expect(readJwtDisplayName(token)).toBe("demo-user");
  });
});
