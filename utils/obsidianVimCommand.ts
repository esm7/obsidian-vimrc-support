/**
 * Utility types and functions for defining Obsidian-specific Vim commands.
 */

import { Editor as CodeMirrorEditor } from "codemirror";
import { Editor as ObsidianEditor } from "obsidian";

import { MotionFn, VimApi } from "./vimApi";

export type ObsidianActionFn = (
  obsidianEditor: ObsidianEditor,
  cm: CodeMirrorEditor,
  actionArgs: { repeat: number },
  vimState: any
) => void;

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
  const actionFn = (
    cm: CodeMirrorEditor,
    actionArgs: { repeat: number },
    vimState: any
  ) => {
    const obsidianEditor = getActiveObsidianEditor();
    obsidianActionFn(obsidianEditor, cm, actionArgs, vimState);
  };
  vimObject.defineAction(obsidianActionFn.name, actionFn);
  vimObject.mapCommand(mapping, "action", obsidianActionFn.name, undefined, {});
}
