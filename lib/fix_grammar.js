const vscode = require('vscode');
const ollama = require('ollama');

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

class SimpleTransformer {
	// constructor(parameters) {

	// }
}

class RSpecItTitleTransformer {
	// Regular expression to match "it ... do" with optional leading spaces and capture the text within the quotes
	static regexPattern = /^it\s+['"]([^'"]+)['"].*do$/;

	static match(lineText) {
		return lineText.trim().match(RSpecItTitleTransformer.regexPattern);
	}

	constructor(lineText) {
    const match = lineText.trim().match(RSpecItTitleTransformer.regexPattern);

		this.textToReplace = match[1]
		this.textToCheck = `It ${this.textToReplace}.`
	}

	finalCorrectedText(correctedText) {
		// Remove "It " from the beginning and the dot from the end
		return correctedText.substring(3, correctedText.length - 1)
	}
}

function chooseTextTransformer(lineText) {
	// RSpec It block title in ruby?
	if (RSpecItTitleTransformer.match(lineText)) {
		return new RSpecItTitleTransformer(lineText);
	}

	return new SimpleTransformer(lineText);
}

async function fixGrammar() {
	const { lineText } = getContent();
	// if (lineText === null) return
	// if (lineText.length <= 3) return

	const textTransformer = chooseTextTransformer(lineText);
	const textToCheck = textTransformer.textToCheck;
	const textToReplace = textTransformer.textToReplace;

	console.log('----------------------textToCheck', textToCheck)
	console.log('----------------------textToReplace', textToReplace)

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

	const finalCorrectedText = textTransformer.finalCorrectedText(parsedResponse.corrected)

	vscode.window.activeTextEditor.edit(editBuilder => {
		const position = vscode.window.activeTextEditor.selection.active;
		const nextLinePosition = new vscode.Position(position.line + 1, 0);
		const newLine = lineText.replace(textToReplace, finalCorrectedText);
		editBuilder.insert(nextLinePosition, `${newLine}\n`);
	});

	vscode.window.showInformationMessage('Explanation: ' + parsedResponse.explanation);

	// Offer the user in a menu to replace the text with the corrected version
	if (await askIfWeShouldReplaceIt()) {
		replaceTheSubjectText(lineText, textToReplace, finalCorrectedText);
	} else {
		await vscode.commands.executeCommand('undo');
	}
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

async function replaceTheSubjectText(lineText, textToCheck, correctedText) {
	// Remove the suggestion
	await vscode.commands.executeCommand('undo');

	// Replace the text with the corrected version
	const editor = vscode.window.activeTextEditor;
	const currentPosition = editor.selection.active;
	const activeLine = editor.document.lineAt(currentPosition.line);

	const newText = lineText.replace(textToCheck, correctedText);

	editor.edit(editBuilder => {
		const range = new vscode.Range(activeLine.range.start, activeLine.range.end);
		editBuilder.replace(range, newText);
	});
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

module.exports = {
  fixGrammar
};
