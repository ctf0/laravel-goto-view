'use strict';

import {
    CodeLens,
    CodeLensProvider,
    Range,
    TextDocument,
    window,
} from 'vscode';
import * as util from '../util';

export default class BladeLensProvider implements CodeLensProvider {
    similarIncludeDirectives: string;

    constructor() {
        this.similarIncludeDirectives = util.similarIncludeDirectives;
    }

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
            const regex = new RegExp(`(?<=(${this.similarIncludeDirectives})\\()['"]([^$*]*?)['"]`, 'g');
            const matches = text.matchAll(regex);

            for (const match of matches) {
                const found = match[0];
                const files = [...await util.searchForContentInFiles(found)].filter((file) => file.detail.toLowerCase() != currentFile.toLowerCase());
                const range = doc.getWordRangeAtPosition(
                    doc.positionAt(match.index),
                    regex,
                );

                if (files.length && range) {
                    links.push(
                        new CodeLens(range, {
                            command   : 'lgtv.showSimilarCall',
                            title     : util.config.codeLensText.replace('#', files.length),
                            arguments : [files, found],
                        }),
                    );
                }
            }

            return links;
        }
    }
}
