/**
 * Partial representation of the CodeMirror Vim API that we use to define motions, commands, etc.
 *
 * References:
 * https://github.com/replit/codemirror-vim/blob/master/src/vim.js
 * https://libvoyant.ucr.edu/resources/codemirror/doc/manual.html
 */

import { Editor as CodeMirrorEditor } from "codemirror";
import { EditorPosition } from "obsidian";

export type MotionFn = (
  cm: CodeMirrorEditor,
  cursorPosition: EditorPosition, // called `head` in the API
  motionArgs: { repeat: number }
) => EditorPosition;

export type ActionFn = (
  cm: CodeMirrorEditor,
  actionArgs: { repeat: number },
) => void;

export type VimApi = {
  defineMotion: (name: string, fn: MotionFn) => void;
  defineAction: (name: string, fn: ActionFn) => void;
  mapCommand: (
    keys: string,
    type: string,
    name: string,
    args: any,
    extra: { [x: string]: any }
  ) => void;
};
