import type { Editor as CodeMirrorEditor } from 'codemirror';
import type { EditorPosition } from 'obsidian';
import type { VimApi, VimState } from '../utils/vimApi';

type Direction = 'above' | 'below';
type LineEditor = Pick<CodeMirrorEditor, 'getCursor' | 'getLine' | 'lineCount' | 'replaceRange' | 'setCursor'>;

function parseLine(text: string) {
	const base = text.match(/^[\t ]*(?:>[\t ]*)*/)[0];
	const rest = text.slice(base.length);
	// A thematic break is not a list item, including spaced forms such as "* * *".
	const rule = /^(?:(?:\*[\t ]*){3,}|(?:-[\t ]*){3,}|(?:_[\t ]*){3,})$/.test(rest);
	const marker = !rule && rest.match(/^(?:([-+*])|(\d{1,9})([.)]))([\t ]+|$)/);
	const content = marker ? rest.slice(marker[0].length) : rest;
	const task = marker && content.match(/^\[[^\]\r\n]\]([\t ]+|$)/);
	return {
		base,
		bullet: marker ? marker[1] || '' : '',
		number: marker ? marker[2] || '' : '',
		delimiter: marker ? marker[3] || '' : '',
		task: !!task,
		content: task ? content.slice(task[0].length) : content,
	};
}

// Do not continue Markdown-looking source inside fenced code, display math,
// or frontmatter. Scan the current document rather than a stale metadata cache.
function isLiteralBlock(editor: LineEditor, target: number): boolean {
	let fence = '';
	let frontmatter = false;
	let math = false;
	for (let line = 0; line <= target; line++) {
		const text = editor.getLine(line);
		const content = parseLine(text).content.trim();
		if (line === 0 && text === '---') {
			frontmatter = true;
		} else if (frontmatter) {
			if (/^(?:---|\.\.\.)[\t ]*$/.test(text)) frontmatter = false;
		} else if (fence) {
			const closing = content.match(/^(`{3,}|~{3,})[\t ]*$/);
			if (closing && closing[1][0] === fence[0] && closing[1].length >= fence.length) fence = '';
		} else if (math) {
			if (content === '$$') math = false;
		} else {
			const opening = content.match(/^(`{3,}|~{3,})(.*)$/);
			if (opening && !(opening[1][0] === '`' && opening[2].includes('`'))) fence = opening[1];
			else if (content === '$$') math = true;
		}
	}
	return frontmatter || !!fence || math;
}

function increment(number: string): string {
	return String(Number(number) + 1).padStart(number.length, '0');
}

export function insertMarkdownLine(editor: LineEditor, direction: Direction): void {
	const line = editor.getCursor().line;
	const text = editor.getLine(line);
	const parsed = parseLine(text);
	const isList = !isLiteralBlock(editor, line) && !!(parsed.bullet || parsed.number);
	const base = parsed.base;

	if (direction === 'below' && isList && !parsed.content.trim()) {
		editor.replaceRange(base, { line, ch: 0 }, { line, ch: text.length });
		editor.setCursor({ line, ch: base.length });
		return;
	}

	let prefix = base;
	if (isList) {
		prefix += parsed.number
			? (direction === 'below' ? increment(parsed.number) : parsed.number) + parsed.delimiter
			: parsed.bullet;
		prefix += ' ' + (parsed.task ? '[ ] ' : '');
		if (parsed.number) {
			for (let next = direction === 'below' ? line + 1 : line; next < editor.lineCount(); next++) {
				const following = parseLine(editor.getLine(next));
				if (!following.number || following.base !== parsed.base || following.delimiter !== parsed.delimiter) break;
				editor.replaceRange(increment(following.number), { line: next, ch: following.base.length },
					{ line: next, ch: following.base.length + following.number.length });
			}
		}
	}

	const position: EditorPosition = { line, ch: direction === 'below' ? editor.getLine(line).length : 0 };
	editor.replaceRange(direction === 'below' ? '\n' + prefix : prefix + '\n', position);
	editor.setCursor({ line: direction === 'below' ? line + 1 : line, ch: prefix.length });
}

export function defineMarkdownOpenLine(vim: VimApi): void {
	for (const [key, direction] of [['o', 'below'], ['O', 'above']] as const) {
		const name = direction === 'below' ? 'openMarkdownLineBelow' : 'openMarkdownLineAbove';
		vim.defineAction(name, (cm, args, state: VimState) => {
			if (cm.getOption('readOnly')) return;
			// Normal mode clips the caret before the final prefix character.
			state.insertMode = true;
			insertMarkdownLine(cm, direction);
			// Do not send a nested "i" command: it replaces the edit recorded for ".".
			vim.enterInsertMode(cm);
			state.insertModeRepeat = args.repeat || 1;
		});
		vim.mapCommand(key, 'action', name, {}, {
			context: 'normal', isEdit: true, interlaceInsertRepeat: true,
		});
	}
}
