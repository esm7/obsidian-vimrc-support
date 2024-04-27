import { Editor as ObsidianEditor } from "obsidian";

import { ObsidianActionFn } from "../utils/obsidianVimCommand";

export const moveDownSkippingFolds: ObsidianActionFn = (
  obsidianEditor,
  cm,
  { repeat }
) => {
  moveSkippingFolds(obsidianEditor, repeat, "down");
};

export const moveUpSkippingFolds: ObsidianActionFn = (
  obsidianEditor,
  cm,
  { repeat }
) => {
  moveSkippingFolds(obsidianEditor, repeat, "up");
};

function moveSkippingFolds(
  obsidianEditor: ObsidianEditor,
  repeat: number,
  direction: "up" | "down"
) {
  let { line: oldLine, ch: oldCh } = obsidianEditor.getCursor();
  const commandName = direction === "up" ? "goUp" : "goDown";
  for (let i = 0; i < repeat; i++) {
    obsidianEditor.exec(commandName);
    const { line: newLine, ch: newCh } = obsidianEditor.getCursor();
    if (newLine === oldLine && newCh === oldCh) {
      // Going in the specified direction doesn't do anything anymore, stop now
      return;
    }
    [oldLine, oldCh] = [newLine, newCh];
  }
}
