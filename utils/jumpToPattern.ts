import { Editor as CodeMirrorEditor } from "codemirror";
import { EditorPosition } from "obsidian";
import { shim as matchAllShim } from "string.prototype.matchall";

// Polyfill for String.prototype.matchAll, in case it's not available (pre-ES2020)
matchAllShim();

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
 * Returns the index of (up to) the n-th next instance of a pattern in a string after a given
 * starting index. If the pattern is not found at all, returns undefined.
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
  globalRegex.lastIndex = startingIdx + 1;
  let currMatch, lastMatch;
  let numMatchesFound = 0;
  while (
    numMatchesFound < n &&
    (currMatch = globalRegex.exec(content)) != null
  ) {
    lastMatch = currMatch;
    numMatchesFound++;
  }
  return lastMatch?.index;
}

/**
 * Returns the index of (up to) the nth-previous instance of a pattern in a string before a given
 * starting index. If the pattern is not found at all, returns undefined.
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
  const contentToSearch = content.substring(0, startingIdx);
  const previousMatches = [...contentToSearch.matchAll(globalRegex)];
  if (previousMatches.length < n) {
    return previousMatches[0]?.index;
  }
  return previousMatches[previousMatches.length - n].index;
}

function makeGlobalRegex(regex: RegExp): RegExp {
  const globalFlags = getGlobalFlags(regex);
  return new RegExp(regex.source, globalFlags);
}

function getGlobalFlags(regex: RegExp): string {
  const { flags } = regex;
  return flags.includes("g") ? flags : `${flags}g`;
}
