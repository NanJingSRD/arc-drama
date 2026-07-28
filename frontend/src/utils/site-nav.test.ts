import { describe, expect, it } from "vitest";
import { getActiveSiteNav, shouldShowSiteHeader } from "./site-nav";

describe("shouldShowSiteHeader", () => {
  it("hides on login", () => {
    expect(shouldShowSiteHeader("/login")).toBe(false);
  });

  it("hides inside project studio", () => {
    expect(shouldShowSiteHeader("/app/projects/demo")).toBe(false);
    expect(shouldShowSiteHeader("/app/projects/demo/characters")).toBe(false);
    expect(shouldShowSiteHeader("/app/projects/demo/settings")).toBe(false);
  });

  it("hides inside workspace 2.0 project detail", () => {
    expect(shouldShowSiteHeader("/app/workspace-v2/proj-0379a4d4/overview")).toBe(false);
    expect(shouldShowSiteHeader("/app/workspace-v2/proj-0379a4d4/episodes")).toBe(false);
  });

  it("shows on workspace list and marketing pages", () => {
    expect(shouldShowSiteHeader("/app/home")).toBe(true);
    expect(shouldShowSiteHeader("/app/featured")).toBe(true);
    expect(shouldShowSiteHeader("/app/prompt-factory")).toBe(true);
    expect(shouldShowSiteHeader("/app/projects")).toBe(true);
    expect(shouldShowSiteHeader("/app/workspace-v2")).toBe(true);
    expect(shouldShowSiteHeader("/app/settings")).toBe(true);
  });
});

describe("getActiveSiteNav", () => {
  it("marks workspace routes", () => {
    expect(getActiveSiteNav("/app/projects", "")).toBe("workspace");
    expect(getActiveSiteNav("/app/settings", "")).toBe("workspace");
    expect(getActiveSiteNav("/app/workspace-v2", "")).toBe("workspace-v2");
  });

  it("marks featured page", () => {
    expect(getActiveSiteNav("/app/featured", "")).toBe("featured");
  });

  it("marks prompt factory page", () => {
    expect(getActiveSiteNav("/app/prompt-factory", "")).toBe("prompt-factory");
  });

  it("marks home", () => {
    expect(getActiveSiteNav("/app/home", "")).toBe("home");
  });
});
