# Useful JS Snippets for `jscommand` and `jsfile`

In this document I will collect some of my and user-contributed ideas for how to utilize JS commands in the Vimrc plugin.

If you have interesting snippets, please contribute by opening a pull request!


## Jump to Next/Prev Markdown Header

To map `]]` and `[[` to next/prev markdown header, I use the following.

In a file I call `mdHelpers.js`, put this:

```js
// Taken from https://stackoverflow.com/questions/273789/is-there-a-version-of-javascripts-string-indexof-that-allows-for-regular-expr

function regexIndexOf(string, regex, startpos) {
    var indexOf = string.substring(startpos || 0).search(regex);
    return (indexOf >= 0) ? (indexOf + (startpos || 0)) : indexOf;
}

function regexLastIndexOf(string, regex, startpos) {
    regex = (regex.global) ? regex : new RegExp(regex.source, "g" + (regex.ignoreCase ? "i" : "") + (regex.multiLine ? "m" : ""));
    if(typeof (startpos) == "undefined") {
        startpos = string.length;
    } else if(startpos < 0) {
        startpos = 0;
    }
    var stringToWorkWith = string.substring(0, startpos + 1);
    var lastIndexOf = -1;
    var nextStop = 0;
    while((result = regex.exec(stringToWorkWith)) != null) {
        lastIndexOf = result.index;
        regex.lastIndex = ++nextStop;
    }
    return lastIndexOf;
}

function jumpHeading(isForward) {
	const editor = view.editor;
	let posToSearchFrom = editor.getCursor();
	posToSearchFrom.line += isForward ? 1 : -1;
	const cursorOffset = editor.posToOffset(posToSearchFrom);
	const lookupToUse = isForward ? regexIndexOf : regexLastIndexOf;
	let headingOffset = lookupToUse(editor.getValue(), /^#(#*) /gm, cursorOffset);
	// If not found from the cursor position, try again from the document beginning (or reverse beginning)
	if (headingOffset === -1)
		headingOffset = lookupToUse(editor.getValue(), /^#(#*) /gm);
	const newPos = editor.offsetToPos(headingOffset);
	editor.setCursor(newPos);
}
```

Then in your `.obsidian.vimrc` file add the following:

```
exmap nextHeading jsfile mdHelpers.js {jumpHeading(true)}
exmap prevHeading jsfile mdHelpers.js {jumpHeading(false)}
nmap ]] :nextHeading
nmap [[ :prevHeading
```

## Vimwiki-like link navigation

This snippet allows to navigate next/previous links with Tab/Shift+Tab.

It mimicks the behaviour of vimwiki keybindings where you would press Tab several times to get to the link you want.

Append this function to the file mentioned above (after jumpHeading).

```js
function jumpNextLink(isForward) {
	const editor = view.editor;
	let posToSearchFrom = editor.getCursor();
	posToSearchFrom.line += isForward ? 0 : -1;
	const cursorOffset = editor.posToOffset(posToSearchFrom);
	const lookupToUse = isForward ? regexIndexOf : regexLastIndexOf;
	let headingOffset = lookupToUse(editor.getValue(), /\[\[/g, cursorOffset);
	// If not found from the cursor position, try again from the document beginning (or reverse beginning)
	if (headingOffset === -1)
		headingOffset = lookupToUse(editor.getValue(), /\[\[/g);
	const newPos = editor.offsetToPos(headingOffset+2);
	editor.setCursor(newPos);
}
```

Then put these lines in vimrc file to set the keybindings. Optionally (as in vimwiki) you can have ENTER bound to follow the link.

```
exmap nextLink jsfile mdHelpers.js {jumpNextLink(true)}
exmap prevLink jsfile mdHelpers.js {jumpNextLink(false)}
nmap <Tab> :nextLink
nmap <S-Tab> :prevLink

exmap followlink obcommand editor:follow-link
nmap <CR> :followlink
```
