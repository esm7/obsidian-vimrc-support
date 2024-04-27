import { jumpToPattern } from "../utils/jumpToPattern";
import { MotionFn } from "../utils/vimApi";

const WIKILINK_REGEX_STRING = "\\[\\[[^\\]\\]]+?\\]\\]";
const MARKDOWN_LINK_REGEX_STRING = "\\[[^\\]]+?\\]\\([^)]+?\\)";
const LINK_REGEX_STRING = `${WIKILINK_REGEX_STRING}|${MARKDOWN_LINK_REGEX_STRING}`;
const LINK_REGEX = new RegExp(LINK_REGEX_STRING, "g");

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
