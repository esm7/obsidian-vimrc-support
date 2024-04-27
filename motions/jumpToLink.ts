import { MotionFn } from "./utils/defineObsidianVimMotion";
import { jumpToPattern } from "./utils/jumpToPattern";

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
