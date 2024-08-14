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
		lineText: getLineContent(editor),
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
	const { lineText, textToCheck } = getContent();
	if (lineText === null) return
	if (lineText.length <= 3) return

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

	vscode.window.activeTextEditor.edit(editBuilder => {
		const position = vscode.window.activeTextEditor.selection.active;
		const nextLinePosition = new vscode.Position(position.line + 1, 0);
		const newLine = lineText.replace(textToCheck, parsedResponse.corrected);
		editBuilder.insert(nextLinePosition, `${newLine}\n`);
	});

	vscode.window.showInformationMessage('Explanation: ' + parsedResponse.explanation);

	// Offer the user in a menu to replace the text with the corrected version
	if (await askIfWeShouldReplaceIt()) {
		// Remove the suggestion
		await vscode.commands.executeCommand('undo');

		// Replace the text with the corrected version
		const editor = vscode.window.activeTextEditor;
		const currentPosition = editor.selection.active;
		const activeLine = editor.document.lineAt(currentPosition.line);

		const newText = lineText.replace(textToCheck, parsedResponse.corrected);

		editor.edit(editBuilder => {
			const range = new vscode.Range(activeLine.range.start, activeLine.range.end);
			editBuilder.replace(range, newText);
		});
	}
}

async function askIfWeShouldReplaceIt() {
	const question = 'Do you want to proceed?';
	const options = ['Yes', 'No'];

	const result = await vscode.window.showQuickPick(options, {
		placeHolder: question,
		canPickMany: false
	});

	return result === 'Yes'
}

function deactivate() {}

module.exports = {
	activate,
	deactivate
}
