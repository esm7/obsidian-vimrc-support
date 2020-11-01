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
			if (cmEditor) {
				vimCommands.split("\n").forEach(
					function(line, index, arr) {
						if (line.length > 0) {
							CodeMirror.Vim.handleEx(cmEditor, line)
						}
					}
				)
			}
		}
	}
}

