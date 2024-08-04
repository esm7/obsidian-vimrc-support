import { Editor as CodeMirrorEditor } from "codemirror";
import { EditorPosition } from "obsidian";
import { isWithinMatch, jumpToPattern } from "../utils/jumpToPattern";
import { MotionFn } from "../utils/vimApi";

/** Naive Regex for a Markdown heading (H1 through H6). "Naive" because it does not account for
 * whether the match is within a codeblock (e.g. it could be a Python comment, not a heading).
 */
const NAIVE_HEADING_REGEX = /^#{1,6} /gm;

/** Regex for a Markdown fenced codeblock, which begins with some number >=3 of backticks at the
 * start of a line. It either ends on the nearest future line that starts with at least as many
 * backticks (\1 back-reference), or extends to the end of the string if no such future line exists.
 */
const FENCED_CODEBLOCK_REGEX = /(^```+)(.*?^\1|.*)/gms;

/**
 * Jumps to the repeat-th next heading.
 */
export const jumpToNextHeading: MotionFn = (cm, cursorPosition, { repeat }) => {
  return jumpToHeading({ cm, cursorPosition, repeat, direction: "next" });
};

/**
 * Jumps to the repeat-th previous heading.
 */
export const jumpToPreviousHeading: MotionFn = (
  cm,
  cursorPosition,
  { repeat }
) => {
  return jumpToHeading({ cm, cursorPosition, repeat, direction: "previous" });
};

/**
 * Jumps to the repeat-th heading in the given direction.
 *
 * Under the hood, we use the naive heading regex to find all headings, and then filter out those
 * that are within codeblocks. `codeblockMatches` is passed in a closure to avoid repeated
 * computation.
 */
function jumpToHeading({
  cm,
  cursorPosition,
  repeat,
  direction,
}: {
  cm: CodeMirrorEditor;
  cursorPosition: EditorPosition;
  repeat: number;
  direction: "next" | "previous";
}): EditorPosition {
  const codeblockMatches = findAllCodeblocks(cm);
  const filterMatch = (match: RegExpExecArray) => !isMatchWithinCodeblock(match, codeblockMatches);
  return jumpToPattern({
    cm,
    cursorPosition,
    repeat,
    regex: NAIVE_HEADING_REGEX,
    filterMatch,
    direction,
  });
}

function findAllCodeblocks(cm: CodeMirrorEditor): RegExpExecArray[] {
  const content = cm.getValue();
  return [...content.matchAll(FENCED_CODEBLOCK_REGEX)];
}

function isMatchWithinCodeblock(
  match: RegExpExecArray,
  codeblockMatches: RegExpExecArray[]
): boolean {
  return codeblockMatches.some((codeblockMatch) => isWithinMatch(codeblockMatch, match.index));
}
