'use strict';

import {
    CodeLens,
    CodeLensProvider, TextDocument,
    window,
} from 'vscode';
import * as util from '../util';

export default class PhpLensProvider implements CodeLensProvider {
    async provideCodeLenses(doc: TextDocument): Promise<CodeLens[]> {
        const editor = window.activeTextEditor;

        if (editor) {
            const { uri } = doc;
            util.setWs(uri);

            const links = [];
            const text = doc.getText();
            const regex = new RegExp(util.config.openPathCodelens.join('|'), 'gm');
            const matches = text.matchAll(regex);

            for (const match of matches) {
                const range = doc.getWordRangeAtPosition(
                    doc.positionAt(match.index),
                    regex,
                );

                links.push(
                    new CodeLens(range, {
                        command : 'lgtv.openPath',
                        title   : '$(open) Open File From Path',
                    }),
                );
            }

            return links;
        }
    }
}
