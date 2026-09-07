// Run after npm run build. Check the built plugin's default mappings without
// loading it into a vault or invoking its startup callbacks.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const context = vm.createContext({
	module: { exports: {} },
	require: (name) => {
		if (name === 'obsidian') return { Plugin: class {}, PluginSettingTab: class {} };
		return require(name);
	},
});
vm.runInContext(fs.readFileSync(path.join(__dirname, '../main.js'), 'utf8'), context);
const plugin = new context.module.exports();
const mappings = new Map();
const actions = new Map();
plugin.defineAndMapObsidianVimCommands({
	defineMotion() {},
	defineAction(name, action) { actions.set(name, action); },
	mapCommand(key, type, name, args, extra) { mappings.set(key, { type, name, extra }); },
});
for (const [key, name] of [['o', 'openMarkdownLineBelow'], ['O', 'openMarkdownLineAbove']]) {
	assert.equal(mappings.get(key)?.name, name);
	assert.equal(mappings.get(key)?.extra.context, 'normal');
	assert.equal(typeof actions.get(name), 'function');
}
console.log('Built plugin registers both Markdown open-line actions');
