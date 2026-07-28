import { describe, expect, it } from "vitest";
import {
  absoluteAppPath,
  API_BASE,
  getAppBase,
  isAppPath,
  publicAssetUrl,
  resolveMediaUrl,
  resolveWorkspaceV2MediaUrl,
  toRouterPath,
} from "./app-base";

describe("app-base", () => {
  it("absoluteAppPath prefixes deploy base for wouter ~ paths", () => {
    expect(absoluteAppPath("/login")).toBe("~/login");
    expect(absoluteAppPath("/app/projects")).toBe("~/app/projects");
  });

  it("toRouterPath strips deploy base from pathname", () => {
    const base = getAppBase();
    if (base) {
      expect(toRouterPath(`${base}/app/projects`)).toBe("/app/projects");
    }
    expect(toRouterPath("/app/projects")).toBe("/app/projects");
  });

  it("isAppPath accepts both deploy-prefixed and router-relative paths", () => {
    const base = getAppBase();
    if (base) {
      expect(isAppPath(`${base}/app/projects`)).toBe(true);
    }
    expect(isAppPath("/app/projects")).toBe(true);
    expect(isAppPath("/login")).toBe(false);
  });

  it("resolveMediaUrl prefixes /api paths with deploy base", () => {
    const base = getAppBase();
    expect(resolveMediaUrl("/api/v1/files/demo/thumb.png")).toBe(`${base}/api/v1/files/demo/thumb.png`);
    expect(resolveMediaUrl(`${base}/api/v1/files/demo/thumb.png`)).toBe(`${base}/api/v1/files/demo/thumb.png`);
    expect(resolveMediaUrl("blob:abc")).toBe("blob:abc");
  });

  it("resolveMediaUrl rewrites MinIO HTTP URLs to same-origin media proxy", () => {
    const base = getAppBase();
    expect(
      resolveMediaUrl(
        "http://your-minio-server:9000/aitoken-platform/uploads/demo.mp4",
      ),
    ).toBe(`${base}/media/aitoken-platform/uploads/demo.mp4`);
  });

  it("resolveWorkspaceV2MediaUrl rewrites /api/v1 files onto /api/ws2", () => {
    const base = getAppBase();
    expect(
      resolveWorkspaceV2MediaUrl("/api/v1/files/proj-24c68aa8/characters/唐併.png"),
    ).toBe(`${base}/api/ws2/v1/files/proj-24c68aa8/characters/唐併.png`);
    expect(
      resolveWorkspaceV2MediaUrl("/api/ws2/v1/files/demo/sheet.png"),
    ).toBe(`${base}/api/ws2/v1/files/demo/sheet.png`);
  });

  it("publicAssetUrl prefixes deploy base for public/ assets", () => {
    const base = import.meta.env.BASE_URL || "/";
    expect(publicAssetUrl("srd-logo.png")).toBe(`${base}srd-logo.png`);
    expect(publicAssetUrl("/android-chrome-192x192.png")).toBe(`${base}android-chrome-192x192.png`);
  });

  it("API_BASE includes deploy base", () => {
    expect(API_BASE).toBe(`${getAppBase()}/api/v1`);
  });
});
