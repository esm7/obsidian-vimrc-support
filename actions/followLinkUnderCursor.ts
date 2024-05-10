import { ObsidianActionFn } from "../utils/obsidianVimCommand";

/**
 * Follows the link under the cursor, temporarily moving the cursor if necessary for follow-link to
 * work (i.e. if the cursor is on a starting square bracket).
 */
export const followLinkUnderCursor: ObsidianActionFn = (vimrcPlugin) => {
  const obsidianEditor = vimrcPlugin.getActiveObsidianEditor();
  const { line, ch } = obsidianEditor.getCursor();
  const firstTwoChars = obsidianEditor.getRange(
    { line, ch },
    { line, ch: ch + 2 }
  );
  let numCharsMoved = 0;
  for (const char of firstTwoChars) {
    if (char === "[") {
      obsidianEditor.exec("goRight");
      numCharsMoved++;
    }
  }
  vimrcPlugin.executeObsidianCommand("editor:follow-link");
  // Move the cursor back to where it was
  for (let i = 0; i < numCharsMoved; i++) {
    obsidianEditor.exec("goLeft");
  }
};
