import { Editor as CodeMirrorEditor } from "codemirror";
import { EditorPosition, Editor as ObsidianEditor } from "obsidian";
import {
  getNthPreviousInstanceOfPattern
} from "./motionUtils";

const LINK_REGEX = /\[\[[^\]\]]+?\]\]/g;

export function jumpToPreviousLink(
  obsidianEditor: ObsidianEditor,
  cm: CodeMirrorEditor,
  { line, ch }: EditorPosition,
  motionArgs: { repeat: number }
): EditorPosition {
  const content = cm.getValue();
  const cursorOffset = obsidianEditor.posToOffset({ line, ch });
  const previousLinkIdx = getNthPreviousInstanceOfPattern({
    content,
    regex: LINK_REGEX,
    startingIdx: cursorOffset,
    n: motionArgs.repeat,
  });
  if (previousLinkIdx === undefined) {
    return { line, ch };
  }
  const newPosition = obsidianEditor.offsetToPos(previousLinkIdx + 2);
  return newPosition;
}
