import { Editor as CodeMirrorEditor } from "codemirror";
import { EditorPosition } from "obsidian";

export type MotionFn = (
  cm: CodeMirrorEditor,
  oldPosition: EditorPosition,
  motionArgs: { repeat: number }
) => EditorPosition;

// Reference: @replit/codemirror-vim/src/vim.js
type VimApi = {
  defineMotion: (name: string, fn: MotionFn) => void;
  mapCommand: (
    keys: string,
    type: string,
    name: string,
    args: any,
    extra: { [x: string]: any }
  ) => void;
};

export function defineObsidianVimMotion(
  vimObject: VimApi,
  motionFn: MotionFn,
  mapping: string
) {
  vimObject.defineMotion(motionFn.name, motionFn);
  vimObject.mapCommand(mapping, "motion", motionFn.name, undefined, {});
}
