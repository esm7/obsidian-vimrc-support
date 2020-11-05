# Obsidian Vimrc Support Plugin

This plugin loads a file of Vim commands from `VAULT_ROOT/.obsidian.vimrc`.
For users of the Obsidian.md Vim mode, this is very useful for making various settings (most notably keymaps) persist.

## Usage

First and foremost, make sure you have the Obsidian Vim key bindings turned on -- see Editor -> Vim key bindings.

Now to keep some of your Vim settings permanent, install this plugin and put a file named `.obsidian.vimrc` in your vault root.
If you're using multiple vaults, you'll need this file on each one.

Here's a simple & useful `.obsidian.vimrc` that I'm using:

```
nmap j gj
nmap k gk
nmap H ^
nmap L $
nmap <F9> :nohl
```

## Supported Commands

The commands that can be used are whatever CodeMirror supports.
I couldn't find a formal list anywhere but you can look for `defaultExCommandMap` in [the source code](https://github.com/codemirror/CodeMirror/blob/master/keymap/vim.js), or play around with trying commands in Obsidian's Vim mode.

Note that the file parsing is as simple as it gets -- it just sends each line to the CodeMirror Ex-command parser. Therefore comments or other features you may expect don't work.

Also, commands that fail don't generate any visible error for now.

## Installation

In the Obsidian.md settings under "Third-party plugin", turn off Safe mode, then browse to this plugin.

Alternatively (and less recommended), you can install it manually: just copy `main.js` and `manifest.json` to your vault `VaultFolder/.obsidian/plugins/obsidian-vimrc-support/`.

## Wishlist

There are many things that I wish the CodeMirror implementation would allow.
Many of these can be added using the CodeMirror [API for extending its Vim mode](https://codemirror.net/doc/manual.html#vimapi_extending) and maybe I'll work on these at some point.

Things I'd love to add:
- Implement some standard `vim-markdown` motions for Obsidian, e.g. `[[`, or implement for CodeMirror the 1-2 missing Ex commands required to define these keymaps in the Vimrc.
- Relative line numbers.

