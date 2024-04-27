import { Editor as CodeMirrorEditor } from "codemirror";
import { EditorPosition } from "obsidian";
import { shim as matchAllShim } from "string.prototype.matchall";
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
  const jumpFn =
    direction === "next"
      ? getNthNextInstanceOfPattern
      : getNthPreviousInstanceOfPattern;
  const matchIdx = jumpFn({ content, regex, startingIdx, n: repeat });
  if (matchIdx === undefined) {
    return oldPosition;
  }
  const newPosition = cm.posFromIndex(matchIdx);
  return newPosition;
}

/**
 * Returns the index of (up to) the n-th instance of a pattern in a string after a given starting
 * index. If the pattern is not found at all, returns undefined.
 */
export function getNthNextInstanceOfPattern({
  content,
  regex,
  startingIdx,
  n,
}: {
  content: string;
  regex: RegExp;
  startingIdx: number;
  n: number;
}): number {
  const globalRegex = makeGlobalRegex(regex);
  globalRegex.lastIndex = startingIdx + 1;
  let currMatch;
  let numMatchesFound = 0;
  while (numMatchesFound < n && (currMatch = globalRegex.exec(content)) != null) {
    numMatchesFound++;
  }
  return currMatch?.index;
}

/**
 * Returns the index of (up to) the nth-last instance of a pattern in a string before a given
 * starting index. If the pattern is not found at all, returns undefined.
 */
export function getNthPreviousInstanceOfPattern({
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
