import { jumpToPattern } from "../utils/jumpToPattern";
import { MotionFn } from "../utils/vimApi";

const WIKILINK_REGEX_STRING = "\\[\\[.*?\\]\\]";
const MARKDOWN_LINK_REGEX_STRING = "\\[.*?\\]\\(.*?\\)";
const URL_REGEX_STRING = "\\w+://\\S+";

/**
 * Regex for a link (which can be a wikilink, a markdown link, or a standalone URL).
 */
const LINK_REGEX_STRING = `${WIKILINK_REGEX_STRING}|${MARKDOWN_LINK_REGEX_STRING}|${URL_REGEX_STRING}`;
const LINK_REGEX = new RegExp(LINK_REGEX_STRING, "g");

/**
 * Jumps to the repeat-th next link.
 *
 * Note that since `jumpToPattern` uses `String.matchAll`, which internally updates `lastIndex`
 * after each match, it won't catch standalone URLs within wikilinks / markdown links
 * (which should be a good thing in most cases).
*/
export const jumpToNextLink: MotionFn = (cm, cursorPosition, { repeat }) => {
  return jumpToPattern({
    cm,
    cursorPosition,
    repeat,
    regex: LINK_REGEX,
    direction: "next",
  });
};

/**
 * Jumps to the repeat-th previous link.
 */
export const jumpToPreviousLink: MotionFn = (cm, cursorPosition, { repeat }) => {
  return jumpToPattern({
    cm,
    cursorPosition,
    repeat,
    regex: LINK_REGEX,
    direction: "previous",
  });
};
