const ollama = require('ollama');
const vscode = require('vscode');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	let disposable = vscode.commands.registerCommand('sherpa-ai-box.helloWorld', test);
	context.subscriptions.push(disposable);
}

function getLineContent() {
	const editor = vscode.window.activeTextEditor;
	if (!editor) return null

	const position = editor.selection.active;
	const line = editor.document.lineAt(position.line);
	return line.text;
}

async function test() {
	const lineContent = getLineContent();
	if (lineContent === null) return
	if (lineContent.length <= 3) return

	const systemPrompt = `You are an English grammar teacher. You check ONLY the grammar of the text coming from the user.
You don't rewrite the text, you just correct the grammar.
If it is correct reply with this JSON structure:

{ "correct": true }

If it is NOT correct, reply with this JSON structure:

{
  "correct": false,
  "corrected": "{{corrected_text}}",
  "explanation": "{{short_explanation}}"
}`

	const response = await ollama.default.chat({
		model: 'llama3.1',
		messages: [
			{ role: 'system', content: systemPrompt },
			{ role: 'user', content: lineContent }
		],
	})

	console.log('AI response: ', response.message.content)

	let parsedResponse

	try {
		parsedResponse = JSON.parse(response.message.content);
	} catch (error) {
		console.error('The AI did not return a valid JSON response:', response.message.content);
		vscode.window.showErrorMessage('The AI did not return a valid JSON response: ', response.message.content);
	}

	if (parsedResponse.correct || parsedResponse.corrected === lineContent) {
		vscode.window.showInformationMessage('The text is correct!');
		return
	}

	vscode.window.activeTextEditor.edit(editBuilder => {
		const position = vscode.window.activeTextEditor.selection.active;
		const line = vscode.window.activeTextEditor.document.lineAt(position.line);
		const newPosition = new vscode.Position(position.line + 1, line.firstNonWhitespaceCharacterIndex);
		editBuilder.insert(newPosition, `${parsedResponse.corrected}\n`);
		vscode.window.showInformationMessage('Explanation: ' + parsedResponse.explanation);
	});
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
