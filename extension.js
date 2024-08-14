const vscode = require('vscode');
const { fixGrammar } = require('./lib/fix_grammar');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	let disposable = vscode.commands.registerCommand('sherpa-ai-box.fixGrammar', fixGrammar);
	context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
	activate,
	deactivate
}
