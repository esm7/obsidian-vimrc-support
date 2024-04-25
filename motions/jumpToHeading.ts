import { Editor, EditorPosition } from "obsidian";

export function jumpToNextHeading(
  cm: Editor,
  { line, ch }: EditorPosition,
  motionArgs: { repeat: number }
): EditorPosition {
  const { repeat } = motionArgs;
  const noteContent = cm.getValue();
  const nextContentLines = noteContent.split("\n").slice(line + 1);
  const nextHeadingIdx =
    getNthHeadingIndex(nextContentLines, repeat) + line + 1;
  if (nextHeadingIdx === -1) {
    return { line, ch };
  }
  return { line: nextHeadingIdx, ch: 0 };
}

export function jumpToPreviousHeading(
  cm: Editor,
  { line, ch }: EditorPosition,
  motionArgs: { repeat: number }
): EditorPosition {
  const { repeat } = motionArgs;
  const noteContent = cm.getValue();
  const isAlreadyOnHeading = cm.getLine(line).startsWith("#");
  const lastIdxToConsider = isAlreadyOnHeading ? line - 1 : line;
  const previousContentLines = noteContent
    .split("\n")
    .slice(0, lastIdxToConsider + 1)
    .reverse();
  const previousHeadingIdx = getNthHeadingIndex(previousContentLines, repeat);
  if (previousHeadingIdx === -1) {
    return { line, ch };
  }
  return { line: lastIdxToConsider - previousHeadingIdx, ch: 0 };
}

function getNthHeadingIndex(contentLines: string[], n: number): number {
  let numHeadingsFound = 0;
  let currHeadingIndex = -1;
  for (let i = 0; i < contentLines.length; i++) {
    const headingRegex = /^#+ /;
    if (!headingRegex.test(contentLines[i])) {
      continue;
    }
    currHeadingIndex = i;
    numHeadingsFound++;
    if (numHeadingsFound === n) {
      return currHeadingIndex;
    }
  }
  return currHeadingIndex;
}
