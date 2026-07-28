import { describe, expect, it } from "vitest";
import {
  formatAssetPromptTemplate,
  normalizeAssetPromptTemplate,
  parseAssetPromptTemplate,
} from "./asset-prompt-template";

describe("normalizeAssetPromptTemplate", () => {
  it("keeps string fields and drops empty values", () => {
    expect(
      normalizeAssetPromptTemplate({
        layout: " front view ",
        guard: "",
        negative_tail: "blurry",
        extra: 12,
      }),
    ).toEqual({
      layout: "front view",
      negative_tail: "blurry",
      extra: "12",
    });
  });

  it("returns undefined for invalid input", () => {
    expect(normalizeAssetPromptTemplate(null)).toBeUndefined();
    expect(normalizeAssetPromptTemplate([])).toBeUndefined();
    expect(normalizeAssetPromptTemplate({})).toBeUndefined();
  });
});

describe("formatAssetPromptTemplate", () => {
  it("formats known keys in order", () => {
    expect(
      formatAssetPromptTemplate({
        negative_tail: "blurry",
        layout: "front",
        guard: "no text",
      }),
    ).toBe("【layout】\nfront\n\n【guard】\nno text\n\n【negative_tail】\nblurry");
  });

  it("formats with localized labels", () => {
    expect(
      formatAssetPromptTemplate(
        { layout: "front", guard: "no text", negative_tail: "blurry" },
        { layout: "布局", guard: "约束", negative_tail: "负面词" },
      ),
    ).toBe("【布局】\nfront\n\n【约束】\nno text\n\n【负面词】\nblurry");
  });
});

describe("parseAssetPromptTemplate", () => {
  it("parses section text back to object", () => {
    expect(
      parseAssetPromptTemplate(
        "【layout】\nfront\n\n【guard】\nno text\n\n【negative_tail】\nblurry",
      ),
    ).toEqual({
      layout: "front",
      guard: "no text",
      negative_tail: "blurry",
    });
  });

  it("maps localized labels back to api keys", () => {
    expect(
      parseAssetPromptTemplate(
        "【布局】\nfront\n\n【约束】\nno text\n\n【负面词】\nblurry",
        { layout: "布局", guard: "约束", negative_tail: "负面词" },
      ),
    ).toEqual({
      layout: "front",
      guard: "no text",
      negative_tail: "blurry",
    });
  });

  it("parses JSON object text", () => {
    expect(
      parseAssetPromptTemplate('{"layout":"front","guard":"no text"}'),
    ).toEqual({ layout: "front", guard: "no text" });
  });

  it("treats free text as layout", () => {
    expect(parseAssetPromptTemplate("plain prompt")).toEqual({
      layout: "plain prompt",
    });
  });
});
