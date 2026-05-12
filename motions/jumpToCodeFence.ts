import { jumpToPattern } from "../utils/jumpToPattern";
import { MotionFn } from "../utils/vimApi";

/** Regex for a Markdown code fence line, which begins with at least three backticks. */
export const CODE_FENCE_REGEX = /^```+/gm;

/**
 * Jumps to the repeat-th next code fence.
 */
export const jumpToNextCodeFence: MotionFn = (cm, cursorPosition, { repeat }) => {
  return jumpToPattern({
    cm,
    cursorPosition,
    repeat,
    regex: CODE_FENCE_REGEX,
    direction: "next",
  });
};

/**
 * Jumps to the repeat-th previous code fence.
 */
export const jumpToPreviousCodeFence: MotionFn = (cm, cursorPosition, { repeat }) => {
  return jumpToPattern({
    cm,
    cursorPosition,
    repeat,
    regex: CODE_FENCE_REGEX,
    direction: "previous",
  });
};
