/**
 * Utility types and functions for defining Obsidian-specific Vim commands.
 */

import { Editor as CodeMirrorEditor } from "codemirror";

import VimrcPlugin from "../main";
import { MotionFn, VimApi } from "./vimApi";

export type ObsidianActionFn = (
  vimrcPlugin: VimrcPlugin,  // Included so we can run Obsidian commands as part of the action
  cm: CodeMirrorEditor,
  actionArgs: { repeat: number },
) => void;

export function defineAndMapObsidianVimMotion(
  vimObject: VimApi,
  motionFn: MotionFn,
  mapping: string
) {
  vimObject.defineMotion(motionFn.name, motionFn);
  vimObject.mapCommand(mapping, "motion", motionFn.name, undefined, {});
}

export function defineAndMapObsidianVimAction(
  vimObject: VimApi,
  vimrcPlugin: VimrcPlugin,
  obsidianActionFn: ObsidianActionFn,
  mapping: string
) {
  vimObject.defineAction(obsidianActionFn.name, (cm, actionArgs) => {
    obsidianActionFn(vimrcPlugin, cm, actionArgs);
  });
  vimObject.mapCommand(mapping, "action", obsidianActionFn.name, undefined, {});
}
