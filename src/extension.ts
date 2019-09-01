import * as vscode from "vscode";

interface IReplaceInfo {
  targetRange: vscode.Range;
  replaceText: string;
}

/**
 * 주어진 라인의 텍스트로 부터 수정영역을 추출함
 *
 * @param selectionStart 영역선택의 시작점. 첫 라인 외에는 모두 0으로 넘겨야함
 * @param selectionEnd 영역선택의 끝점. 마지막 라인 외에는 모두 Infinity로 넘겨야함
 * @param lineText 이 라인의 전체 텍스트
 * @param regex 추출할 regex
 *
 * @returns 수정할 영역에 대한 정보 배열
 */
const getReplaceInfosFromLine = (
  lineNum: number,
  startPos: number,
  endPos: number,
  lineText: string,
  regex: RegExp
): IReplaceInfo[] => {
  let regexExec: RegExpExecArray | null;
  const replaceInfos: IReplaceInfo[] = [];

  while ((regexExec = regex.exec(lineText.slice(0, endPos))) !== null) {
    if (regexExec.index < startPos) {
      continue;
    } else {
      replaceInfos.push({
        targetRange: new vscode.Range(
          new vscode.Position(lineNum, regexExec.index),
          new vscode.Position(lineNum, regexExec.index + regexExec[0].length)
        ),
        replaceText: Number(regexExec[0].split("px")[0]) / 16 + "rem"
      });
    }
  }

  return replaceInfos;
};

// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand("extension.pxToRem", () => {
    const editor = vscode.window.activeTextEditor;
    let convertedCount = 0;
    let replaceInfos: IReplaceInfo[] = [];

    if (editor) {
      /**
       * 다중 선택이 가능한 VS Code 특성상 각 선택영역별로 수정할 영역을 추출
       */
      editor.selections.forEach(selection => {
        for (
          let lineNum = selection.start.line;
          lineNum <= selection.end.line;
          lineNum++
        ) {
          const regex = /[0-9]+px(?=[^a-z])|[0-9]+px$/gm;

          const newReplaceInfos = getReplaceInfosFromLine(
            lineNum,
            lineNum === selection.start.line ? selection.start.character : 0,
            lineNum === selection.end.line ? selection.end.character : Infinity,
            editor.document.lineAt(lineNum).text,
            regex
          );

          replaceInfos = [...replaceInfos, ...newReplaceInfos];
        }
      });

      /**
       * 도출된 수정영역에 대한 수정 처리
       */
      editor.edit(eb => {
        replaceInfos.forEach(replaceInfo => {
          convertedCount++;
          eb.replace(replaceInfo.targetRange, replaceInfo.replaceText);
        });
      });
    }

    vscode.window.showInformationMessage(
      `px to rem: ${convertedCount} units converted`
    );

    context.subscriptions.push(disposable);
  });
}

// this method is called when your extension is deactivated
export function deactivate() {}
