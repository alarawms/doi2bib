// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import axios from 'axios';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "doi2bib" is now active!');

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    const disposable = vscode.commands.registerCommand('doi2bib.doiToBibtex', async () => {
        // The code you place here will be executed every time your command is executed
        // Display a message box to the user
        const doi = await vscode.window.showInputBox({
            prompt: 'Enter DOI identifier',
            placeHolder: '10.xxxx/xxxxx'
        });

        if (doi) {
            try {
                const response = await axios.get(`https://doi.org/${doi}`, {
                    headers: { 'Accept': 'application/x-bibtex' }
                });

                const bibtex = response.data;

                if (bibtex) {
                    const openBibFiles = vscode.workspace.textDocuments.filter(doc => doc.languageId === 'bibtex');
                    const refBibExists = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0] ?
                        await vscode.workspace.findFiles(new vscode.RelativePattern(vscode.workspace.workspaceFolders[0], 'ref.bib')) :
                        [];

                    let choice: string | undefined = '';

                    if (openBibFiles.length > 0 && refBibExists.length > 0) {
                        choice = await vscode.window.showQuickPick(
                            ['Append to open BibTeX file', 'Append to ref.bib', 'Create new ref.bib', 'Copy to clipboard'],
                            { placeHolder: 'How do you want to handle the BibTeX entry?' }
                        );
                    } else if (openBibFiles.length > 0) {
                        choice = await vscode.window.showQuickPick(
                            ['Append to open BibTeX file', 'Create new ref.bib', 'Copy to clipboard'],
                            { placeHolder: 'How do you want to handle the BibTeX entry?' }
                        );
                    } else if (refBibExists.length > 0) {
                        choice = await vscode.window.showQuickPick(
                            ['Append to ref.bib', 'Create new ref.bib', 'Copy to clipboard'],
                            { placeHolder: 'How do you want to handle the BibTeX entry?' }
                        );
                    }
                    else {
                        choice = await vscode.window.showQuickPick(
                            ['Create new ref.bib', 'Copy to clipboard'],
                            { placeHolder: 'How do you want to handle the BibTeX entry?' }
                        );
                    }

                    if (choice === 'Append to open BibTeX file') {
                        const editor = await vscode.window.showTextDocument(openBibFiles[0]);
                        await editor.edit(editBuilder => {
                            editBuilder.insert(openBibFiles[0].positionAt(openBibFiles[0].getText().length), '\n' + bibtex);
                        });
                    } else if (choice === 'Append to ref.bib') {
                        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0]) {
                            const refBibPath = vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, 'ref.bib');
                            try {
                                const refBibContent = (await vscode.workspace.fs.readFile(refBibPath)).toString();
                                await vscode.workspace.fs.writeFile(refBibPath, Buffer.from(refBibContent + '\n' + bibtex));
                            } catch (err) {
                                vscode.window.showErrorMessage(`Error appending to ref.bib: ${err}`);
                            }

                        }

                    } else if (choice === 'Create new ref.bib') {
                        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0]) {
                            const refBibPath = vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, 'ref.bib');
                            try {
                                await vscode.workspace.fs.writeFile(refBibPath, Buffer.from(bibtex));
                                vscode.window.showTextDocument(await vscode.workspace.openTextDocument(refBibPath));
                            } catch (err) {
                                vscode.window.showErrorMessage(`Error creating ref.bib: ${err}`);
                            }
                        }
                    } else if (choice === 'Copy to clipboard') {
                        await vscode.env.clipboard.writeText(bibtex);
                        vscode.window.showInformationMessage('BibTeX entry copied to clipboard!');
                    }

                } else {
                    vscode.window.showErrorMessage('Failed to retrieve BibTeX entry.');
                }

            } catch (error: any) {
                vscode.window.showErrorMessage(`Error: ${error.message}`);
            }
        }
    });

    context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
