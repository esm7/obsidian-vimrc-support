import { Editor as CodeMirrorEditor } from "codemirror";
import { EditorPosition } from "obsidian";

export type MotionFn = (
  cm: CodeMirrorEditor,
  oldPosition: EditorPosition,
  motionArgs: { repeat: number }
) => EditorPosition;

/**
 * Partial representation of the CodeMirror Vim API that we use to define motions, commands, etc.
 *
 * Reference: https://github.com/replit/codemirror-vim/blob/master/src/vim.js
 */
export type VimApi = {
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
