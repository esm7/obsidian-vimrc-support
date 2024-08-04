import { Editor as CodeMirrorEditor } from "codemirror";
import { EditorPosition } from "obsidian";

/**
 * Returns the position of the repeat-th instance of a pattern from a given cursor position, in the
 * given direction; looping to the other end of the document when reaching one end. Returns the
 * original cursor position if no match is found.
 *
 * Under the hood, to avoid repeated loops of the document: we get all matches at once, order them
 * according to `direction` and `cursorPosition`, and use modulo arithmetic to return the
 * appropriate match.
 *
 * @param cm The CodeMirror editor instance.
 * @param cursorPosition The current cursor position.
 * @param repeat The number of times to repeat the jump (e.g. 1 to jump to the very next match). Is
 * modulo-ed for efficiency.
 * @param regex The regex pattern to jump to.
 * @param filterMatch Optional filter function to run on the regex matches. Return false to ignore
 * a given match.
 * @param direction The direction to jump in.
 */
export function jumpToPattern({
  cm,
  cursorPosition,
  repeat,
  regex,
  filterMatch = () => true,
  direction,
}: {
  cm: CodeMirrorEditor;
  cursorPosition: EditorPosition;
  repeat: number;
  regex: RegExp;
  filterMatch?: (match: RegExpExecArray) => boolean;
  direction: "next" | "previous";
}): EditorPosition {
  const content = cm.getValue();
  const cursorIdx = cm.indexFromPos(cursorPosition);
  const orderedMatches = getOrderedMatches({ content, regex, cursorIdx, filterMatch, direction });
  const effectiveRepeat = (repeat % orderedMatches.length) || orderedMatches.length;
  const matchIdx = orderedMatches[effectiveRepeat - 1]?.index;
  if (matchIdx === undefined) {
    return cursorPosition;
  }
  const newCursorPosition = cm.posFromIndex(matchIdx);
  return newCursorPosition;
}

/**
 * Returns an ordered array of all matches of a regex in a string in the given direction from the
 * cursor index (looping around to the other end of the document when reaching one end).
 */
function getOrderedMatches({
  content,
  regex,
  cursorIdx,
  filterMatch,
  direction,
}: {
  content: string;
  regex: RegExp;
  cursorIdx: number;
  filterMatch: (match: RegExpExecArray) => boolean;
  direction: "next" | "previous";
}): RegExpExecArray[] {
  const { previousMatches, currentMatches, nextMatches } = getAndGroupMatches(
    content,
    regex,
    cursorIdx,
    filterMatch
  );
  if (direction === "next") {
    return [...nextMatches, ...previousMatches, ...currentMatches];
  }
  return [
    ...previousMatches.reverse(),
    ...nextMatches.reverse(),
    ...currentMatches.reverse(),
  ];
}

/**
 * Finds all matches of a regex in a string and groups them by their positions relative to the
 * cursor.
 */
function getAndGroupMatches(
  content: string,
  regex: RegExp,
  cursorIdx: number,
  filterMatch: (match: RegExpExecArray) => boolean
): {
  previousMatches: RegExpExecArray[];
  currentMatches: RegExpExecArray[];
  nextMatches: RegExpExecArray[];
} {
  const globalRegex = makeGlobalRegex(regex);
  const allMatches = [...content.matchAll(globalRegex)].filter(filterMatch);
  const previousMatches = allMatches.filter(
    (match) => match.index < cursorIdx && !isWithinMatch(match, cursorIdx)
  );
  const currentMatches = allMatches.filter((match) => isWithinMatch(match, cursorIdx));
  const nextMatches = allMatches.filter((match) => match.index > cursorIdx);
  return { previousMatches, currentMatches, nextMatches };
}

function makeGlobalRegex(regex: RegExp): RegExp {
  const globalFlags = getGlobalFlags(regex);
  return new RegExp(regex.source, globalFlags);
}

function getGlobalFlags(regex: RegExp): string {
  const { flags } = regex;
  return flags.includes("g") ? flags : `${flags}g`;
}

export function isWithinMatch(match: RegExpExecArray, index: number): boolean {
  return match.index <= index && index < match.index + match[0].length;
}
