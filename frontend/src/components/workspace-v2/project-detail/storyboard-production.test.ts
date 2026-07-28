import { describe, expect, it } from "vitest";
import {
  normalizeStoryboardVideoPromptDraft,
  resolveStoryboardVideoPromptDraft,
} from "./storyboard-production";

describe("resolveStoryboardVideoPromptDraft", () => {
  it("prefers video_prompt.dialogue over scene dialogueEntries", () => {
    const draft = resolveStoryboardVideoPromptDraft({
      videoPrompt: {
        action: "推进",
        camera_motion: "Static",
        ambiance_audio: "风声",
        dialogue: [{ speaker: "吕布", line: "来战！" }],
      },
      dialogueEntries: [
        { speaker: "袁世凯", line: "招募的新军，练得如何了？" },
        { speaker: "徐世昌", line: "回大人，德式洋操已初具雏形。" },
      ],
    });

    expect(draft.dialogue).toEqual([{ speaker: "吕布", line: "来战！" }]);
  });

  it("falls back to scene dialogueEntries when video_prompt.dialogue is empty", () => {
    const draft = resolveStoryboardVideoPromptDraft({
      videoPrompt: {
        action: "袁世凯伫立案前",
        camera_motion: "Zoom in",
        ambiance_audio: "环境音效",
        dialogue: [],
      },
      dialogueEntries: [
        { speaker: "袁世凯", line: "招募的新军，练得如何了？" },
      ],
    });

    expect(draft.action).toBe("袁世凯伫立案前");
    expect(draft.dialogue).toEqual([
      { speaker: "袁世凯", line: "招募的新军，练得如何了？" },
    ]);
  });

  it("uses video_prompt.dialogue when scene dialogueEntries is empty", () => {
    const draft = resolveStoryboardVideoPromptDraft({
      videoPrompt: {
        action: "袁世凯伫立案前",
        camera_motion: "Zoom in",
        ambiance_audio: "环境音效",
        dialogue: [{ speaker: "袁世凯", line: "招募的新军，练得如何了？" }],
      },
    });

    expect(draft.action).toBe("袁世凯伫立案前");
    expect(draft.dialogue).toEqual([
      { speaker: "袁世凯", line: "招募的新军，练得如何了？" },
    ]);
  });

  it("keeps empty dialogue when neither source has entries", () => {
    const draft = resolveStoryboardVideoPromptDraft({
      videoPrompt: { action: "空镜", camera_motion: "Static", ambiance_audio: "" },
    });
    expect(draft.dialogue).toEqual([]);
  });
});

describe("normalizeStoryboardVideoPromptDraft", () => {
  it("normalizes dialogue objects from unstructured video_prompt", () => {
    const draft = normalizeStoryboardVideoPromptDraft({
      action: "动作",
      camera_motion: "Static",
      ambiance_audio: "雨声",
      dialogue: [
        { speaker: "袁世凯", line: "如何了？" },
        "ignore",
        { speaker: "徐世昌", line: "回大人" },
      ],
    });

    expect(draft.dialogue).toEqual([
      { speaker: "袁世凯", line: "如何了？" },
      { speaker: "徐世昌", line: "回大人" },
    ]);
  });
});
