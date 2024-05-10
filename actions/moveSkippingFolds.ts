import VimrcPlugin from "../main";
import { ObsidianActionFn } from "../utils/obsidianVimCommand";

/**
 * Moves the cursor down `repeat` lines, skipping over folded sections.
 */
export const moveDownSkippingFolds: ObsidianActionFn = (
  vimrcPlugin,
  cm,
  { repeat }
) => {
  moveSkippingFolds(vimrcPlugin, repeat, "down");
};

/**
 * Moves the cursor up `repeat` lines, skipping over folded sections.
 */
export const moveUpSkippingFolds: ObsidianActionFn = (
  vimrcPlugin,
  cm,
  { repeat }
) => {
  moveSkippingFolds(vimrcPlugin, repeat, "up");
};

function moveSkippingFolds(
  vimrcPlugin: VimrcPlugin,
  repeat: number,
  direction: "up" | "down"
) {
  const obsidianEditor = vimrcPlugin.getActiveObsidianEditor();
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
