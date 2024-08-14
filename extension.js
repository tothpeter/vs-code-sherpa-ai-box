const ollama = require('ollama');
const vscode = require('vscode');

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

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	let disposable = vscode.commands.registerCommand('sherpa-ai-box.helloWorld', test);
	context.subscriptions.push(disposable);
}

function getContent() {
	const editor = vscode.window.activeTextEditor;
	if (!editor) return null

	return {
		lineContent: getLineContent(editor),
		textToCheck: getTextToCheck(editor)
	}
}

function getLineContent(editor) {
	const position = editor.selection.active;
	const line = editor.document.lineAt(position.line);
	return line.text;
}

function getTextToCheck(editor) {
	// Is there a selection?
	const selection = editor.selection;
	if (!selection.isEmpty) {
		return editor.document.getText(selection);
	}

	// Return a trimmed version of the whole line
	const position = editor.selection.active;
	const line = editor.document.lineAt(position.line);
	return line.text.trim();
}

async function test() {
	const { lineContent, textToCheck } = getContent();
	if (lineContent === null) return
	if (lineContent.length <= 3) return

	const response = await ollama.default.chat({
		model: 'llama3.1',
		messages: [
			{ role: 'system', content: systemPrompt },
			{ role: 'user', content: textToCheck }
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

	if (parsedResponse.correct || parsedResponse.corrected === textToCheck) {
		vscode.window.showInformationMessage('The text is correct!');
		return
	}

	const newLine = lineContent.replace(textToCheck, parsedResponse.corrected);

	vscode.window.activeTextEditor.edit(editBuilder => {
		const position = vscode.window.activeTextEditor.selection.active;
		const line = vscode.window.activeTextEditor.document.lineAt(position.line);
		const newPosition = new vscode.Position(position.line + 1, 0);
		editBuilder.insert(newPosition, `${newLine}\n`);
		vscode.window.showInformationMessage('Explanation: ' + parsedResponse.explanation);
	});
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
