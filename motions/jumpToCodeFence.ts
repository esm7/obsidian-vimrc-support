import { jumpToPattern } from "../utils/jumpToPattern";
import { MotionFn } from "../utils/vimApi";

/** Naive Regex for a Markdown code fence, i.e. a line beginning with at least three backticks.
 *
 * "Naive" for two reasons:
 * 1. False negatives: Fences could be made of tildes instead of backticks. This is less common, but
 * should be easy to add support for if users request it.
 * 2. False positives: It could match lines within non-Markdown codeblocks. But since triple
 * backticks aren't a syntax feature of any other programming language (AFAIK, at the time of this
 * writing), this should be rare enough that the naive regex should work well in practice.
 *
 * Matches only the fence itself, so can be used for jumping to either an opening or closing fence.
 */
const NAIVE_CODE_FENCE_REGEX = /^```+/gm;

/**
 * Jumps to the repeat-th next code fence.
 */
export const jumpToNextCodeFence: MotionFn = (cm, cursorPosition, { repeat }) => {
  return jumpToPattern({
    cm,
    cursorPosition,
    repeat,
    regex: NAIVE_CODE_FENCE_REGEX,
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
    regex: NAIVE_CODE_FENCE_REGEX,
    direction: "previous",
  });
};
