import { Editor as CodeMirrorEditor } from "codemirror";
import { EditorPosition } from "obsidian";

/**
 * Returns a fake CodeMirror editor bound to the given `contentLines`.
 */
export function createFakeCodeMirrorEditor(
  contentLines: string[]
): Pick<CodeMirrorEditor, "getValue" | "indexFromPos" | "posFromIndex"> {
  const content = contentLines.join("\n");
  const lineStartIndexes = getLineStartIndexes(contentLines);
  return {
    getValue: () => content,
    indexFromPos: ({ line, ch }: EditorPosition) => lineStartIndexes[line] + ch,
    posFromIndex: (index: number) => getEditorPositionForIndex(index, lineStartIndexes),
  };
}

function getLineStartIndexes(lines: string[]): number[] {
  const lineStartIndexes: number[] = [];
  let currentIndex = 0;
  for (const line of lines) {
    lineStartIndexes.push(currentIndex);
    currentIndex += line.length + 1;
  }
  return lineStartIndexes;
}

function getEditorPositionForIndex(
  index: number,
  lineStartIndexes: number[]
): EditorPosition {
  for (let line = lineStartIndexes.length - 1; line >= 0; line -= 1) {
    if (lineStartIndexes[line] <= index) {
      return { line, ch: index - lineStartIndexes[line] };
    }
  }
  return { line: 0, ch: 0 };
}
