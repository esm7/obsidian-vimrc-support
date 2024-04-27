import { ObsidianActionFn } from "../utils/obsidianVimCommand";

export const followLinkUnderCursor: ObsidianActionFn = (vimrcPlugin) => {
  // If the cursor is on the starting square bracket(s), we need to move it inside them
  const obsidianEditor = vimrcPlugin.getActiveObsidianEditor();
  const { line, ch } = obsidianEditor.getCursor();
  const firstTwoChars = obsidianEditor.getRange(
    { line, ch },
    { line, ch: ch + 2 }
  );
  let charOffset = 0;
  for (const char of firstTwoChars) {
    if (char === "[") {
      obsidianEditor.exec("goRight");
      charOffset++;
    }
  }
  vimrcPlugin.executeObsidianCommand("editor:follow-link");
  // Move the cursor back to where it was
  for (let i = 0; i < charOffset; i++) {
    obsidianEditor.exec("goLeft");
  }
};
