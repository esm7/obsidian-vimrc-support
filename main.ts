import { App, Plugin, TFile, MarkdownView } from 'obsidian';

export default class MyPlugin extends Plugin {
	onload() {
		console.log('loading Vimrc plugin');

		this.registerEvent(this.app.workspace.on('file-open', (file: TFile) => {
			const VIMRC_FILE_NAME = '.obsidian.vimrc';
			this.app.vault.adapter.read(VIMRC_FILE_NAME).
				then((lines) => this.readVimInit(lines)).
				catch(error => { console.log('Error loading vimrc file', VIMRC_FILE_NAME, 'from the vault root') });
		}));
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
				vimCommands.split("\n").forEach(
					function(line, index, arr) {
						if (line.length > 0) {
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
}

