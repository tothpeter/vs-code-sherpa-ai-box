const vscode = require('vscode');
const { checkGrammar } = require('./lib/check_grammar');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	let disposable = vscode.commands.registerCommand('sherpa-ai-box.helloWorld', checkGrammar);
	context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
	activate,
	deactivate
}
