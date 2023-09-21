import * as vscode from "vscode";
import * as path from "path";
import postcss from "postcss";
import postcssrc from "postcss-load-config";
import tailwindcss from "tailwindcss";
import { findMatchingTag, getTagForPosition } from "./tokenizer/tagMatcher";
import { parseTags } from "./tokenizer/tagParser";
import resolveConfig from "tailwindcss/resolveConfig";

/// Check if the current text looks like a tailwind component.
async function renderHtml(
  document: vscode.TextDocument,
  position: vscode.Position,
  styled: boolean
): Promise<[string, vscode.Range] | undefined> {
  if ("jest-snapshot" !== document.languageId) {
    return undefined;
  }

  const text = document.getText();
  const tags = parseTags(text);

  const tag = getTagForPosition(tags, document.offsetAt(position), true);
  if (!tag) {
    return;
  }

  const range = new vscode.Range(
    document.positionAt(tag.opening.start),
    document.positionAt(tag.closing.end)
  );
  const htmlContent = document.getText(range);

  if (!styled) {
    return [htmlContent, range];
  }

  const css = postcss.parse(
    `
  @tailwind base;
  @tailwind components;
  @tailwind utilities;
  `,
    { from: document.fileName }
  );

  // console.log('result', css);
  const postcssConfig = await postcssrc({}, document.fileName);

  const plugins = postcssConfig.plugins;
  const cssResult = await postcss(plugins).process(css);

  const finalHtml = `
  <html>
    <head>
      <style>
        ${cssResult.css}
      </style>
    </head>
    <body>
      ${htmlContent}
    </body>
  </html>`;

  return [finalHtml.trim(), range];
}

export function activate(context: vscode.ExtensionContext) {
  // Show image on hover
  const hoverProvider: vscode.HoverProvider = {
    async provideHover(document, position) {
      const rendeded = await renderHtml(document, position, false);
      if (!rendeded) {
        return;
      }
      const [htmlText, range] = rendeded;

      const content = new vscode.MarkdownString(htmlText);

      content.supportHtml = true;

      content.isTrusted = true;

      content.supportThemeIcons = true; // to supports codicons

      // baseUri was necessary, full path in the img src did not work
      // with your icons stroed in the 'images' directory
      content.baseUri = vscode.Uri.file(
        path.join(context.extensionPath, "images", path.sep)
      );

      return new vscode.Hover(content, range);
    },
  };

  for (const lang of ["jest-snapshot"]) {
    context.subscriptions.push(
      vscode.languages.registerHoverProvider(lang, hoverProvider)
    );
  }

  // HoverProvider does not support styling, so we need to use a Webview.
  // Instead of using a command pallette, we use a code lens to show the "open preview" button.
  context.subscriptions.push(
    vscode.commands.registerCommand("catCoding.start", () => {
      // Create and show panel
      const panel = vscode.window.createWebviewPanel(
        "catCoding",
        "Cat Coding",
        vscode.ViewColumn.One,
        {}
      );

      // And set its HTML content
      panel.webview.html = getWebviewContent();
    })
  );
}
