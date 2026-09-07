import type { Editor } from 'codemirror';
import type { EditorPosition } from 'obsidian';
import { describe, expect, test, vi } from 'vitest';
import { defineMarkdownOpenLine, insertMarkdownLine } from '../actions/openLine';
import type { ActionFn, VimApi, VimState } from '../utils/vimApi';

function editor(value: string, line = 0) {
	let cursor: EditorPosition = { line, ch: 0 };
	const offset = (position: EditorPosition) => value.split('\n').slice(0, position.line)
		.reduce((length, text) => length + text.length + 1, 0) + position.ch;
	return {
		getValue: () => value,
		getCursor: () => cursor,
		getLine: (index: number) => value.split('\n')[index],
		lineCount: () => value.split('\n').length,
		replaceRange: (text: string, from: EditorPosition, to = from) => {
			value = value.slice(0, offset(from)) + text + value.slice(offset(to));
		},
		setCursor: (position: EditorPosition) => { cursor = position; },
		getOption: vi.fn(() => false),
	};
}

describe('Markdown open line', () => {
	test.each([
		['Text', 'Text\n'],
		['Text\nNext', 'Text\n\nNext'],
		['', '\n'],
		['\tText', '\tText\n\t'],
		['- Item', '- Item\n- '],
		['+ Item', '+ Item\n+ '],
		['* Item', '* Item\n* '],
		['\t- Item', '\t- Item\n\t- '],
		['- [x] Task', '- [x] Task\n- [ ] '],
		['- [X] Task', '- [X] Task\n- [ ] '],
		['- [/] Task', '- [/] Task\n- [ ] '],
		['1. [x] Task', '1. [x] Task\n2. [ ] '],
		['> Quote', '> Quote\n> '],
		['> > - Item', '> > - Item\n> > - '],
		['>\t- Item', '>\t- Item\n>\t- '],
		['- ', ''],
		['-', ''],
		['- [ ]', ''],
		['- [x] ', ''],
		['> - ', '> '],
		['1. First\n2. Second', '1. First\n2. \n3. Second'],
		['1) First\n2) Second', '1) First\n2) \n3) Second'],
		['009. First\n010. Second', '009. First\n010. \n011. Second'],
		['1. First\n\n2. Separate', '1. First\n2. \n\n2. Separate'],
		['1. First\n\t1. Child\n2. Next', '1. First\n2. \n\t1. Child\n2. Next'],
		['* * *', '* * *\n'],
		['- - -', '- - -\n'],
		['\\- Text', '\\- Text\n'],
	])('opens below %j', (before, after) => {
		const cm = editor(before);
		insertMarkdownLine(cm, 'below');
		expect(cm.getValue()).toBe(after);
		const cursor = cm.getCursor();
		expect(cursor.ch).toBe(cm.getLine(cursor.line).length);
	});

	test.each([
		['Text', '\nText'],
		['- Item', '- \n- Item'],
		['- [x] Task', '- [ ] \n- [x] Task'],
		['1. First\n2. Second', '1. \n2. First\n3. Second'],
		['009. First\n010. Second', '009. \n010. First\n011. Second'],
		['> - Item', '> - \n> - Item'],
		['- ', '- \n- '],
	])('opens above %j', (before, after) => {
		const cm = editor(before);
		insertMarkdownLine(cm, 'above');
		expect(cm.getValue()).toBe(after);
		expect(cm.getCursor()).toEqual({ line: 0, ch: after.split('\n')[0].length });
	});

	test.each([
		['```md\n- Example\n```', 1, '```md\n- Example\n\n```'],
		['~~~md\n1. Example\n~~~', 1, '~~~md\n1. Example\n\n~~~'],
		['````\n```\n- Example\n````', 2, '````\n```\n- Example\n\n````'],
		['> ```\n> - Example\n> ```', 1, '> ```\n> - Example\n> \n> ```'],
		['---\ntags:\n- Example\n---', 2, '---\ntags:\n- Example\n\n---'],
		['$$\n- x\n$$', 1, '$$\n- x\n\n$$'],
		['```\ncode\n```\n- Item', 3, '```\ncode\n```\n- Item\n- '],
		['---\ntags: []\n---\n- Item', 3, '---\ntags: []\n---\n- Item\n- '],
	])('respects literal block context in %j', (before, line, after) => {
		const cm = editor(before, line);
		insertMarkdownLine(cm, 'below');
		expect(cm.getValue()).toBe(after);
	});
});

describe('Vim action registration', () => {
	function api() {
		const actions = new Map<string, ActionFn>();
		const vim: VimApi = {
			defineMotion: vi.fn(),
			defineAction: vi.fn((name, action) => { actions.set(name, action); }),
			mapCommand: vi.fn(),
			enterInsertMode: vi.fn(),
		};
		defineMarkdownOpenLine(vim);
		return { vim, actions };
	}

	test('registers normal-mode edits with insert replay metadata', () => {
		const { vim } = api();
		for (const [key, name] of [['o', 'openMarkdownLineBelow'], ['O', 'openMarkdownLineAbove']]) {
			expect(vim.mapCommand).toHaveBeenCalledWith(key, 'action', name, {}, {
				context: 'normal', isEdit: true, interlaceInsertRepeat: true,
			});
		}
	});

	test('allows the caret past the prefix and enters insert mode without a nested key', () => {
		const { vim, actions } = api();
		const cm = editor('- Item');
		const state: VimState = { insertMode: false };
		const setCursor = cm.setCursor;
		cm.setCursor = (position) => {
			expect(state.insertMode).toBe(true);
			setCursor(position);
		};
		actions.get('openMarkdownLineBelow')(cm as unknown as Editor, { repeat: 3 }, state);
		expect(cm.getValue()).toBe('- Item\n- ');
		expect(cm.getCursor()).toEqual({ line: 1, ch: 2 });
		expect(vim.enterInsertMode).toHaveBeenCalledWith(cm);
		expect(state.insertModeRepeat).toBe(3);
	});

	test('leaves read-only editors unchanged', () => {
		const { vim, actions } = api();
		const cm = editor('- Item');
		cm.getOption.mockReturnValue(true);
		const state: VimState = { insertMode: false };
		for (const action of actions.values()) action(cm as unknown as Editor, { repeat: 1 }, state);
		expect(cm.getValue()).toBe('- Item');
		expect(state.insertMode).toBe(false);
		expect(vim.enterInsertMode).not.toHaveBeenCalled();
	});
});
