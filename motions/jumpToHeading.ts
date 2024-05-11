import { jumpToPattern } from "../utils/jumpToPattern";
import { MotionFn } from "../utils/vimApi";

const HEADING_REGEX = /^#+ /gm;

/**
 * Jumps to the repeat-th next heading.
 */
export const jumpToNextHeading: MotionFn = (cm, cursorPosition, { repeat }) => {
  return jumpToPattern({
    cm,
    cursorPosition,
    repeat,
    regex: HEADING_REGEX,
    direction: "next",
  });
};

/**
 * Jumps to the repeat-th previous heading.
 */
export const jumpToPreviousHeading: MotionFn = (
  cm,
  cursorPosition,
  { repeat }
) => {
  return jumpToPattern({
    cm,
    cursorPosition,
    repeat,
    regex: HEADING_REGEX,
    direction: "previous",
  });
};
