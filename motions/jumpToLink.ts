import { jumpToPattern } from "../utils/jumpToPattern";
import { MotionFn } from "../utils/vimApi";

/** Regex for a wikilink. Starts off with a negative lookbehind for a backslash, to make sure the
 * opening square bracket isn't escaped.
 *
 * We don't bother making the internals of the wikilink regex too complicated (using `.*?` to allow
 * any characters), because Obsidian's markdown parser is imperfect and inconsistent anyway, so we
 * may as well just match anything that generally looks like a wikilink.
 */
const WIKILINK_REGEX = /(?<!\\)\[\[.*?\]\]/g;

/** Regex for a markdown link.
 *
 * Components:
 *
 * - `(?<!\\)` - negative lookbehind for a backslash, to make sure the opening bracket isn't escaped
 *
 * - `\[` - open square bracket for the display text
 *
 * - `(?:[^\\\[\]\n]|\\.)` - display text character: either a character that's not a backslash,
 * square bracket, or newline; or a backslash plus another character (i.e. an escaped character,
 * including a square bracket). Basically, if a square bracket is present within the display text,
 * it must be escaped. If a backslash is present, it must be escaping a character within the display
 * text (rather than escaping the closing bracket of the display text).
 *
 * - `*?` - as many display text characters as needed to reach the closing square bracket
 *
 * - `\]` - closing square bracket for the display text
 *
 * - `\(.*?\)` - url enclosed in parentheses. We don't bother with a lookbehind for a backslash
 * here, because Obsidian's markdown parser is pretty weird with an escaped closing parenthesis
 * anyway.
 *
 * Note that Obsidian's markdown parser is inconsistent with parsing markdown links in Live Preview
 * vs Reading mode. Reading mode parsing seems more accurate and self-consistent, so we align more
 * with that.
 *
 * However, completely disallowing non-escaped square brackets in the display text is not fully
 * aligned with Reading mode, which seems to allow pairs of non-escaped square brackets if they
 * don't end up forming wikilink syntax (e.g. `[display text [2]](https://example.com)` is allowed,
 * but `[[2]](https://example.com)` is not). But this helps avoid issues like matching links inside
 * checkboxes (e.g. `- [ ] [Some link](https://example.com)`), and it's arguably better practice for
 * the user to escape square brackets within the display text anyway.
 */
const MARKDOWN_LINK_REGEX = /(?<!\\)\[(?:[^\\\[\]\n]|\\.)*?\]\(.*?\)/g;

/** Regex for a standalone URL. This is a naive regex that matches any string that starts with a
 * protocol-looking prefix (any lowercase letters followed by `://`) followed by one or more
 * non-whitespace characters (from domain name to URL end).
 *
 * Note that Obsidian's markdown parser again, just like for wikilinks and markdown links, is
 * inconsistent between Live Preview and Reading modes, but seems to be more accurate in Reading
 * mode. Our regex is a bit more lenient than both (e.g. we don't restrict to a subset of known
 * protocols), but it should be good enough for most cases, and it's better to be lenient than to be
 * too strict.
 */
const URL_REGEX = /[a-z]+:\/\/\S+/g;

/**
 * Regex for a link (which can be a wikilink, a markdown link, or a standalone URL).
 *
 * Ordered to match on wikilinks first, then markdown links, and finally standalone URLs.  This
 * matches how Obsidian's markdown parser works. E.g. Obsidian treats the following as:
 * - `[[[display text](https://example.com)]]]` - a wikilink
 * - `[[2]](https://example.com)` - a wikilink plus a standalone URL
 */
const LINK_REGEX_STRING = `${WIKILINK_REGEX.source}|${MARKDOWN_LINK_REGEX.source}|${URL_REGEX.source}`;
export const LINK_REGEX = new RegExp(LINK_REGEX_STRING, "g");

/**
 * Jumps to the repeat-th next link.
 *
 * Note that `jumpToPattern` uses `String.matchAll`, which internally updates `lastIndex` after each
 * match; and that `LINK_REGEX` matches wikilinks / markdown links first. So, this won't catch
 * non-standalone URLs (e.g. the URL in a markdown link). This should be a good thing in most cases;
 * otherwise it could be tedious (as a user) for each markdown link to contain two jumpable spots.
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
