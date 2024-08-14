// const ollama = require('ollama');
const ollama = require('ollama/browser');

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "sherpa-ai-box" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('sherpa-ai-box.helloWorld', test);

	context.subscriptions.push(disposable);
}

async function test() {
	const response = await ollama.default.chat({
		model: 'llama3.1',
		messages: [{ role: 'user', content: 'How much is 1+1?' }],
	})
	console.log('----------------------')
	console.log(response.message.content)

	// vscode.window.showInformationMessage('Hello World from Sherpa AI box!');
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
