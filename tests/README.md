# Tests

Run the unit tests and build from the repository root:

```sh
npm ci
npm test -- --run
npm run build
node tests/build-smoke.cjs
```

## Obsidian editor checks

With a desktop *Obsidian* vault open, its CLI enabled, and *Vim* key bindings on:

```sh
node tests/obsidian/run.cjs YourVault
```

An optional second argument specifies the *Obsidian* executable. On Windows, use `Obsidian.com`.

The runner compiles the open-line action module, temporarily registers its mappings, and tests it against the running editor in source and live preview modes. It creates a temporary note, restores the previous tab and mappings, and removes the note. Run it while the editor is idle.

Checks cover `o`/`O` keyboard events, list/task/quote prefixes, cursor placement, dot repetition, numeric counts, undo, literal blocks, visual mode, and user mapping precedence. The separate build check verifies that the built plugin registers both default actions.

Typing fixtures start uppercase to avoid separate auto-capitalization edits from other plugins. Undo assertions follow the native editor grouping: typed text and the original line opening are separate steps.
