# Obsidian Vimrc Support Plugin

> [!IMPORTANT]
> In Obsidian 1.7.2 and beyond, `<CR>` needs to be added for normal mode Ex command mappings, e.g. `nmap <F9> :nohl<CR>` instead of `nmap <F9> :nohl` (similarly to "real" Vim).
> This is due to a breaking change in the underlying `codemirror-vim` library.
> Normal mode movements, e.g. `map j gj`, remain as-is.

> [!NOTE]
> **Maintainer Needed!**
> 
> While I am still around for some urgent fixes, especially when the plugin stops working due to Obsidian API changes, I am no longer able to give it the attention it deserves.
> 
> Anyone who wishes to take over, please message me.

[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/esm7)

This plugin loads a file of Vim commands from `path/to/VaultName/.obsidian.vimrc`.
For users of the Obsidian.md Vim mode, this is very useful for making various settings (most notably keymaps) persist.

Note that this plugin is **not** the Vim support of Obsidian -- that support is built-in and you can perfectly use Obsidian in Vim mode without this plugin.
This plugin merely implements the ability to load a persistent configuration and adds a few extras.

## Usage

First and foremost, make sure you have the Obsidian Vim key bindings turned on -- see Editor -> Vim key bindings.

Now to keep some of your Vim settings permanent, install this plugin and put a file named `.obsidian.vimrc` in your vault root (*not* inside the `.obsidian` directory).
If you're using multiple vaults, you'll need this file on each one.

**For iOS/iPadOS users**, it's highly recommended to set "Paste from Other Apps" of Obsidian to Allow, so there won't be annoying popups.

Here's a simple & useful `.obsidian.vimrc` that I'm using:

```vim
" Have j and k navigate visual lines rather than logical ones
nmap j gj
nmap k gk
" I like using H and L for beginning/end of line
nmap H ^
nmap L $
" Quickly remove search highlights
nmap <F9> :nohl<CR>

" Yank to system clipboard
set clipboard=unnamed

" Go back and forward with Ctrl+O and Ctrl+I
" (make sure to remove default Obsidian shortcuts for these to work)
exmap back obcommand app:go-back
nmap <C-o> :back<CR>
exmap forward obcommand app:go-forward
nmap <C-i> :forward<CR>
```

## Supported Commands

The commands that can be used are whatever CodeMirror supports.
I couldn't find a formal list anywhere but you can look for `defaultExCommandMap` in [the source code](https://github.com/replit/codemirror-vim/blob/master/src/vim.js), or play around with trying commands in Obsidian's Vim mode.

In addition to that:
- The plugin skips blank lines and lines starting with Vimscript comments (`" ...`).
- Special support for yanking to system clipboard can be activated by `set clipboard=unnamed` (`unnamedplus` will do the same thing).
- Support for the `tabstop` Vim option (e.g. `set tabstop=4`).
- Custom mapping/unmapping commands in addition to the defaults:
  - `noremap`
  - `iunmap`
  - `nunmap`
  - `vunmap`
  - PRs are welcome to implement more :)
- `exmap [commandName] [command...]`: a command to map Ex commands. This should basically be supported in regular `:map`, but doesn't work with multi-argument commands due to a CodeMirror bug, so this is a workaround.
- `obcommand` - execute Obsidian commands, see more details below.
- `cmcommand` - execute arbitrary CodeMirror commands, see details below.
- `surround` - surround your selected text in visual mode or word in normal mode with text.
- `pasteinto` - paste your current clipboard into your selected text in visual mode or word in normal mode. Useful for creating hyperlinks.
- `jscommand` and `jsfile` - extend Vim mode using JavaScript snippets.
- `source` - loads Vim commands from a file (relative to the vault root).

Commands that fail don't generate any visible error for now.

**Important tip!** Before adding commands to your Vimrc file, you should try them in Obsidian's normal mode (type '`:`' in the editor) to make sure they work as expected.
CodeMirror's Vim mode has some limitations and bugs and not all commands will work like you'd expect.
In some cases you can find workarounds by experimenting, and the easiest way to do that is by trying interactively rather than via the Vimrc file.

Finally, this plugin also provides the following motions/mappings by default:

- `[[` and `]]` to jump to the previous and next Markdown heading.
- `zk` and `zj` to move up and down while skipping folds.
- `gl` and `gL` to jump to the next and previous link.
- `gf` to open the link or file under the cursor (temporarily moving the cursor if necessary—e.g. if it's on the first square bracket of a [[Wikilink]]).

## Installation

In the Obsidian.md settings under "Community plugins", click on "Turn on community plugins", then browse to this plugin.

Alternatively (and less recommended), you can install it manually: just copy `main.js` and `manifest.json` to your vault `VaultFolder/.obsidian/plugins/obsidian-vimrc-support/`.

## Support the Development

If you want to support the development of this plugin, please consider to [buy me a coffee](https://www.buymeacoffee.com/esm7).

## "Please implement \[some Vim feature here\]..."

I'd like to emphasize again that this plugin is a tweak to Obsidian's built-in Vim mode, which is in turn mostly the [`codemirror-vim` extension for CodeMirror](https://raw.githack.com/replit/codemirror-vim/master/dev/web-demo.html). And while I am personally very fond of helping everybody make use of Vim modes everywhere, this plugin is often not the best place to implement some types of features.

1. Vim editor features (e.g. new motions) would best be implemented in `codemirror-vim`, so other editors using this component would enjoy them too! Please consider submitting issues or pull requests [there](https://github.com/replit/codemirror-vim) first.
2. Features that are already implemented by other Obsidian plugins are best to stay in these plugins. Please consider asking these plugin authors to add Vim support for their features (using the CodeMirror API), or even better -- help them out :)

Having said that, adding features here in this plugin is often very easy thanks to the CodeMirror [API for extending its Vim mode](https://codemirror.net/doc/manual.html#vimapi_extending), so as the path of least resistance I will occassionally implement some requested Vim features and be happy to accept PRs.

Things I'd love to add:
- Implement some standard `vim-markdown` motions for Obsidian, e.g. `[[`, or implement for CodeMirror the 1-2 missing Ex commands required to define these keymaps in the Vimrc.

## Change Vimrc File Location/Name

If you want the Vimrc file name or path to be different than the default, there is a plugin setting (under Settings | Plugin Options | Vimrc Support) to change that.

## Executing Obsidian Commands with `obcommand`

The plugin defines a custom Ex command named `obcommand` to execute various Obsidian commands as an Ex command.
This is useful to map external functionality of Obsidian or other plugins to Vim shortcuts, but it's not as easy to use as one would hope.

If you just type `:obcommand` you'll get in the Developer Console (Ctrl+Shift+I) the list of commands that are currently defined by the app.
The simple syntax `:obcommand [commandName]` will execute the named command.

Some useful examples:
- `obcommand editor:insert-link`
- `obcommand editor:toggle-comment`
- `obcommand app:go-back`
- `obcommand workspace:split-vertical`

And many more.

**WARNING:** this is not a formal API that Obsidian provides and is done in a rather hacky manner.
It's definitely possible that some future version of Obsidian will break this functionality.

### Mapping Obsidian Commands Within Vim

Next thing you probably wanna ask is "how do I map the great Obsidian commands to Vim commands?"

The trivial answer should have been something along the line of `:nmap <C-o> :obcommand app:go-back`, but this **does not work** because of an annoying CodeMirror bug.
Turns out that the various mapping commands of CodeMirror pass only the first argument, so when you execute your mapping if defined as above, `:obcommand` would execute with no arguments.

Here comes a custom command to the rescue, `exmap`, which you can use to "alias" Ex commands for longer Ex commands: `:exmap back obcommand app:go-back`.
You now have a simple (0 argument) Ex command named `back` that goes back in Obsidian, and *that* is something you can map.

To summarize, here's how you map `C-o` to Back:
```
exmap back obcommand app:go-back
nmap <C-o> :back<CR>
```

Note how `exmap` lists command names without colons and in `nmap` the colon is required.

## Surround Text with `surround`

The plugin defines a custom Ex command named `surround` to surround either your currently selected text in visual mode or the word your cursor is over in normal mode with text.
This is useful for Vim users who are used to the `vim-surround` plugin.

The syntax follows `:surround [prefixText] [postfixText]`.

Some examples:

- `surround ( )`
- `surround " "`
- `surround [[ ]]`

Here's an example config that implements many of the features from vim-surround:

```
exmap surround_wiki surround [[ ]]
exmap surround_double_quotes surround " "
exmap surround_single_quotes surround ' '
exmap surround_backticks surround ` `
exmap surround_brackets surround ( )
exmap surround_square_brackets surround [ ]
exmap surround_curly_brackets surround { }

" NOTE: must use 'map' and not 'nmap'
map [[ :surround_wiki<CR>
nunmap s
vunmap s
map s" :surround_double_quotes<CR>
map s' :surround_single_quotes<CR>
map s` :surround_backticks<CR>
map sb :surround_brackets<CR>
map s( :surround_brackets<CR>
map s) :surround_brackets<CR>
map s[ :surround_square_brackets<CR>
map s] :surround_square_brackets<CR>
map s{ :surround_curly_brackets<CR>
map s} :surround_curly_brackets<CR>
```

Usage:

1. Select some text in visual mode, then press `s` and then the desired surround character. e.g. `s"` to surround the selected text with double quotes.
2. Place your cursor over a word in normal mode, then press `s` and then the desired surround character. e.g. `s"` to surround the word with double quotes.

## Inserting Links/Hyperlinks with `pasteinto`

The plugin defines a custom Ex command named `pasteinto` to paste text into your currently selected text in visual mode, or the word your cursor is over in normal mode.
This is particularly useful for creating links/hyperlinks `[selected-text](paste)`.

Here's my hyperlink config as an example:
```
" Maps pasteinto to Alt-p
map <A-p> :pasteinto
```

## Some Help with Binding Space Chords (Doom and Spacemacs fans)

`<Space>` can be bound to make chords, such as `<Space>fs` in conjunction with obcommand to save your current file and more.
But first `<Space>` must be unbound with `unmap <Space>`.
Afterwards `<Space>` can be mapped normally as any other key.


## Emulate Common Vim Commands via Obsidian commands

Using `obcommand`, it is possible to emulate some additional Vim commands that aren't included in Obsidian's Vim mode, like for example `gt` and `zo`. 

```vim
" Emulate Folding https://vimhelp.org/fold.txt.html#fold-commands
exmap togglefold obcommand editor:toggle-fold
nmap zo :togglefold<CR>
nmap zc :togglefold<CR>
nmap za :togglefold<CR>

exmap unfoldall obcommand editor:unfold-all
nmap zR :unfoldall<CR>

exmap foldall obcommand editor:fold-all
nmap zM :foldall<CR>

exmap tabnext obcommand workspace:next-tab
nmap gt :tabnext<CR>
exmap tabprev obcommand workspace:previous-tab
nmap gT :tabprev<CR>

```

## Fixed Keyboard Layout in Normal Mode

In many languages and keyboard layouts it becomes problematic or plain impossible to use Vim keys.
The Vim keys are located in different positions on some keyboard layouts, which could be confusing when switching
layouts, and on some layouts (e.g. non-Western languages) the keys for Vim movements just don't exist.
To be able to use Vim mode with those layouts & languages, you can turn on the "fixed keyboard layout" feature in the
plugin settings.

When turned on for the first time, or when you click "capture current layout", your current keyboard layout is saved,
and that will be the layout that is used when you are in Vim normal or visual mode.
When you enter insert mode, you will type in your actual current system layout/language.

**This feature is experimental and may have unintended side-effects relating to Obsidian or editor shortcuts.**

## Relative Line Numbers

Relative line numbers work very nicely with [this](https://github.com/nadavspi/obsidian-relative-line-numbers) Obsidian plugin (thank you @piotryordanov for bringing it to my attention!)

## Extending Vim Commands with JavaScript Snippets

The plugin allows to define Vim commands that map to JavaScript snippets, which adds exciting new possibilities to what you can achieve with Vim key bindings. **But -- this comes with a price of a security risk, and is therefore disabled by default.**

> :warning: **Security Warning**
> 
> Before using this feature, you **must be sure** that you understand its potential security implications.
>
> Running JavaScript snippets with Vim commands stored in your vault means that anyone who gains access to
> your notes can run arbitrary code inside your Obsidian app.

If you understand the risks and choose to use this feature, turn on "Support JS Commands" in the plugin settings and continue reading.

### JavaScript Command Usage

There are two ways to define JS-based commands.

#### JSCommand - JSFunction
**The `jscommand` Ex command** defines a JS function that has an `editor: Editor`, a `view: MarkdownView` and a `selection: EditorSelection` arguments (see the [Obsidian API](https://github.com/obsidianmd/obsidian-api/blob/master/obsidian.d.ts) if you're not sure what these are).
You define only the body of the function, in a single line wrapped by curly braces, e.g.:

```
jscommand { console.log(editor.getCursor()); }
```

This will immediately log your current cursor position to the developer console.
If you want, you can make this an Ex command using `exmap`:

```
exmap logCursor jscommand { console.log(editor.getCursor()); }
nmap <C-q> :logCursor<CR>
```

#### JSCommand - JSFile
Another version of the same functionality is **the `jsfile` Ex command**, which executes code from a file you give as a parameter, then appends another optional piece of code to it (e.g. in case you want to store several helper methods in a file and launch different ones as part of different commands).

The `jsfile` should be placed in your vault (alongside, e.g., your markdown files).

As above, the code running as part of `jsfile` has the arguments `editor: Editor`, `view: MarkdownView` and `selection: EditorSelection`.

Here's an example `.obsidian.vimrc` entry that maps `]]` and `[[` to jump to the next/previous Markdown heading. Note that `]]` and `[[` are already provided by default in this plugin, but this is a good example of how to use `jsfile`:

```
exmap nextHeading jsfile mdHelpers.js {jumpHeading(true)}
exmap prevHeading jsfile mdHelpers.js {jumpHeading(false)}
nmap ]] :nextHeading<CR>
nmap [[ :prevHeading<CR>
```

See [here](JsSnippets.md) for the full example, and please contribute your own!

### Custom Styles for Status Bar

You may utilize the vim mode display prompt class and the `data-vim-mode` attribute to 
add styles to the status bar prompt (e.g. assign colors for different status). You can 
also toggle the setting in settings page to also apply the display prompt class to the 
entire status bar container if you want some customizations on it.

The display prompt class: `vimrc-support-vim-mode`

The `data-vim-mode` values:

| Mode    | Data Value (`data-vim-mode`) |
| ------- | ---------------------------- |
| normal  | `normal`                     |
| insert  | `insert`                     |
| visual  | `visual`                     |
| replace | `replace`                    |

#### Powerline Styling Snippet

**Screenshots**

<img width="1470" alt="Screen Shot 2023-04-09 at 19 19 53" src="https://user-images.githubusercontent.com/11176415/230812728-731e24d3-d667-478c-831c-14e0010e7973.png">
<img width="1470" alt="Screen Shot 2023-04-09 at 19 20 09" src="https://user-images.githubusercontent.com/11176415/230812731-26ba0c02-1948-4a26-89d2-3e73a11076d1.png">
<img width="1470" alt="Screen Shot 2023-04-09 at 19 20 22" src="https://user-images.githubusercontent.com/11176415/230812734-f51a01c9-5f80-4da7-b051-04018cc805cc.png">
<img width="1470" alt="Screen Shot 2023-04-09 at 19 20 37" src="https://user-images.githubusercontent.com/11176415/230812736-6fa688db-37b9-4b70-bacb-a6553b0762cb.png">

```css
div.status-bar-item.plugin-obsidian-vimrc-support {
  /* Papercolor theme */
  --text-color-normal: #585858;
  --text-color-insert: #005f87;
  --text-color-visual: white;
  --text-color-replace: white;

  --background-color-normal: #eeeeee;
  --background-color-insert: #eeeeee;
  --background-color-visual: #d75f00;
  --background-color-replace: #d70087;
}

div.status-bar-item.plugin-obsidian-vimrc-support {
  /* 
    Move to bottom left corner and discard top/left/bottom space
    from container paddings.
   */
  order: -9999;
  margin: -4px auto -5px -5px;

  /* 
    We have the :after pseudo-element next, so padding-right
    is not needed
    */
  padding-right: 0px;
  padding-left: 1em;

  /* Use Monospace font */
  font-family: 'MesloLGM Nerd Font Mono'; /* !!! Needs to be a powerline font */
  font-weight: bold;
  font-size: 1.2em;

  /* Clear spaces made from radius borders */
  border-top-right-radius: 0px;
  border-bottom-right-radius: 0px;
}

div.status-bar-item.plugin-obsidian-vimrc-support:after {
  /* Powerline separator character */
  content: '';
  position: relative;
  font-size: 1.5rem;
  left: 0.9rem;

  /* Fine adjust the position */
  margin-top: 0.1rem;
}

/* Normal */
div.status-bar-item.vimrc-support-vim-mode[data-vim-mode="normal"]:after {
  color: var(--background-color-normal);
}
div.status-bar-item.vimrc-support-vim-mode[data-vim-mode="normal"] {
  color: var(--text-color-normal);
  background-color: var(--background-color-normal);
}

/* Insert */
div.status-bar-item.vimrc-support-vim-mode[data-vim-mode="insert"]:after {
  color: var(--background-color-insert);
}
div.status-bar-item.vimrc-support-vim-mode[data-vim-mode="insert"] {
  color: var(--text-color-insert);
  background-color: var(--background-color-insert);
}

/* Visual */
div.status-bar-item.vimrc-support-vim-mode[data-vim-mode="visual"]:after {
  color: var(--background-color-visual);
}
div.status-bar-item.vimrc-support-vim-mode[data-vim-mode="visual"] {
  color: var(--text-color-visual);
  background-color: var(--background-color-visual);
}

/* Replace */
div.status-bar-item.vimrc-support-vim-mode[data-vim-mode="replace"]:after {
  color: var(--background-color-replace);
}
div.status-bar-item.vimrc-support-vim-mode[data-vim-mode="replace"] {
  color: var(--text-color-replace);
  background-color: var(--background-color-replace);
}
```

Note that the above snippet uses powerline glygh for the triangular shape, so you need to install a [powerline font](https://github.com/powerline/fonts) to display correctly. And of course, feel free to change the CSS variables to whatever color palette you want!

## Changelog

### 0.10.2

- Fixed https://github.com/esm7/obsidian-vimrc-support/pull/246 (thanks @baodrate!)

### 0.10.1

- Fixed https://github.com/esm7/obsidian-vimrc-support/issues/231 (thanks @alythobani!)
- Fixed https://github.com/esm7/obsidian-vimrc-support/issues/232.

### 0.10.0

- Most notably, support for *many* new default mappings, see [here](https://github.com/esm7/obsidian-vimrc-support/pull/222) -- thanks @alythobani for this great contribution!
- Fixed https://github.com/esm7/obsidian-vimrc-support/issues/228.
- Added a license file, at last!


### 0.9.0

Multiple fixes and improvements, all contributed by @jiyee - thank you!

- Fixed chord and Vim mode display issues (https://github.com/esm7/obsidian-vimrc-support/issues/149).
- Added `source` command (https://github.com/esm7/obsidian-vimrc-support/issues/157)
- Fixed Normal Mode Layout is back!

### 0.8.0

- The plugin is now marked as supporting mobile; thanks @Geniucker for taking this step, testing and documenting it!
- Implemented `nunmap` and `vunmap`, which allow really nice `surround` implementation (see README). Thanks @dohsimpson!

### 0.7.3

Fixed an issue in updating the last selection variable, leading to `jsFile` receiving an incorrect argument and (thanks @zjhcn!)

### 0.7.2

Fixed the plugin breaking for some users after Obsidian's recent updates, plus some optimizations.

### 0.7.1

Fixed `jscommand` and `jsfile` broken in the latest Obsidian update.

### 0.7.0

**IMPORTANT: this version drops support for the legacy (CM5) Obsidian editor.**
If you are sticking to the legacy editor until Obsidian removes it, you cannot upgrade to this version of the plugin.

- Fixed multiple issues (like [this one](https://github.com/esm7/obsidian-vimrc-support/issues/118)) related to bad detection of the editor type.
  - They were fixed by no longer trying to detect the editor type ;) Support for the legacy editor has become clumsy and it was time to drop it.
- Support for Obsidian 0.15 multi windows (https://github.com/esm7/obsidian-vimrc-support/pull/110).

### 0.6.3

Added `selection` also to `jsfile` (thanks @twio142!)

### 0.6.2

- Fixed the default Vimrc file name not used if the setting is overriden & empty.
- Added a `selection` argument to `jscommand` (https://github.com/esm7/obsidian-vimrc-support/issues/99).

### 0.6.1

- Fixed backward selection error in `surround` (https://github.com/esm7/obsidian-vimrc-support/issues/91)

### 0.6.0

- The `surround` and `pasteinto` commands now work with the new (CM6-based) editor.
- Made the existence of the Vimrc file not required for other plugin features to work (https://github.com/esm7/obsidian-vimrc-support/issues/89)
- New exciting, but dangerous, `jscommand` and `jsfile` commands, that allow extending the plugin with JavaScript snippets.

### 0.5.2

- Fixed wrong detection of the editor (legacy vs new) on some occasions, leading to the plugin not really working in these situations.
- Fixed issues related to Vim mode display with the new editor.

### 0.5.1

- Fixed a possible exception.

### 0.5.0

Added partial support to the new (CM6-based) editor.

Personal note: the CM6 update landed while I'm going through extremely busy weeks.
I was therefore not yet able to give it the full attention it deserves, but since many users need this plugin updated, I'm releasing it in a slightly immature state.
The core functionality works, but some plugin features are not yet supported in CM6, most notably `surround` (and its derivatives) and `cmcommand`.

I'll do my best to find the time to complete the missing pieces in the next few days and handle reported issues quickly.

### 0.4.6
- Added the `cmcommand` command for executing arbitrary CodeMirror commands.

### 0.4.5
Apparently the fix in version 0.4.4 was not good enough. Hopefully we're done with this issue now.

### 0.4.4
- Fix to an error constantly displayed in the console.

### 0.4.3
- Another fix to "fixed keyboard layout in Normal mode".
- Added escape character backslash to surround command.

### 0.4.2
- Attempted fix to https://github.com/esm7/obsidian-vimrc-support/issues/42 (thanks @Andr3wD!)
- Fix to "fixed keyboard layout in Normal mode" which was often not really working.

### 0.4.1
- Small fix in `surround`.

### 0.4.0
- `surround` and `pasteinto` commands (thanks @Andr3wD!)
- Vim chord display (thanks @Andr3wD!)
- Vim mode display (thanks @Andr3wD!)
- Fixed [fold and unfold bug](https://github.com/esm7/obsidian-vimrc-support/issues/35).
- The plugin now supports maintaining a fixed keyboard layout when in normal mode, if configured to do so.

### 0.3.1

- Fixed some commands not working via `obcommand` (https://github.com/esm7/obsidian-vimrc-support/issues/32)

### 0.3.0

- Added a settings file for the Vimrc file name (thank you @SalmanAlSaigal!)
- Added the `exmap` Ex command.
- Added the `obcommand` Ex command.

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
