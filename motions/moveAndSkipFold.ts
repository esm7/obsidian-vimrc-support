import { Editor, EditorPosition } from "obsidian";

export function moveUpSkipFold(
  cm: Editor,
  { line, ch }: EditorPosition,
  motionArgs: { repeat: number }
): EditorPosition {
  // TODO: Implement this
  return { line, ch };
}

export function moveDownSkipFold(
  cm: Editor,
  { line, ch }: EditorPosition,
  motionArgs: { repeat: number }
): EditorPosition {
  // TODO: Implement this
  return { line, ch };
}
