import { jumpToPattern } from "../utils/jumpToPattern";
import { MotionFn } from "../utils/vimApi";

const LINK_REGEX = /\[\[[^\]\]]+?\]\]/g;

export const jumpToNextLink: MotionFn = (cm, oldPosition, { repeat }) => {
  return jumpToPattern({
    cm,
    oldPosition,
    repeat,
    regex: LINK_REGEX,
    direction: "next",
  });
};

export const jumpToPreviousLink: MotionFn = (cm, oldPosition, { repeat }) => {
  return jumpToPattern({
    cm,
    oldPosition,
    repeat,
    regex: LINK_REGEX,
    direction: "previous",
  });
};
