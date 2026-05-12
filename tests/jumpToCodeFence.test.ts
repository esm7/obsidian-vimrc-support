import { describe, expect, test } from "vitest";
import { jumpToNextCodeFence, jumpToPreviousCodeFence } from "../motions/jumpToCodeFence";
import { createFakeCodeMirrorEditor } from "./createFakeCodeMirrorEditor";

const CODE_FENCE_CONTENT_LINES = ["intro", "```ts", "const answer = 42;", "```", "outro"];

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
    expectNextCodeFencePosition({ line: 0, ch: 0 }, { line: 1, ch: 0 }, [
      "here are inline backticks ``` not a fence",
      "```ts",
      "const answer = 42;",
      "```",
    ]);
  });
});

describe("jumpToPreviousCodeFence", () => {
  test("jumps to the previous closing code fence", () => {
    expectPreviousCodeFencePosition({ line: 4, ch: 0 }, { line: 3, ch: 0 });
  });

  test("jumps to the previous opening code fence", () => {
    expectPreviousCodeFencePosition({ line: 2, ch: 0 }, { line: 1, ch: 0 });
  });
});

function expectNextCodeFencePosition(
  cursorPosition: { line: number; ch: number },
  expectedPosition: { line: number; ch: number },
  contentLines: string[] = CODE_FENCE_CONTENT_LINES
): void {
  const cm = createFakeCodeMirrorEditor(contentLines);
  const nextCodeFence = jumpToNextCodeFence(cm as any, cursorPosition, { repeat: 1 });
  expect(nextCodeFence).toEqual(expectedPosition);
}

function expectPreviousCodeFencePosition(
  cursorPosition: { line: number; ch: number },
  expectedPosition: { line: number; ch: number },
  contentLines: string[] = CODE_FENCE_CONTENT_LINES
): void {
  const cm = createFakeCodeMirrorEditor(contentLines);
  const previousCodeFence = jumpToPreviousCodeFence(cm as any, cursorPosition, { repeat: 1 });
  expect(previousCodeFence).toEqual(expectedPosition);
}
