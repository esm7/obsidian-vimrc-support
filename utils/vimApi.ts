import { Editor as CodeMirrorEditor } from "codemirror";
import { EditorPosition, Editor as ObsidianEditor } from "obsidian";

export type MotionFn = (
  cm: CodeMirrorEditor,
  oldPosition: EditorPosition,
  motionArgs: { repeat: number }
) => EditorPosition;

export type ActionFn = (
  cm: CodeMirrorEditor,
  actionArgs: { repeat: number },
  vimState: any
) => void;

export type ObsidianActionFn = (
  obsidianEditor: ObsidianEditor,
  cm: CodeMirrorEditor,
  actionArgs: { repeat: number },
  vimState: any
) => void;

/**
 * Partial representation of the CodeMirror Vim API that we use to define motions, commands, etc.
 *
 * Reference: https://github.com/replit/codemirror-vim/blob/master/src/vim.js
 */
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

export function defineObsidianVimMotion(
  vimObject: VimApi,
  motionFn: MotionFn,
  mapping: string
) {
  vimObject.defineMotion(motionFn.name, motionFn);
  vimObject.mapCommand(mapping, "motion", motionFn.name, undefined, {});
}

export function defineObsidianVimAction(
  vimObject: VimApi,
  getActiveObsidianEditor: () => ObsidianEditor,
  obsidianActionFn: ObsidianActionFn,
  mapping: string
) {
  const actionFn = (cm: CodeMirrorEditor, actionArgs: { repeat: number }, vimState: any) => {
    const obsidianEditor = getActiveObsidianEditor();
    obsidianActionFn(obsidianEditor, cm, actionArgs, vimState);
  }
  vimObject.defineAction(obsidianActionFn.name, actionFn);
  vimObject.mapCommand(mapping, "action", obsidianActionFn.name, undefined, {});
}