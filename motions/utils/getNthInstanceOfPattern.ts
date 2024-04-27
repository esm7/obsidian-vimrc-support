import { shim as matchAllShim } from "string.prototype.matchall";
matchAllShim();

/**
 * Returns the index of the first instance of a pattern in a string after a given starting index.
 * If the pattern is not found, returns the starting index.
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
  let numMatchesFound = 0;
  let currMatchIdx = startingIdx;
  const globalRegex = addGlobalFlagIfNeeded(regex);
  while (currMatchIdx < content.length - 1 && numMatchesFound < n) {
    const contentToSearch = content.substring(currMatchIdx + 1);
    const substringMatchIdx = contentToSearch.search(globalRegex);
    if (substringMatchIdx === -1) {
      return currMatchIdx;
    }
    currMatchIdx = currMatchIdx + substringMatchIdx + 1;
    numMatchesFound++;
  }
  return currMatchIdx;
}

/**
 * Returns the index of the last found instance of a pattern in a string before a given starting
 * index. If the pattern is not found, returns undefined.
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
  const globalRegex = addGlobalFlagIfNeeded(regex);
  const contentToSearch = content.substring(0, startingIdx);
  const previousMatches = [...contentToSearch.matchAll(globalRegex)];
  if (previousMatches.length < n) {
    return previousMatches[0]?.index;
  }
  return previousMatches[previousMatches.length - n].index;
}

function addGlobalFlagIfNeeded(regex: RegExp): RegExp {
  return regex.global ? regex : new RegExp(regex.source, getGlobalFlags(regex));
}

function getGlobalFlags(regex: RegExp): string {
  const { flags } = regex;
  return flags.includes("g") ? flags : `${flags}g`;
}
