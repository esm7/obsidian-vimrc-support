import { shim as matchAllShim } from "string.prototype.matchall";
matchAllShim();

/**
 * Returns the index of the first instance of a pattern in a string after a given starting index.
 * If the pattern is not found, returns the starting index.
 */
export function getNthNextInstanceOfPattern(
  content: string,
  regex: RegExp,
  startingIdx: number,
  n: number
): number {
  let numMatchesFound = 0;
  let currMatchIdx = startingIdx;
  const globalRegex = addGlobalFlagIfNeeded(regex);
  while (currMatchIdx < content.length - 1 && numMatchesFound < n) {
    const contentToSearch = content.substring(currMatchIdx + 1);
    const substringMatch = globalRegex.exec(contentToSearch);
    if (!substringMatch) {
      return currMatchIdx;
    }
    currMatchIdx = currMatchIdx + substringMatch.index + 1;
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

/**
 * Returns the index of the last found instance of a pattern in a string before a given starting
 * index. If the pattern is not found, returns -1.
 *
 * This version of the function, to find each previous match, instead of reversing the string, will
 * call globalRegex.exec until it can't find any more matches.
 */
export function getNthPreviousInstanceOfPatternV2(
  content: string,
  regex: RegExp,
  startingIdx: number,
  n: number
): number {
  let numMatchesFound = 0;
  let currMatchIdx = startingIdx;
  const globalRegex = addGlobalFlagIfNeeded(regex);
  while (currMatchIdx > 0 && numMatchesFound < n) {
    const previousContent = content.substring(0, currMatchIdx);
    const previousMatchIdx = getIndexOfLastMatchV2(
      globalRegex,
      previousContent
    );
    if (!previousMatchIdx) {
      return currMatchIdx;
    }
    currMatchIdx = previousMatchIdx;
    numMatchesFound++;
  }
  return currMatchIdx;
}

/**
 * Returns the index of the last found instance of a pattern in a string. If the pattern is not
 * found, returns undefined.
 *
 * Under the hood, this function will call globalRegex.exec from the start of the string until it
 * can't find any more matches.
 */
function getIndexOfLastMatchV2(
  globalRegex: RegExp,
  content: string
): number | undefined {
  if (!globalRegex.global) {
    throw new TypeError("Regex must be global");
  }
  let currMatchIdx = undefined;
  let result: RegExpExecArray | null;
  while ((result = globalRegex.exec(content)) != null) {
    currMatchIdx = result.index;
  }
  return currMatchIdx;
}
