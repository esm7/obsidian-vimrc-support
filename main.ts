import { App, Plugin, TFile, MarkdownView, PluginSettingTab, Setting } from 'obsidian';
declare const CodeMirror: any;

interface Settings {
}

const DEFAULT_SETTINGS: Settings = {
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
			const VIMRC_FILE_NAME = '.obsidian.vimrc';
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

	async loadSettings(){
		const data = await this.loadData();
		this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
	}

	async saveSettings(){
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
				CodeMirror.Vim.defineOption('clipboard', '', 'string', ['clip'], (value, cm) => {
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
				CodeMirror.Vim.defineOption('tabstop', 4, 'number', [], (value, cm) => {
					if (value) {
						cmEditor.setOption('tabSize', value);
					}
				});

				CodeMirror.Vim.defineEx('iunmap', '', (cm, params) => {
					if (params.argString.trim()) {
						CodeMirror.Vim.unmap(params.argString.trim(), 'insert');
					}
				});

				CodeMirror.Vim.defineEx('noremap', '', (cm, params) => {
					if (!params?.args?.length) {
						throw new Error('Invalid mapping: noremap');
					}
				
					if (params.argString.trim()) {
						CodeMirror.Vim.noremap.apply(CodeMirror.Vim, params.args);
					}
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

		containerEl.createEl('h2', {text: 'Obsidian Vimrc Support Settings'});
	}
}