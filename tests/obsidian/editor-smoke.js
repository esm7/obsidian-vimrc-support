(async (install) => {
	const original = app.workspace.activeLeaf;
	const path = `vimrc-open-line-test-${Date.now()}.md`;
	const file = await app.vault.create(path, 'Temporary editor test');
	const leaf = app.workspace.getLeaf('tab');
	const results = [];
	const check = (name, actual, expected) => {
		results.push({ name, pass: JSON.stringify(actual) === JSON.stringify(expected), actual, expected });
	};
	const vim = CodeMirrorAdapter.Vim;
	install(vim);
	try {
		for (const mode of ['source', 'live-preview']) {
			await leaf.setViewState({ type: 'markdown', state: { file: path, mode: 'source', source: mode === 'source' } });
			const editor = leaf.view.editor;
			const cm = editor.cm.cm;
			const vim = CodeMirrorAdapter.Vim;
			const key = (value) => cm.operation(() => vim.handleKey(cm, value));
			const reset = (value, cursor = { line: 0, ch: 2 }) => {
				key('<Esc>');
				editor.setValue(value);
				editor.setCursor(cursor);
			};
			const cases = [
				['o', 'text\nnext', 'text\n\nnext', { line: 1, ch: 0 }],
				['o', 'text', 'text\n', { line: 1, ch: 0 }],
				['o', '- item\n- next', '- item\n- \n- next', { line: 1, ch: 2 }],
				['o', '- [x] item\n- next', '- [x] item\n- [ ] \n- next', { line: 1, ch: 6 }],
				['o', '1. item\n2. next', '1. item\n2. \n3. next', { line: 1, ch: 3 }],
				['o', '1) item\n2) next', '1) item\n2) \n3) next', { line: 1, ch: 3 }],
				['o', '> - item\n> - next', '> - item\n> - \n> - next', { line: 1, ch: 4 }],
				['o', '\t- item', '\t- item\n\t- ', { line: 1, ch: 3 }],
				['o', '- ', '', { line: 0, ch: 0 }],
				['o', '- [ ] ', '', { line: 0, ch: 0 }],
				['O', 'text\nnext', '\ntext\nnext', { line: 0, ch: 0 }],
				['O', '- item\n- next', '- \n- item\n- next', { line: 0, ch: 2 }],
				['O', '- [x] item\n- next', '- [ ] \n- [x] item\n- next', { line: 0, ch: 6 }],
				['O', '1. item\n2. next', '1. \n2. item\n3. next', { line: 0, ch: 3 }],
				['O', '> - item\n> - next', '> - \n> - item\n> - next', { line: 0, ch: 4 }],
			];
			for (const [pressed, before, after, cursor] of cases) {
				reset(before);
				key(pressed);
				check(`${mode}: ${pressed} ${JSON.stringify(before)}`, [editor.getValue(), editor.getCursor(), cm.state.vim.insertMode], [after, cursor, true]);
			}
			for (const pressed of ['o', 'O']) {
				reset('- first');
				cm.getInputField().dispatchEvent(new KeyboardEvent('keydown', { key: pressed, code: 'KeyO', shiftKey: pressed === 'O', bubbles: true, cancelable: true }));
				check(`${mode}: ${pressed} keyboard event`, [editor.getValue(), cm.state.vim.insertMode], [pressed === 'o' ? '- first\n- ' : '- \n- first', true]);
				reset('- first');
				key(pressed);
				// Start uppercase so Easy Typing's auto-capitalization does not add
				// a separate whole-line edit to Vim's recorded insertion.
				cm.operation(() => cm.replaceSelection('Added'));
				key('<Esc>');
				check(`${mode}: ${pressed} typed text`, editor.getValue(), pressed === 'o' ? '- first\n- Added' : '- Added\n- first');
				key('.');
				check(`${mode}: ${pressed} dot repeat`, editor.getValue(), pressed === 'o' ? '- first\n- Added\n- Added' : '- Added\n- Added\n- first');
				key('u');
				check(`${mode}: ${pressed} undo repeat`, editor.getValue(), pressed === 'o' ? '- first\n- Added' : '- Added\n- first');
				key('u');
				check(`${mode}: ${pressed} undo typing`, editor.getValue(), pressed === 'o' ? '- first\n- ' : '- \n- first');
				key('u');
				check(`${mode}: ${pressed} undo opening`, editor.getValue(), '- first');
			}
			reset('- first');
			key('3');
			key('o');
			cm.operation(() => cm.replaceSelection('Added'));
			key('<Esc>');
			check(`${mode}: counted open`, editor.getValue(), '- first\n- Added\n- Added\n- Added');
			key('<Esc>');
			for (const [before, line, after] of [
				['```md\n- Example\n```', 1, '```md\n- Example\n\n```'],
				['> ```\n> - Example\n> ```', 1, '> ```\n> - Example\n> \n> ```'],
				['$$\n- x\n$$', 1, '$$\n- x\n\n$$'],
			]) {
				reset(before, { line, ch: 2 });
				key('o');
				check(`${mode}: literal block ${JSON.stringify(before)}`, editor.getValue(), after);
			}
			reset('1. First\n2. Second');
			key('o');
			key('<Esc>');
			key('u');
			check(`${mode}: undo opening and renumbering`, editor.getValue(), '1. First\n2. Second');
			reset('Abc');
			key('v');
			key('o');
			check(`${mode}: visual o keeps selection behavior`, [editor.getValue(), cm.state.vim.visualMode, cm.state.vim.insertMode], ['Abc', true, false]);
			key('<Esc>');
			vim.map('o', 'l', 'normal');
			try {
				reset('Abc', { line: 0, ch: 0 });
				key('o');
				check(`${mode}: user mapping takes precedence`, [editor.getValue(), editor.getCursor().ch, cm.state.vim.insertMode], ['Abc', 1, false]);
			} finally {
				vim.unmap('o', 'normal');
			}
		}
		return JSON.stringify({ total: results.length, passed: results.filter((result) => result.pass).length, failures: results.filter((result) => !result.pass) });
	} finally {
		vim.unmap('o', 'normal');
		vim.unmap('O', 'normal');
		if (leaf.view.save) await leaf.view.save();
		await leaf.setViewState({ type: 'empty' });
		leaf.detach();
		await app.vault.delete(file);
		if (original) app.workspace.setActiveLeaf(original, { focus: false });
	}
})
