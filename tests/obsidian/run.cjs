// Usage: node tests/obsidian/run.cjs [vault-name] [obsidian-executable]
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../../actions/openLine.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
	compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const tests = fs.readFileSync(path.join(__dirname, 'editor-smoke.js'), 'utf8');
const program = `(async () => {
	const module = { exports: {} };
	new Function('module', 'exports', ${JSON.stringify(compiled)})(module, module.exports);
	return await (${tests})(module.exports.defineMarkdownOpenLine);
})()`;
// Keep the CLI request small: the Windows launcher can truncate long arguments.
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'vimrc-open-line-'));
const scriptPath = path.join(temporaryDirectory, 'editor-test.js');
fs.writeFileSync(scriptPath, program);
const code = `eval(require('fs').readFileSync(${JSON.stringify(scriptPath)}, 'utf8'))`;
const vault = process.argv[2];
const cli = process.argv[3] || (process.platform === 'win32' ? 'Obsidian.com' : 'obsidian');
let result;
try {
	result = spawnSync(cli, [...(vault ? [`vault=${vault}`] : []), 'eval', `code=${code}`], {
		encoding: 'utf8', windowsHide: true, timeout: 30000, maxBuffer: 8 * 1024 * 1024,
	});
} finally {
	fs.unlinkSync(scriptPath);
	fs.rmdirSync(temporaryDirectory);
}
if (result.error) throw result.error;
process.stdout.write(result.stdout);
process.stderr.write(result.stderr);
const summary = result.stdout.split(/\r?\n/).find(line => line.startsWith('=> {'));
if (!summary) throw new Error('Obsidian did not return test results');
const report = JSON.parse(summary.slice(3));
if (result.status !== 0 || report.passed !== report.total) process.exitCode = 1;
