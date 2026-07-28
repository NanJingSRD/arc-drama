import { describe, expect, it } from "vitest";
import {
  TOAST_TOP_IMMERSIVE,
  TOAST_TOP_WITH_SITE_HEADER,
  getToastTopClass,
} from "./toast-layout";

describe("getToastTopClass", () => {
  it("uses immersive offset on workspace v2 project detail routes", () => {
    expect(getToastTopClass("/app/workspace-v2/proj-demo/overview")).toBe(TOAST_TOP_IMMERSIVE);
    expect(getToastTopClass("/app/workspace-v2/proj-demo/episodes")).toBe(TOAST_TOP_IMMERSIVE);
    expect(getToastTopClass("/app/workspace-v2/proj-demo/assets/characters")).toBe(
      TOAST_TOP_IMMERSIVE,
    );
  });

  it("uses site-header offset on workspace v2 list route", () => {
    expect(getToastTopClass("/app/workspace-v2")).toBe(TOAST_TOP_WITH_SITE_HEADER);
  });

  it("uses immersive offset on legacy studio project routes", () => {
    expect(getToastTopClass("/app/projects/demo")).toBe(TOAST_TOP_IMMERSIVE);
  });

  it("uses site-header offset on standard app pages", () => {
    expect(getToastTopClass("/app/home")).toBe(TOAST_TOP_WITH_SITE_HEADER);
    expect(getToastTopClass("/app/settings")).toBe(TOAST_TOP_WITH_SITE_HEADER);
  });
});
