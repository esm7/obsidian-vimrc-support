import { jumpToPattern } from "../utils/jumpToPattern";
import { MotionFn } from "../utils/vimApi";

/** Regex for a wikilink. Starts off with a negative lookbehind for a backslash, to make sure the
 * opening square bracket isn't escaped.
 *
 * Note that although Obsidian doesn't allow most special characters inside a file name (e.g. `[`,
 * `]`, `:`, `#`, `|`, `^`, `\`, or `/`), its Markdown parser is lenient enough to result in
 * basically anything inside non-escaped double square brackets being rendered as a wikilink. This
 * even includes a trailing backslash, which you'd think would escape the first closing square
 * bracket! So we follow suit and allow any character inside the double square brackets, except for
 * a newline (which `.` won't match as long as we don't use the `s` flag).
 */
const WIKILINK_REGEX = /(?<!\\)\[\[.*?\]\]/g;

/** Regex for a markdown link of the form `[display text](url)`.
 *
 * Obsidian's parsing of markdown links is inconsistent between Live Preview and Reading mode. We
 * align more with Reading mode, differing mainly in our handling of square brackets in the display
 * text.
 *
 * Our markdown link regex matches a string with the following structure:
 * - An opening square bracket `[` that is not escaped (i.e. not preceded by a backslash)
 * - A sequence of display text characters:
 *     - Any character that is not a backslash, square bracket, or newline; or
 *     - A backslash followed by another character. This simultaneously allows escaped square
 *     brackets within the display text, and ensures that the backslash is not escaping the closing
 *     square bracket of the display text.
 * - A closing square bracket `]`
 * - A URL in parentheses `( ... )`
 *
 * **Note**: This regex does not allow for unescaped square brackets within the display text, even
 * though Obsidian's Markdown parser may render such links in Reading mode. In particular, Obsidian
 * allows unescaped brackets as long as they come in pairs (e.g.  `[Label [2]](url)`).
 *
 * Our stricter behavior is intentional:
 * - It provides a simple way to prevent things like checkboxes being treated as part of the link
 * (e.g. `- [ ] [display text](url)`)
 * - Fully aligning with Obsidian's parsing would require a more complex regex that would be less
 * performant (e.g. nested lookbehinds to only match pairs of brackets) and harder to maintain
 * - Obsidian's markdown link parsing is not super consistent or coherent anyway
 * - Users can still use square brackets in display text if they escape them, which is arguably
 * better practice anyway
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
