import * as vscode from "vscode";
import * as path from "path";
import { findMatchingTag, getTagForPosition } from "./tokenizer/tagMatcher";
import { parseTags } from "./tokenizer/tagParser";

const cats = {
  "Coding Cat": "https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif",
  "Compiling Cat": "https://media.giphy.com/media/mlvseq9yvZhba/giphy.gif",
  "Testing Cat": "https://media.giphy.com/media/3oriO0OEd9QIDdllqo/giphy.gif",
};

/// Check if the current text looks like a tailwind component.
function renderHtml(
  document: vscode.TextDocument,
  position: vscode.Position
): [string, vscode.Range] | undefined {
  if ("jest-snapshot" !== document.languageId) {
    return undefined;
  }

  const text = document.getText(
    new vscode.Range(position, document.positionAt(document.getText().length))
  );
  const tags = parseTags(text);

  const tag = getTagForPosition(tags, 0);

  if (tag) {
    return [JSON.stringify(tag), new vscode.Range(position, position)];
  }
  console.log(Object.keys(document));
  console.log(document, position);
  return;
}

export function activate(context: vscode.ExtensionContext) {
  // Show image on hover
  const hoverProvider: vscode.HoverProvider = {
    provideHover(document, position) {
      const rendeded = renderHtml(document, position);
      if (!rendeded) {
        return;
      }

      const content = new vscode.MarkdownString(
        `<img src="${cats["Coding Cat"]}" width=144 height=144/>`
      );

      content.supportHtml = true;

      content.isTrusted = true;

      content.supportThemeIcons = true; // to supports codicons

      // baseUri was necessary, full path in the img src did not work
      // with your icons stroed in the 'images' directory
      content.baseUri = vscode.Uri.file(
        path.join(context.extensionPath, "images", path.sep)
      );

      return new vscode.Hover(content, new vscode.Range(position, position));
    },
  };

  for (const lang of ["jest-snapshot"]) {
    context.subscriptions.push(
      vscode.languages.registerHoverProvider(lang, hoverProvider)
    );
  }
}
