import { jumpToPattern } from "../utils/jumpToPattern";
import { MotionFn } from "../utils/vimApi";

const HEADING_REGEX = /^#+ /gm;

export const jumpToNextHeading: MotionFn = (cm, oldPosition, { repeat }) => {
  return jumpToPattern({
    cm,
    oldPosition,
    repeat,
    regex: HEADING_REGEX,
    direction: "next",
  });
};

export const jumpToPreviousHeading: MotionFn = (
  cm,
  oldPosition,
  { repeat }
) => {
  return jumpToPattern({
    cm,
    oldPosition,
    repeat,
    regex: HEADING_REGEX,
    direction: "previous",
  });
};
