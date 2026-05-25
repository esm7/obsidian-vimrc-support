import { EditorPosition } from "obsidian";
import { describe, expect, test } from "vitest";
import { jumpToNextCodeFence, jumpToPreviousCodeFence } from "../motions/jumpToCodeFence";
import { createFakeCodeMirrorEditor } from "./createFakeCodeMirrorEditor";

const CODE_FENCE_CONTENT_LINES = ["intro", "```ts", "const answer = 42;", "```", "outro"];
const INLINE_BACKTICK_CONTENT_LINES = [
  "here are inline backticks ``` not a fence",
  "```ts",
  "const answer = 42;",
  "```",
];
const MULTIPLE_CODE_FENCE_CONTENT_LINES = [
  "intro",
  "```ts",
  "const firstAnswer = 42;",
  "```",
  "middle",
  "````js",
  "const secondAnswer = 7;",
  "````",
  "outro",
];
const NO_CODE_FENCE_CONTENT_LINES = ["intro", "plain text", "outro"];

describe("jumpToNextCodeFence", () => {
  test("jumps to the next opening code fence", () => {
    expectNextCodeFencePosition({ line: 0, ch: 0 }, { line: 1, ch: 0 });
  });

  test("jumps to the next closing code fence", () => {
    expectNextCodeFencePosition({ line: 2, ch: 0 }, { line: 3, ch: 0 });
  });

  test("wraps to the first code fence after the last one", () => {
    expectNextCodeFencePosition({ line: 4, ch: 0 }, { line: 1, ch: 0 });
  });

  test("ignores backticks that are not code fence lines", () => {
    expectNextCodeFencePosition(
      { line: 0, ch: 0 },
      { line: 1, ch: 0 },
      INLINE_BACKTICK_CONTENT_LINES
    );
  });

  test("jumps to the second next code fence when repeat is two", () => {
    expectNextCodeFencePosition(
      { line: 0, ch: 0 },
      { line: 3, ch: 0 },
      MULTIPLE_CODE_FENCE_CONTENT_LINES,
      2
    );
  });

  test("jumps to the closing code fence when cursor is within a code block", () => {
    expectNextCodeFencePosition({ line: 2, ch: 5 }, { line: 3, ch: 0 });
  });

  test("jumps to the next distinct code fence when cursor is on the first backtick of a fence", () => {
    expectNextCodeFencePosition({ line: 1, ch: 0 }, { line: 3, ch: 0 });
  });

  test("jumps to the next distinct code fence when cursor is in the middle of a fence", () => {
    expectNextCodeFencePosition({ line: 1, ch: 1 }, { line: 3, ch: 0 });
  });

  test("returns the original cursor position when there are no code fences", () => {
    expectNextCodeFencePosition(
      { line: 1, ch: 2 },
      { line: 1, ch: 2 },
      NO_CODE_FENCE_CONTENT_LINES
    );
  });

  test("matches fences longer than three backticks", () => {
    expectNextCodeFencePosition(
      { line: 4, ch: 0 },
      { line: 5, ch: 0 },
      MULTIPLE_CODE_FENCE_CONTENT_LINES
    );
  });
});

describe("jumpToPreviousCodeFence", () => {
  test("jumps to the previous closing code fence", () => {
    expectPreviousCodeFencePosition({ line: 4, ch: 0 }, { line: 3, ch: 0 });
  });

  test("jumps to the previous opening code fence", () => {
    expectPreviousCodeFencePosition({ line: 2, ch: 0 }, { line: 1, ch: 0 });
  });

  test("jumps to the second previous code fence when repeat is two", () => {
    expectPreviousCodeFencePosition(
      { line: 8, ch: 0 },
      { line: 5, ch: 0 },
      MULTIPLE_CODE_FENCE_CONTENT_LINES,
      2
    );
  });

  test("jumps to the opening code fence when cursor is within a code block", () => {
    expectPreviousCodeFencePosition({ line: 2, ch: 5 }, { line: 1, ch: 0 });
  });

  test("jumps to the previous distinct code fence when cursor is on the first backtick of a fence", () => {
    expectPreviousCodeFencePosition({ line: 3, ch: 0 }, { line: 1, ch: 0 });
  });

  test("jumps to the previous distinct code fence when cursor is in the middle of a fence", () => {
    expectPreviousCodeFencePosition({ line: 3, ch: 1 }, { line: 1, ch: 0 });
  });

  test("returns the original cursor position when there are no code fences", () => {
    expectPreviousCodeFencePosition(
      { line: 1, ch: 2 },
      { line: 1, ch: 2 },
      NO_CODE_FENCE_CONTENT_LINES
    );
  });
});

function expectNextCodeFencePosition(
  cursorPosition: EditorPosition,
  expectedPosition: EditorPosition,
  contentLines: string[] = CODE_FENCE_CONTENT_LINES,
  repeat = 1
): void {
  const cm = createFakeCodeMirrorEditor(contentLines);
  const nextCodeFence = jumpToNextCodeFence(cm as any, cursorPosition, { repeat });
  expect(nextCodeFence).toEqual(expectedPosition);
}

function expectPreviousCodeFencePosition(
  cursorPosition: EditorPosition,
  expectedPosition: EditorPosition,
  contentLines: string[] = CODE_FENCE_CONTENT_LINES,
  repeat = 1
): void {
  const cm = createFakeCodeMirrorEditor(contentLines);
  const previousCodeFence = jumpToPreviousCodeFence(cm as any, cursorPosition, { repeat });
  expect(previousCodeFence).toEqual(expectedPosition);
}
