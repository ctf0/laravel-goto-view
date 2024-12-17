import {
    CodeLens,
    CodeLensProvider,
    Range,
    TextDocument,
    window,
} from 'vscode';
import * as util from '../util';

export default class BladeLensProvider implements CodeLensProvider {
    async provideCodeLenses(doc: TextDocument): Promise<CodeLens[]> {
        const editor = window.activeTextEditor;

        if (editor) {
            const { uri } = doc;
            util.setWs(uri);

            const links = [
                new CodeLens(new Range(0, 0, 0, 0), {
                    command : 'lgtv.copyPath',
                    title   : '$(copy) Copy File Path',
                }),
            ];

            const currentFile = uri.path;
            const text = doc.getText();
            const regexes = util.similarIncludeDirectives.map((pattern) => new RegExp(pattern, 'g'));

            for (const regex of regexes) {
                for (const match of text.matchAll(regex)) {
                    const found = match[match.length - 1] || match[0];
                    const files = [...await util.searchForContentInFiles(found)].filter((file) => file.detail.toLowerCase() != currentFile.toLowerCase());
                    const range = doc.getWordRangeAtPosition(
                        doc.positionAt(match.index),
                        regex,
                    );

                    if (files.length && range) {
                        links.push(
                            new CodeLens(range, {
                                command   : 'lgtv.showSimilarCall',
                                title     : util.config.similarCallCodeLens.replace('#', files.length),
                                arguments : [files, found],
                            }),
                        );
                    }
                }
            }

            return links;
        }
    }
}
