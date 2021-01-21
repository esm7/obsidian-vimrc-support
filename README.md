# Obsidian Vimrc Support Plugin

This plugin loads a file of Vim commands from `VAULT_ROOT/.obsidian.vimrc`.
For users of the Obsidian.md Vim mode, this is very useful for making various settings (most notably keymaps) persist.

Note that this plugin is **not** the Vim support of Obsidian -- that support is built-in and you can perfectly use Obsidian in Vim mode without this plugin.
This plugin merely implements the ability to load a persistent configuration and adds a few extras.

## Usage

First and foremost, make sure you have the Obsidian Vim key bindings turned on -- see Editor -> Vim key bindings.

Now to keep some of your Vim settings permanent, install this plugin and put a file named `.obsidian.vimrc` in your vault root.
If you're using multiple vaults, you'll need this file on each one.

Here's a simple & useful `.obsidian.vimrc` that I'm using:

```
" Have j and k navigate visual lines rather than logical ones
nmap j gj
nmap k gk
" I like using H and L for beginning/end of line
nmap H ^
nmap L $
" Quickly remove search highlights
nmap <F9> :nohl

" Yank to system clipboard
set clipboard=unnamed
```

## Supported Commands

The commands that can be used are whatever CodeMirror supports.
I couldn't find a formal list anywhere but you can look for `defaultExCommandMap` in [the source code](https://github.com/codemirror/CodeMirror/blob/master/keymap/vim.js), or play around with trying commands in Obsidian's Vim mode.

In addition to that:
- The plugin skips blank lines and lines starting with Vimscript comments (`" ...`).
- Special support for yanking to system clipboard can be activated by `set clipboard=unnamed` (`unnamedplus` will do the same thing).
- Support for the `tabstop` Vim option (e.g. `set tabstop=4`).
- Custom mapping/unmapping commands in addition to the defaults: `noremap` and `iunmap` (PRs are welcome to implement more :) )

Commands that fail don't generate any visible error for now.

**Important tip!** Before adding commands to your Vimrc file, you should try them in Obsidian's normal mode (type '`:`' in the editor) to make sure they work as expected.
CodeMirror's Vim mode has some limitations and bugs and not all commands will work like you'd expect.
In some cases you can find workarounds by experimenting, and the easiest way to do that is by trying interactively rather than via the Vimrc file.

## Installation

In the Obsidian.md settings under "Third-party plugin", turn off Safe mode, then browse to this plugin.

Alternatively (and less recommended), you can install it manually: just copy `main.js` and `manifest.json` to your vault `VaultFolder/.obsidian/plugins/obsidian-vimrc-support/`.

## "Please implement \[some Vim feature here\]..."

I'd like to emphasize again that this plugin is a tweak to Obsidian's built-in Vim mode, which is in turn mostly the [Vim mode of CodeMirror](https://codemirror.net/demo/vim.html). And while I am personally very fond of helping everybody make use of Vim modes everywhere, this plugin is often not the best place to implement some types of features.

1. Vim editor features (e.g. new motions) would best be implemented in CodeMirror, so other editors using this component would enjoy them too! Please consider submitting issues or pull requests [there](https://github.com/codemirror/CodeMirror/) first.
2. Features that are already implemented by other Obsidian plugins are best to stay in these plugins. Please consider asking these plugin authors to add Vim support for their features (using the CodeMirror API), or even better -- help them out :)

Having said that, adding features here in this plugin is often very easy thanks to the CodeMirror [API for extending its Vim mode](https://codemirror.net/doc/manual.html#vimapi_extending), so as the path of least resistance I will occassionally implement some requested Vim features and be happy to accept PRs.

Things I'd love to add:
- Implement some standard `vim-markdown` motions for Obsidian, e.g. `[[`, or implement for CodeMirror the 1-2 missing Ex commands required to define these keymaps in the Vimrc.
- Relative line numbers.

## Changelog

### 0.2.4

Fixed a race condition with yank & paste: https://github.com/esm7/obsidian-vimrc-support/issues/11

### 0.2.3

Added the `noremap` command, thanks @nadavspi!

### 0.2.2

Added the `iunmap` command, thanks @hnsol!

### 0.2.1

- Fixed [this issue](https://github.com/esm7/obsidian-vimrc-support/issues/7): setting `clipboard=unnamed` also works for pasting now (it monitors the system clipboard and updates the yank buffer if a change is detected).
- Support for the `tabstop` Vim option as asked [here](https://github.com/esm7/obsidian-vimrc-support/issues/3).

### 0.2.0

Added support for yanking to system clipboard (see above), comments and blank lines.

### 0.1.1

Fixed [an issue](https://github.com/esm7/obsidian-vimrc-support/issues/2) caused by the plugin injecting the Vimrc on every file load.
The plugin now injects the Vimrc just once for the CodeMirror class (for the class -- not object instance, because that's where CodeMirror keeps the Vim settings.)

This seems to work well, but in theory there could be Vimrc settings that are CodeMirror-object bound and not class-bound, and in that case we'll be in trouble (these settings will be lost when Obsidian replaces CodeMirror objects).
