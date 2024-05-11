import { Editor as CodeMirrorEditor } from "codemirror";
import { EditorPosition } from "obsidian";
import { shim as matchAllShim } from "string.prototype.matchall";

// Polyfill for String.prototype.matchAll, in case it's not available (pre-ES2020)
matchAllShim();

/**
 * Returns the position of the repeat-th instance of a pattern from a given starting position, in
 * the given direction; looping to the other end of the document when reaching one end.
 *
 * Under the hood, we avoid repeated loops around the document by using modulo arithmetic.
 */
export function jumpToPattern({
  cm,
  oldPosition,
  repeat,
  regex,
  direction,
}: {
  cm: CodeMirrorEditor;
  oldPosition: EditorPosition;
  repeat: number;
  regex: RegExp;
  direction: "next" | "previous";
}): EditorPosition {
  const content = cm.getValue();
  const startingIdx = cm.indexFromPos(oldPosition);
  const findNthMatchFn =
    direction === "next" ? findNthNextRegexMatch : findNthPreviousRegexMatch;
  const matchIdx = findNthMatchFn({ content, regex, startingIdx, n: repeat });
  if (matchIdx === undefined) {
    return oldPosition;
  }
  const newPosition = cm.posFromIndex(matchIdx);
  return newPosition;
}

/**
 * Returns the index (from the start of the content) of the nth-next instance of a pattern after a
 * given starting index.
 *
 * "Loops" to the top of the document when the bottom is reached; under the hood, we avoid repeated
 * loops by using modulo arithmetic.
 */
function findNthNextRegexMatch({
  content,
  regex,
  startingIdx,
  n,
}: {
  content: string;
  regex: RegExp;
  startingIdx: number;
  n: number;
}): number | undefined {
  const globalRegex = makeGlobalRegex(regex);
  const allMatches = [...content.matchAll(globalRegex)];
  const previousMatches = allMatches.filter((match) => match.index <= startingIdx);
  const nextMatches = allMatches.filter((match) => match.index > startingIdx);
  const nModulo = n % allMatches.length;
  const effectiveN = nModulo === 0 ? allMatches.length : nModulo;
  if (effectiveN <= nextMatches.length) {
    return nextMatches[effectiveN - 1].index;
  }
  return previousMatches[effectiveN - nextMatches.length - 1].index;
}

/**
 * Returns the index (from the start of the content) of the nth-previous instance of a pattern
 * before a given starting index.
 *
 * "Loops" to the bottom of the document when the top is reached; under the hood, we avoid repeated
 * loops by using modulo arithmetic.
 */
function findNthPreviousRegexMatch({
  content,
  regex,
  startingIdx,
  n,
}: {
  content: string;
  regex: RegExp;
  startingIdx: number;
  n: number;
}): number | undefined {
  const globalRegex = makeGlobalRegex(regex);
  const allMatches = [...content.matchAll(globalRegex)];
  const previousMatches = allMatches.filter((match) => match.index < startingIdx);
  const nextMatches = allMatches.filter((match) => match.index >= startingIdx);
  const match = getNthPreviousMatch(previousMatches, nextMatches, n);
  return match?.index;
}

function makeGlobalRegex(regex: RegExp): RegExp {
  const globalFlags = getGlobalFlags(regex);
  return new RegExp(regex.source, globalFlags);
}

function getGlobalFlags(regex: RegExp): string {
  const { flags } = regex;
  return flags.includes("g") ? flags : `${flags}g`;
}

function getNthPreviousMatch(
  previousMatches: RegExpExecArray[],
  nextMatches: RegExpExecArray[],
  n: number
): RegExpExecArray | undefined {
  const numMatches = previousMatches.length + nextMatches.length;
  const effectiveN = n % numMatches; // every `numMatches` is a full loop
  if (effectiveN <= previousMatches.length) {
    return getNthItemFromEnd(previousMatches, effectiveN);
  }
  return getNthItemFromEnd(nextMatches, effectiveN - previousMatches.length);
}

/**
 * Returns the nth (1-indexed) item from the end of an array. Expects 1 <= n <= items.length, but
 * just returns undefined if n is out of bounds.
 */
function getNthItemFromEnd<T>(items: T[], n: number): T | undefined {
  const numItems = items.length;
  if (n < 1 || n > numItems) {
    console.warn(`Invalid n: ${n} for array of length ${numItems}`);
    return undefined;
  }
  return items[numItems - n];
}
