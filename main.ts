import * as keyFromAccelerator from 'keyboardevent-from-electron-accelerator';
import { App, EditorSelection, MarkdownView, Notice, Editor as ObsidianEditor, Plugin, PluginSettingTab, Setting } from 'obsidian';

import { followLinkUnderCursor } from './actions/followLinkUnderCursor';
import { moveDownSkippingFolds, moveUpSkippingFolds } from './actions/moveSkippingFolds';
import { jumpToNextHeading, jumpToPreviousHeading } from './motions/jumpToHeading';
import { jumpToNextLink, jumpToPreviousLink } from './motions/jumpToLink';
import { defineAndMapObsidianVimAction, defineAndMapObsidianVimMotion } from './utils/obsidianVimCommand';
import { VimApi } from './utils/vimApi';

declare const CodeMirror: any;

const enum vimStatus {
	normal = 'normal',
	insert = 'insert',
	visual = 'visual',
	replace = 'replace',
}
type VimStatusPrompt = string;
type VimStatusPromptMap = {
	[status in vimStatus]: VimStatusPrompt;
};

interface Settings {
	vimrcFileName: string,
	displayChord: boolean,
	displayVimMode: boolean,
	fixedNormalModeLayout: boolean,
	capturedKeyboardMap: Record<string, string>,
	supportJsCommands?: boolean
	vimStatusPromptMap: VimStatusPromptMap;
}

const DEFAULT_SETTINGS: Settings = {
	vimrcFileName: ".obsidian.vimrc",
	displayChord: false,
	displayVimMode: false,
	fixedNormalModeLayout: false,
	capturedKeyboardMap: {},
	supportJsCommands: false,
	vimStatusPromptMap: {
		normal: '🟢',
		insert: '🟠',
		visual: '🟡',
		replace: '🔴',
	},
}

const vimStatusPromptClass = "vimrc-support-vim-mode";

// NOTE: to future maintainers, please make sure all mapping commands are included in this array.
const mappingCommands: String[] = [
	"map",
	"nmap",
	"noremap",
	"iunmap",
	"nunmap",
	"vunmap",
]

function sleep(ms: number) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

export default class VimrcPlugin extends Plugin {
	settings: Settings;

	private codeMirrorVimObject: any = null;
	private initialized = false;

	private lastYankBuffer: string[] = [""];
	private lastSystemClipboard = "";
	private yankToSystemClipboard: boolean = false;
	private registeredYankEventsWindows: Set<Window> = new Set();
	private currentKeyChord: any = [];
	private vimChordStatusBar: HTMLElement = null;
	private vimStatusBar: HTMLElement = null;
	private currentVimStatus: vimStatus = vimStatus.normal;
	private customVimKeybinds: { [name: string]: boolean } = {};
	private currentSelection: [EditorSelection] = null;
	private isInsertMode: boolean = false;

	updateVimStatusBar() {
		this.vimStatusBar.setText(
			this.settings.vimStatusPromptMap[this.currentVimStatus]
		);
		this.vimStatusBar.dataset.vimMode = this.currentVimStatus;
	}

	async captureKeyboardLayout() {
		// This is experimental API and it might break at some point:
		// https://developer.mozilla.org/en-US/docs/Web/API/KeyboardLayoutMap
		let keyMap: Record<string, string> = {};
		let layout = await (navigator as any).keyboard.getLayoutMap();
		let doneIterating = new Promise<void>((resolve, reject) => {
			let counted = 0;
			layout.forEach((value: any, index: any) => {
				keyMap[index] = value;
				counted += 1;
				if (counted === layout.size)
					resolve();
			});
		});
		await doneIterating;
		new Notice('Keyboard layout captured');
		return keyMap;
	}

	async initialize() {
		if (this.initialized)
			return;

		this.codeMirrorVimObject = (window as any).CodeMirrorAdapter?.Vim;

		this.registerYankEvents(activeWindow);
		this.app.workspace.on("window-open", (workspaceWindow, w) => {
			this.registerYankEvents(w);
		})
		this.app.workspace.on("window-close", (workspaceWindow, w) => {
			this.registeredYankEventsWindows.delete(w);
		})

		this.prepareChordDisplay();
		this.prepareVimModeDisplay();

		// Two events cos
		// this don't trigger on loading/reloading obsidian with note opened
		this.app.workspace.on("active-leaf-change", async () => {
			this.updateSelectionEvent();
			this.updateVimEvents();
			this.registerYankEvents(activeWindow);
		});
		// and this don't trigger on opening same file in new pane
		this.app.workspace.on("file-open", async () => {
			this.updateSelectionEvent();
			this.updateVimEvents();
		});

		this.initialized = true;
	}

	registerYankEvents(win: Window) {
		if (this.registeredYankEventsWindows.has(win))
			return;
		this.registerDomEvent(win.document, 'click', () => {
			this.captureYankBuffer(win);
		});
		this.registerDomEvent(win.document, 'keyup', () => {
			this.captureYankBuffer(win);
		});
		this.registerDomEvent(win.document, 'focusin', () => {
			this.captureYankBuffer(win);
		})
		this.registeredYankEventsWindows.add(win)
	}

	async updateSelectionEvent() {
		const view = this.getActiveView();
		if (!view) return;

		let cm = this.getCodeMirror(view);
		if (!cm) return;
		if (
			this.getCursorActivityHandlers(cm).some(
				(e: { name: string }) => e.name === "updateSelection")
		) return;
		cm.on("cursorActivity", async (cm: CodeMirror.Editor) => this.updateSelection(cm));
	}

	async updateSelection(cm: any) {
		this.currentSelection = cm.listSelections();
	}

	private getCursorActivityHandlers(cm: CodeMirror.Editor) {
		return (cm as any)._handlers.cursorActivity;
	}

	async updateVimEvents() {
		if (!(this.app as Any).isVimEnabled())
			return;
		let view = this.getActiveView();
		if (view) {
			const cmEditor = this.getCodeMirror(view);

			// See https://codemirror.net/doc/manual.html#vimapi_events for events.
			this.isInsertMode = false;
			this.currentVimStatus = vimStatus.normal;
			if (this.settings.displayVimMode)
				this.updateVimStatusBar();

			if (!cmEditor) return;
			cmEditor.off('vim-mode-change', this.logVimModeChange);
			cmEditor.on('vim-mode-change', this.logVimModeChange);

			this.currentKeyChord = [];
			cmEditor.off('vim-keypress', this.onVimKeypress);
			cmEditor.on('vim-keypress', this.onVimKeypress);
			cmEditor.off('vim-command-done', this.onVimCommandDone);
			cmEditor.on('vim-command-done', this.onVimCommandDone);
			CodeMirror.off(cmEditor.getInputField(), 'keydown', this.onKeydown);
			CodeMirror.on(cmEditor.getInputField(), 'keydown', this.onKeydown);
		}
	}

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new SettingsTab(this.app, this))

		console.log('loading Vimrc plugin');

		this.app.workspace.on('active-leaf-change', async () => {
			if (!this.initialized)
				await this.initialize();
			if (this.codeMirrorVimObject.loadedVimrc)
				return;
			let fileName = this.settings.vimrcFileName;
			if (!fileName || fileName.trim().length === 0) {
				fileName = DEFAULT_SETTINGS.vimrcFileName;
				console.log('Configured Vimrc file name is illegal, falling-back to default');
			}
			let vimrcContent = '';
			try {
				vimrcContent = await this.app.vault.adapter.read(fileName);
			} catch (e) {
				console.log('Error loading vimrc file', fileName, 'from the vault root', e.message)
			}
			this.readVimInit(vimrcContent);
		});
	}

	async loadSettings() {
		const data = await this.loadData();
		this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	logVimModeChange = async (cm: any) => {
		if (!cm) return;
		this.isInsertMode = cm.mode === 'insert';
		switch (cm.mode) {
			case "insert":
				this.currentVimStatus = vimStatus.insert;
				break;
			case "normal":
				this.currentVimStatus = vimStatus.normal;
				break;
			case "visual":
				this.currentVimStatus = vimStatus.visual;
				break;
			case "replace":
				this.currentVimStatus = vimStatus.replace;
				break;
			default:
				break;
		}
		if (this.settings.displayVimMode)
			this.updateVimStatusBar();
	}

	onunload() {
		console.log('unloading Vimrc plugin (but Vim commands that were already loaded will still work)');
	}

	private getActiveView(): MarkdownView {
		return this.app.workspace.getActiveViewOfType(MarkdownView);
	}

	getActiveObsidianEditor(): ObsidianEditor {
		return this.getActiveView().editor;
	}

	private getCodeMirror(view: MarkdownView): CodeMirror.Editor {
		return (view as any).editMode?.editor?.cm?.cm;
	}

	readVimInit(vimCommands: string) {
		let view = this.getActiveView();
		if (view) {
			var cmEditor = this.getCodeMirror(view);
			if (cmEditor && !this.codeMirrorVimObject.loadedVimrc) {
				this.defineBasicCommands(this.codeMirrorVimObject);
				this.defineAndMapObsidianVimCommands(this.codeMirrorVimObject);
				this.defineSendKeys(this.codeMirrorVimObject);
				this.defineObCommand(this.codeMirrorVimObject);
				this.defineSurround(this.codeMirrorVimObject);
				this.defineJsCommand(this.codeMirrorVimObject);
				this.defineJsFile(this.codeMirrorVimObject);
				this.defineSource(this.codeMirrorVimObject);

				this.loadVimCommands(vimCommands);

				// Make sure that we load it just once per CodeMirror instance.
				// This is supposed to work because the Vim state is kept at the keymap level, hopefully
				// there will not be bugs caused by operations that are kept at the object level instead
				this.codeMirrorVimObject.loadedVimrc = true;
			}

			if (cmEditor) {
				cmEditor.off('vim-mode-change', this.logVimModeChange);
				cmEditor.on('vim-mode-change', this.logVimModeChange);
				CodeMirror.off(cmEditor.getInputField(), 'keydown', this.onKeydown);
				CodeMirror.on(cmEditor.getInputField(), 'keydown', this.onKeydown);
			}
		}
	}

	loadVimCommands(vimCommands: string) {
		let view = this.getActiveView();
		if (view) {
			var cmEditor = this.getCodeMirror(view);

			vimCommands.split("\n").forEach(
				function (line: string, index: number, arr: [string]) {
					if (line.trim().length > 0 && line.trim()[0] != '"') {
						let split = line.split(" ")
						if (mappingCommands.includes(split[0])) {
							// Have to do this because "vim-command-done" event doesn't actually work properly, or something.
							this.customVimKeybinds[split[1]] = true
						}
						this.codeMirrorVimObject.handleEx(cmEditor, line);
					}
				}.bind(this) // Faster than an arrow function. https://stackoverflow.com/questions/50375440/binding-vs-arrow-function-for-react-onclick-event
			)
		}
	}

	defineBasicCommands(vimObject: any) {
		vimObject.defineOption('clipboard', '', 'string', ['clip'], (value: string, cm: any) => {
			if (value) {
				if (value.trim() == 'unnamed' || value.trim() == 'unnamedplus') {
					if (!this.yankToSystemClipboard) {
						this.yankToSystemClipboard = true;
						console.log("Vim is now set to yank to system clipboard.");
					}
				} else {
					throw new Error("Unrecognized clipboard option, supported are 'unnamed' and 'unnamedplus' (and they do the same)")
				}
			}
		});

		vimObject.defineOption('tabstop', 4, 'number', [], (value: number, cm: any) => {
			if (value && cm) {
				cm.setOption('tabSize', value);
			}
		});

		vimObject.defineEx('iunmap', '', (cm: any, params: any) => {
			if (params.argString.trim()) {
				this.codeMirrorVimObject.unmap(params.argString.trim(), 'insert');
			}
		});

		vimObject.defineEx('nunmap', '', (cm: any, params: any) => {
			if (params.argString.trim()) {
				this.codeMirrorVimObject.unmap(params.argString.trim(), 'normal');
			}
		});

		vimObject.defineEx('vunmap', '', (cm: any, params: any) => {
			if (params.argString.trim()) {
				this.codeMirrorVimObject.unmap(params.argString.trim(), 'visual');
			}
		});

		vimObject.defineEx('noremap', '', (cm: any, params: any) => {
			if (!params?.args?.length) {
				throw new Error('Invalid mapping: noremap');
			}

			if (params.argString.trim()) {
				this.codeMirrorVimObject.noremap.apply(this.codeMirrorVimObject, params.args);
			}
		});

		// Allow the user to register an Ex command
		vimObject.defineEx('exmap', '', (cm: any, params: any) => {
			if (params?.args?.length && params.args.length < 2) {
				throw new Error(`exmap requires at least 2 parameters: [name] [actions...]`);
			}
			let commandName = params.args[0];
			params.args.shift();
			let commandContent = params.args.join(' ');
			// The content of the user's Ex command is just the remaining parameters of the exmap command
			this.codeMirrorVimObject.defineEx(commandName, '', (cm: any, params: any) => {
				this.codeMirrorVimObject.handleEx(cm, commandContent);
			});
		});
	}

  defineAndMapObsidianVimCommands(vimObject: VimApi) {
		defineAndMapObsidianVimMotion(vimObject, jumpToNextHeading, ']]');
		defineAndMapObsidianVimMotion(vimObject, jumpToPreviousHeading, '[[');
		defineAndMapObsidianVimMotion(vimObject, jumpToNextLink, 'gl');
		defineAndMapObsidianVimMotion(vimObject, jumpToPreviousLink, 'gL');

		defineAndMapObsidianVimAction(vimObject, this, moveDownSkippingFolds, 'zj');
		defineAndMapObsidianVimAction(vimObject, this, moveUpSkippingFolds, 'zk');
		defineAndMapObsidianVimAction(vimObject, this, followLinkUnderCursor, 'gf');
  }

	defineSendKeys(vimObject: any) {
		vimObject.defineEx('sendkeys', '', async (cm: any, params: any) => {
			if (!params?.args?.length) {
				console.log(params);
				throw new Error(`The sendkeys command requires a list of keys, e.g. sendKeys Ctrl+p a b Enter`);
			}

			let allGood = true;
			let events: KeyboardEvent[] = [];
			for (const key of params.args) {
				if (key.startsWith('wait')) {
					const delay = key.slice(4);
					await sleep(delay * 1000);
				}
				else {
					let keyEvent: KeyboardEvent = null;
					try {
						keyEvent = new KeyboardEvent('keydown', keyFromAccelerator.toKeyEvent(key));
						events.push(keyEvent);
					}
					catch (e) {
						allGood = false;
						throw new Error(`Key '${key}' couldn't be read as an Electron Accelerator`);
					}
					if (allGood) {
						for (keyEvent of events)
							window.postMessage(JSON.parse(JSON.stringify(keyEvent)), '*');
						// view.containerEl.dispatchEvent(keyEvent);
					}
				}
			}
		});
	}

	executeObsidianCommand(commandName: string) {
		const availableCommands = (this.app as any).commands.commands;
		if (!(commandName in availableCommands)) {
			throw new Error(`Command ${commandName} was not found, try 'obcommand' with no params to see in the developer console what's available`);
		}
		const view = this.getActiveView();
		const editor = view.editor;
		const command = availableCommands[commandName];
		const {callback, checkCallback, editorCallback, editorCheckCallback} = command;
		if (editorCheckCallback)
			editorCheckCallback(false, editor, view);
		else if (editorCallback)
			editorCallback(editor, view);
		else if (checkCallback)
			checkCallback(false);
		else if (callback)
			callback();
		else
			throw new Error(`Command ${commandName} doesn't have an Obsidian callback`);
	}

	defineObCommand(vimObject: any) {
		vimObject.defineEx('obcommand', '', async (cm: any, params: any) => {
			if (!params?.args?.length || params.args.length != 1) {
				const availableCommands = (this.app as any).commands.commands;
				console.log(`Available commands: ${Object.keys(availableCommands).join('\n')}`)
				throw new Error(`obcommand requires exactly 1 parameter`);
			}
			const commandName = params.args[0];
			this.executeObsidianCommand(commandName);
		});
	}

	defineSurround(vimObject: any) {
		// Function to surround selected text or highlighted word.
		var surroundFunc = (params: string[]) => {
			var editor = this.getActiveView().editor;
			if (!params?.length) {
				throw new Error("surround requires exactly 2 parameters: prefix and postfix text.");
			}
			let newArgs = params.join(" ").match(/(\\.|[^\s\\\\]+)+/g);
			if (newArgs.length != 2) {
				throw new Error("surround requires exactly 2 parameters: prefix and postfix text.");
			}

			let beginning = newArgs[0].replace("\\\\", "\\").replace("\\ ", " "); // Get the beginning surround text
			let ending = newArgs[1].replace("\\\\", "\\").replace("\\ ", " "); // Get the ending surround text

            let currentSelections = this.currentSelection;
			var chosenSelection = currentSelections?.[0] ? currentSelections[0] : {anchor: editor.getCursor(), head: editor.getCursor()};
			if (currentSelections?.length > 1) {
				console.log("WARNING: Multiple selections in surround. Attempt to select matching cursor. (obsidian-vimrc-support)")
				const cursorPos = editor.getCursor();
				for (const selection of currentSelections) {
					if (selection.head.line == cursorPos.line && selection.head.ch == cursorPos.ch) {
						console.log("RESOLVED: Selection matching cursor found. (obsidian-vimrc-support)")
						chosenSelection = selection;
						break;
					}
				}
			}
			if (editor.posToOffset(chosenSelection.anchor) === editor.posToOffset(chosenSelection.head)) {
				// No range of selected text, so select word.
				let wordAt = editor.wordAt(chosenSelection.head);
				if (wordAt) {
					chosenSelection = {anchor: wordAt.from, head: wordAt.to};
				}
			}
			if (editor.posToOffset(chosenSelection.anchor) > editor.posToOffset(chosenSelection.head)) {
				[chosenSelection.anchor, chosenSelection.head] = [chosenSelection.head, chosenSelection.anchor];
			}
			let currText = editor.getRange(chosenSelection.anchor, chosenSelection.head);
			editor.replaceRange(beginning + currText + ending, chosenSelection.anchor, chosenSelection.head);
			// If no selection, place cursor between beginning and ending
			if (editor.posToOffset(chosenSelection.anchor) === editor.posToOffset(chosenSelection.head)) {
				chosenSelection.head.ch += beginning.length;
				editor.setCursor(chosenSelection.head);
			}
		}

		vimObject.defineEx("surround", "", (cm: any, params: any) => { surroundFunc(params.args); });

		vimObject.defineEx("pasteinto", "", (cm: any, params: any) => {
			// Using the register for when this.yankToSystemClipboard == false
			surroundFunc(
				['[',
				 '](' + vimObject.getRegisterController().getRegister('yank').keyBuffer + ")"]);
		})

		var editor = this.getActiveView().editor;
		// Handle the surround dialog input
		var surroundDialogCallback = (value: string) => {
			if ((/^\[+$/).test(value)) { // check for 1-inf [ and match them with ]
				surroundFunc([value, "]".repeat(value.length)])
			} else if ((/^\(+$/).test(value)) { // check for 1-inf ( and match them with )
				surroundFunc([value, ")".repeat(value.length)])
			} else if ((/^\{+$/).test(value)) { // check for 1-inf { and match them with }
				surroundFunc([value, "}".repeat(value.length)])
			} else { // Else, just put it before and after.
				surroundFunc([value, value])
			}
		}

		vimObject.defineOperator("surroundOperator", () => {
			let p = "<span>Surround with: <input type='text'></span>"
			CodeMirror.openDialog(p, surroundDialogCallback, { bottom: true, selectValueOnOpen: false })
		})


		vimObject.mapCommand("<A-y>s", "operator", "surroundOperator")

	}

	async captureYankBuffer(win: Window) {
		if (!this.yankToSystemClipboard) {
			return
		}

		const yankRegister = this.codeMirrorVimObject.getRegisterController().getRegister('yank');
		const currentYankBuffer = yankRegister.keyBuffer;

		// yank -> clipboard
		const buf = currentYankBuffer[0]
		if (buf !== this.lastYankBuffer[0]) {
			await win.navigator.clipboard.writeText(buf);
			this.lastYankBuffer = currentYankBuffer;
			this.lastSystemClipboard = await win.navigator.clipboard.readText();
			return
		}

		// clipboard -> yank
		try {
			const currentClipboardText = await win.navigator.clipboard.readText();
			if (currentClipboardText !== this.lastSystemClipboard) {
				yankRegister.setText(currentClipboardText);
				this.lastYankBuffer = yankRegister.keyBuffer;
				this.lastSystemClipboard = currentClipboardText;
			}
		} catch (e) {
			// XXX: Avoid "Uncaught (in promise) DOMException: Document is not focused."
			// XXX: It is not good but easy workaround
		}
	}

	prepareChordDisplay() {
		if (this.settings.displayChord) {
			// Add status bar item
			this.vimChordStatusBar = this.addStatusBarItem();

			// Move vimChordStatusBar to the leftmost position and center it.
			let parent = this.vimChordStatusBar.parentElement;
			this.vimChordStatusBar.parentElement.insertBefore(this.vimChordStatusBar, parent.firstChild);
			this.vimChordStatusBar.style.marginRight = "auto";

			const view = this.getActiveView();
			if (!view) return;
			let cmEditor = this.getCodeMirror(view);
			// See https://codemirror.net/doc/manual.html#vimapi_events for events.
			cmEditor.off('vim-keypress', this.onVimKeypress);
			cmEditor.on('vim-keypress', this.onVimKeypress);
			cmEditor.off('vim-command-done', this.onVimCommandDone);
			cmEditor.on('vim-command-done', this.onVimCommandDone);
		}
	}

	onVimKeypress = async (vimKey: any) => {
		if (vimKey != "<Esc>") { // TODO figure out what to actually look for to exit commands.
			this.currentKeyChord.push(vimKey);
			if (this.customVimKeybinds[this.currentKeyChord.join("")] != undefined) { // Custom key chord exists.
				this.currentKeyChord = [];
			}
		} else {
			this.currentKeyChord = [];
		}

		// Build keychord text
		let tempS = "";
		for (const s of this.currentKeyChord) {
			tempS += " " + s;
		}
		if (tempS != "") {
			tempS += "-";
		}
		this.vimChordStatusBar?.setText(tempS);
	}

	onVimCommandDone = async (reason: any) => {
		this.vimChordStatusBar?.setText("");
		this.currentKeyChord = [];
	}

	prepareVimModeDisplay() {
		if (this.settings.displayVimMode) {
			this.vimStatusBar = this.addStatusBarItem() // Add status bar item
			this.vimStatusBar.setText(
				this.settings.vimStatusPromptMap[vimStatus.normal]
			); // Init the vimStatusBar with normal mode
			this.vimStatusBar.addClass(vimStatusPromptClass);
			this.vimStatusBar.dataset.vimMode = this.currentVimStatus;
		}
	}

	onKeydown = (ev: KeyboardEvent) => {
		if (this.settings.fixedNormalModeLayout) {
			const keyMap = this.settings.capturedKeyboardMap;
			if (!this.isInsertMode && !ev.shiftKey &&
				ev.code in keyMap && ev.key != keyMap[ev.code]) {
				let view = this.getActiveView();
				if (view) {
					const cmEditor = this.getCodeMirror(view);
					if (cmEditor) {
						this.codeMirrorVimObject.handleKey(cmEditor, keyMap[ev.code], 'mapping');
					}
				}
			ev.preventDefault();
			return false;
			}
		}
	}

	defineJsCommand(vimObject: any) {
		vimObject.defineEx('jscommand', '', (cm: any, params: any) => {
			if (!this.settings.supportJsCommands)
				throw new Error("JS commands are turned off; enable them via the Vimrc plugin configuration if you're sure you know what you're doing");
			const jsCode = params.argString.trim() as string;
			if (jsCode[0] != '{' || jsCode[jsCode.length - 1] != '}')
				throw new Error("Expected an argument which is JS code surrounded by curly brackets: {...}");
			let currentSelections = this.currentSelection;
			var chosenSelection = currentSelections && currentSelections.length > 0 ? currentSelections[0] : null;
			const command = Function('editor', 'view', 'selection', jsCode);
			const view = this.getActiveView();
			command(view.editor, view, chosenSelection);
		});
	}

	defineJsFile(vimObject: any) {
		vimObject.defineEx('jsfile', '', async (cm: any, params: any) => {
			if (!this.settings.supportJsCommands)
				throw new Error("JS commands are turned off; enable them via the Vimrc plugin configuration if you're sure you know what you're doing");
			if (params?.args?.length < 1)
				throw new Error("Expected format: fileName {extraCode}");
			let extraCode = '';
			const fileName = params.args[0];
			if (params.args.length > 1) {
				params.args.shift();
				extraCode = params.args.join(' ').trim() as string;
				if (extraCode[0] != '{' || extraCode[extraCode.length - 1] != '}')
					throw new Error("Expected an extra code argument which is JS code surrounded by curly brackets: {...}");
			}
			let currentSelections = this.currentSelection;
			var chosenSelection = currentSelections && currentSelections.length > 0 ? currentSelections[0] : null;
			let content = '';
			try {
				content = await this.app.vault.adapter.read(fileName);
			} catch (e) {
				throw new Error(`Cannot read file ${params.args[0]} from vault root: ${e.message}`);
			}
			const command = Function('editor', 'view', 'selection', content + extraCode);
			const view = this.getActiveView();
			command(view.editor, view, chosenSelection);
		});
	}

	defineSource(vimObject: any) {
		vimObject.defineEx('source', '', async (cm: any, params: any) => {
			if (params?.args?.length > 1)
				throw new Error("Expected format: source [fileName]");
			const fileName = params.argString.trim();
			try {
				this.app.vault.adapter.read(fileName).then(vimrcContent => {
					this.loadVimCommands(vimrcContent);
				});
			} catch (e) {
				console.log('Error loading vimrc file', fileName, 'from the vault root', e.message)
			}
		});
	}

}

class SettingsTab extends PluginSettingTab {
	plugin: VimrcPlugin;

	constructor(app: App, plugin: VimrcPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		let { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Vimrc Settings' });

		new Setting(containerEl)
			.setName('Vimrc file name')
			.setDesc('Relative to vault directory (requires restart)')
			.addText((text) => {
				text.setPlaceholder(DEFAULT_SETTINGS.vimrcFileName);
				text.setValue(this.plugin.settings.vimrcFileName || DEFAULT_SETTINGS.vimrcFileName);
				text.onChange(value => {
					this.plugin.settings.vimrcFileName = value;
					this.plugin.saveSettings();
				})
			});

		new Setting(containerEl)
			.setName('Vim chord display')
			.setDesc('Displays the current chord until completion. Ex: "<Space> f-" (requires restart)')
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.displayChord || DEFAULT_SETTINGS.displayChord);
				toggle.onChange(value => {
					this.plugin.settings.displayChord = value;
					this.plugin.saveSettings();
				})
			});

		new Setting(containerEl)
			.setName('Vim mode display')
			.setDesc('Displays the current vim mode (requires restart)')
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.displayVimMode || DEFAULT_SETTINGS.displayVimMode);
				toggle.onChange(value => {
					this.plugin.settings.displayVimMode = value;
					this.plugin.saveSettings();
				})
			});

		new Setting(containerEl)
			.setName('Use a fixed keyboard layout for Normal mode')
			.setDesc('Define a keyboard layout to always use when in Normal mode, regardless of the input language (experimental).')
			.addButton(async (button) => {
				button.setButtonText('Capture current layout');
				button.onClick(async () => {
					this.plugin.settings.capturedKeyboardMap = await this.plugin.captureKeyboardLayout();
					this.plugin.saveSettings();
				});
			})
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.fixedNormalModeLayout || DEFAULT_SETTINGS.fixedNormalModeLayout);
				toggle.onChange(async value => {
					this.plugin.settings.fixedNormalModeLayout = value;
					if (value && Object.keys(this.plugin.settings.capturedKeyboardMap).length === 0)
						this.plugin.settings.capturedKeyboardMap = await this.plugin.captureKeyboardLayout();
					this.plugin.saveSettings();
				});
			})

		new Setting(containerEl)
			.setName('Support JS commands (beware!)')
			.setDesc("Support the 'jscommand' and 'jsfile' commands, which allow defining Ex commands using Javascript. WARNING! Review the README to understand why this may be dangerous before enabling.")
			.addToggle(toggle => {
				toggle.setValue(this.plugin.settings.supportJsCommands ?? DEFAULT_SETTINGS.supportJsCommands);
				toggle.onChange(value => {
					this.plugin.settings.supportJsCommands = value;
					this.plugin.saveSettings();
				})
			});

		containerEl.createEl('h2', {text: 'Vim Mode Display Prompt'});

		new Setting(containerEl)
			.setName('Normal mode prompt')
			.setDesc('Set the status prompt text for normal mode.')
			.addText((text) => {
				text.setPlaceholder('Default: 🟢');
				text.setValue(
					this.plugin.settings.vimStatusPromptMap.normal ||
						DEFAULT_SETTINGS.vimStatusPromptMap.normal
				);
				text.onChange((value) => {
					this.plugin.settings.vimStatusPromptMap.normal = value ||
						DEFAULT_SETTINGS.vimStatusPromptMap.normal;
					this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('Insert mode prompt')
			.setDesc('Set the status prompt text for insert mode.')
			.addText((text) => {
				text.setPlaceholder('Default: 🟠');
				text.setValue(
					this.plugin.settings.vimStatusPromptMap.insert ||
						DEFAULT_SETTINGS.vimStatusPromptMap.insert
				);
				text.onChange((value) => {
					this.plugin.settings.vimStatusPromptMap.insert = value ||
						DEFAULT_SETTINGS.vimStatusPromptMap.insert;
					console.log(this.plugin.settings.vimStatusPromptMap);
					this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('Visual mode prompt')
			.setDesc('Set the status prompt text for visual mode.')
			.addText((text) => {
				text.setPlaceholder('Default: 🟡');
				text.setValue(
					this.plugin.settings.vimStatusPromptMap.visual ||
						DEFAULT_SETTINGS.vimStatusPromptMap.visual
				);
				text.onChange((value) => {
					this.plugin.settings.vimStatusPromptMap.visual = value ||
						DEFAULT_SETTINGS.vimStatusPromptMap.visual;
					this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('Replace mode prompt')
			.setDesc('Set the status prompt text for replace mode.')
			.addText((text) => {
				text.setPlaceholder('Default: 🔴');
				text.setValue(
					this.plugin.settings.vimStatusPromptMap.replace ||
						DEFAULT_SETTINGS.vimStatusPromptMap.replace
				);
				text.onChange((value) => {
					this.plugin.settings.vimStatusPromptMap.replace = value ||
						DEFAULT_SETTINGS.vimStatusPromptMap.replace;
					this.plugin.saveSettings();
				});
			});
	}
}
