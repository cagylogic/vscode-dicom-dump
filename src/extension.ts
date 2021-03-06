'use strict';
import * as vscode from 'vscode';
import DicomHoverProvider from './hoverProvider';
import decorate from './decorate';
import * as qs from 'qs';

const scheme = 'dicom-dump';

export function activate(context: vscode.ExtensionContext): void {
  const r1 = vscode.workspace.registerTextDocumentContentProvider(
    scheme,
    new ContentProviderWrapper()
  );

  const open = (mode: string) => {
    return async (uri: vscode.Uri) => {
      if (!(uri instanceof vscode.Uri)) return;
      const newUri = uri.with({
        query: qs.stringify({ scheme: uri.scheme, mode }),
        scheme,
        path: uri.path + '.' + mode
      });
      const doc = await vscode.workspace.openTextDocument(newUri);
      return vscode.window.showTextDocument(doc);
    };
  };

  const r2 = vscode.commands.registerCommand('dicom.showTags', open('dcmdump'));

  const r3 = vscode.commands.registerCommand('dicom.dumpAsJson', open('json'));

  const r4 = vscode.languages.registerHoverProvider(
    { language: 'dicom-dump' },
    new DicomHoverProvider()
  );

  // Decoration in text editor
  let activeEditor = vscode.window.activeTextEditor;
  const decorateActiveEditor = () => {
    if (activeEditor && activeEditor.document.languageId === 'dicom-dump')
      decorate(activeEditor);
  };
  decorateActiveEditor();
  const r5 = vscode.window.onDidChangeActiveTextEditor(editor => {
    activeEditor = editor;
    decorateActiveEditor();
  });

  // Dispose
  context.subscriptions.push(r1, r2, r3, r4, r5);
}

// export function deactivate() {}

/**
 * Wraps the actual DicomContentProvider in order to load
 * the actual big module as late as possible.
 */
class ContentProviderWrapper implements vscode.TextDocumentContentProvider {
  private _provider!: vscode.TextDocumentContentProvider;

  public async provideTextDocumentContent(
    uri: vscode.Uri,
    token: vscode.CancellationToken
  ): Promise<string> {
    if (!this._provider) {
      const DicomContentProvider = (await import('./contentProvider')).default;
      this._provider = new DicomContentProvider();
    }
    return (await this._provider.provideTextDocumentContent(
      uri,
      token
    )) as string;
  }
}
