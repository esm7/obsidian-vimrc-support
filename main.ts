import { App, Plugin, TFile, MarkdownView, PluginSettingTab, Setting } from 'obsidian';
import * as keyFromAccelerator from 'keyboardevent-from-electron-accelerator';

declare const CodeMirror: any;

interface Settings {
	vimrcFileName: string
}

const DEFAULT_SETTINGS: Settings = {
	vimrcFileName: ".obsidian.vimrc"
}

function sleep(ms: number) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

export default class VimrcPlugin extends Plugin {
	settings: Settings;

	private lastYankBuffer = new Array<string>(0);
	private lastSystemClipboard = "";
	private yankToSystemClipboard: boolean = false;

	async onload() {
		console.log('loading Vimrc plugin');

		await this.loadSettings();
		this.addSettingTab(new SettingsTab(this.app, this))

		this.registerEvent(this.app.workspace.on('file-open', (file: TFile) => {
			const VIMRC_FILE_NAME = this.settings.vimrcFileName;
			this.app.vault.adapter.read(VIMRC_FILE_NAME).
				then((lines) => this.readVimInit(lines)).
				catch(error => { console.log('Error loading vimrc file', VIMRC_FILE_NAME, 'from the vault root') });
		}));

		this.registerDomEvent(document, 'click', () => {
			this.captureYankBuffer();
		});
		this.registerDomEvent(document, 'keyup', () => {
			this.captureYankBuffer();
		});
		this.registerDomEvent(document, 'focusin', () => {
			this.captureYankBuffer();
		})
	}

	async loadSettings() {
		const data = await this.loadData();
		this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	onunload() {
		console.log('unloading Vimrc plugin (but Vim commands that were already loaded will still work)');
	}

	readVimInit(vimCommands: string) {
		var view = this.app.workspace.activeLeaf.view;
		if (view.getViewType() == 'markdown') {
			var markdownView = view as MarkdownView;
			var cmEditor = markdownView.sourceMode.cmEditor;
			if (cmEditor && !CodeMirror.Vim.loadedVimrc) {
				CodeMirror.Vim.defineOption('clipboard', '', 'string', ['clip'], (value: string, cm: any) => {
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
				CodeMirror.Vim.defineOption('tabstop', 4, 'number', [], (value: number, cm: any) => {
					if (value) {
						cmEditor.setOption('tabSize', value);
					}
				});

				CodeMirror.Vim.defineEx('iunmap', '', (cm: any, params: any) => {
					if (params.argString.trim()) {
						CodeMirror.Vim.unmap(params.argString.trim(), 'insert');
					}
				});

				CodeMirror.Vim.defineEx('noremap', '', (cm: any, params: any) => {
					if (!params?.args?.length) {
						throw new Error('Invalid mapping: noremap');
					}
				
					if (params.argString.trim()) {
						CodeMirror.Vim.noremap.apply(CodeMirror.Vim, params.args);
					}
				});

				// Allow the user to register an Ex command
				CodeMirror.Vim.defineEx('exmap', '', (cm: any, params: any) => {
					if (params?.args?.length && params.args.length < 2) {
						throw new Error(`exmap requires at least 2 parameters: [name] [actions...]`);
					}
					let commandName = params.args[0];
					params.args.shift();
					let commandContent = params.args.join(' ');
					// The content of the user's Ex command is just the remaining parameters of the exmap command
					CodeMirror.Vim.defineEx(commandName, '', (cm: any, params: any) => {
						CodeMirror.Vim.handleEx(cm, commandContent);
					});
				});
				
				CodeMirror.Vim.defineEx('sendkeys', '', async (cm: any, params: any) => {
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

				CodeMirror.Vim.defineEx('obcommand', '', async (cm: any, params: any) => {
					const availableCommands = (this.app as any).commands.commands;
					if (!params?.args?.length || params.args.length != 1) {
						console.log(`Available commands: ${Object.keys(availableCommands).join('\n')}`)
						throw new Error(`obcommand requires exactly 1 parameter`);
					}
					const command = params.args[0];
					if (command in availableCommands) {
						let callback = availableCommands[command].callback;
						let checkCallback = availableCommands[command].checkCallback;
						let editorCallback = availableCommands[command].editorCallback;
						let editorCheckCallback = availableCommands[command].editorCheckCallback;
						if (editorCheckCallback)
							editorCheckCallback(markdownView.editor, false);
						else if (editorCallback)
							editorCallback(markdownView.editor);
						else if (checkCallback)
							checkCallback(false);
						else if (callback)
							callback();
						else
							throw new Error(`Command ${command} doesn't have an Obsidian callback`);
					} else
						throw new Error(`Command ${command} was not found, try 'obcommand' with no params to see in the developer console what's available`);
				});

				vimCommands.split("\n").forEach(
					function(line, index, arr) {
						if (line.trim().length > 0 && line.trim()[0] != '"') {
							CodeMirror.Vim.handleEx(cmEditor, line);
						}
					}
				)

				// Make sure that we load it just once per CodeMirror instance.
				// This is supposed to work because the Vim state is kept at the keymap level, hopefully
				// there will not be bugs caused by operations that are kept at the object level instead
				CodeMirror.Vim.loadedVimrc = true;
			}
		}
	}

	captureYankBuffer() {
		if (this.yankToSystemClipboard) {
			let currentBuffer = CodeMirror.Vim.getRegisterController().getRegister('yank').keyBuffer;
			if (currentBuffer != this.lastYankBuffer) {
				if (this.lastYankBuffer.length > 0 && currentBuffer.length > 0 && currentBuffer[0]) {
					navigator.clipboard.writeText(currentBuffer[0]);
					navigator.clipboard.readText().then((value) => { this.lastSystemClipboard = value; });
				}
				this.lastYankBuffer = currentBuffer;
				return;
			}
			let currentClipboard = navigator.clipboard.readText().then((value) => {
				if (value != this.lastSystemClipboard) {
					let yankRegister = CodeMirror.Vim.getRegisterController().getRegister('yank')
					yankRegister.setText(value);
					this.lastYankBuffer = yankRegister.keyBuffer;
					this.lastSystemClipboard = value;
				}
			})
		}
	}
}

class SettingsTab extends PluginSettingTab {
	plugin: VimrcPlugin;

	constructor(app: App, plugin: VimrcPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		let {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Vimrc Settings'});

		new Setting(containerEl)
			.setName('Vimrc file name')
			.setDesc('Relative to vault directory (requires restart)')
			.addText((text) => {
				text.setPlaceholder(DEFAULT_SETTINGS.vimrcFileName);
				if (this.plugin.settings.vimrcFileName !== DEFAULT_SETTINGS.vimrcFileName)
					text.setValue(this.plugin.settings.vimrcFileName)
				text.onChange(value => {
					this.plugin.settings.vimrcFileName = value || DEFAULT_SETTINGS.vimrcFileName;
					this.plugin.saveSettings();
				})
			});
	}
}
