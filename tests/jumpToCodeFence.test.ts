import { describe, expect, test } from "vitest";
import {
  jumpToNextCodeFence,
  jumpToPreviousCodeFence,
} from "../motions/jumpToCodeFence";
import { createFakeCodeMirrorEditor } from "./createFakeCodeMirrorEditor";

describe("jumpToNextCodeFence", () => {
  test("jumps to the next opening code fence", () => {
    const cm = createFakeCodeMirrorEditor([
      "intro",
      "```ts",
      "const answer = 42;",
      "```",
      "outro",
    ]);

    const nextCodeFence = jumpToNextCodeFence(
      cm as any,
      { line: 0, ch: 0 },
      { repeat: 1 }
    );

    expect(nextCodeFence).toEqual({ line: 1, ch: 0 });
  });

  test("jumps to the next closing code fence", () => {
    const cm = createFakeCodeMirrorEditor([
      "intro",
      "```ts",
      "const answer = 42;",
      "```",
      "outro",
    ]);

    const nextCodeFence = jumpToNextCodeFence(
      cm as any,
      { line: 2, ch: 0 },
      { repeat: 1 }
    );

    expect(nextCodeFence).toEqual({ line: 3, ch: 0 });
  });

  test("wraps to the first code fence after the last one", () => {
    const cm = createFakeCodeMirrorEditor([
      "intro",
      "```ts",
      "const answer = 42;",
      "```",
      "outro",
    ]);

    const nextCodeFence = jumpToNextCodeFence(
      cm as any,
      { line: 4, ch: 0 },
      { repeat: 1 }
    );

    expect(nextCodeFence).toEqual({ line: 1, ch: 0 });
  });

  test("ignores backticks that are not code fence lines", () => {
    const cm = createFakeCodeMirrorEditor([
      "here are inline backticks ``` not a fence",
      "```ts",
      "const answer = 42;",
      "```",
    ]);

    const nextCodeFence = jumpToNextCodeFence(
      cm as any,
      { line: 0, ch: 0 },
      { repeat: 1 }
    );

    expect(nextCodeFence).toEqual({ line: 1, ch: 0 });
  });
});

describe("jumpToPreviousCodeFence", () => {
  test("jumps to the previous closing code fence", () => {
    const cm = createFakeCodeMirrorEditor([
      "intro",
      "```ts",
      "const answer = 42;",
      "```",
      "outro",
    ]);

    const previousCodeFence = jumpToPreviousCodeFence(
      cm as any,
      { line: 4, ch: 0 },
      { repeat: 1 }
    );

    expect(previousCodeFence).toEqual({ line: 3, ch: 0 });
  });

  test("jumps to the previous opening code fence", () => {
    const cm = createFakeCodeMirrorEditor([
      "intro",
      "```ts",
      "const answer = 42;",
      "```",
      "outro",
    ]);

    const previousCodeFence = jumpToPreviousCodeFence(
      cm as any,
      { line: 2, ch: 0 },
      { repeat: 1 }
    );

    expect(previousCodeFence).toEqual({ line: 1, ch: 0 });
  });
});
