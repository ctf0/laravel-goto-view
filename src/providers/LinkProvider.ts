'use strict';

import {
    DocumentLink,
    DocumentLinkProvider,
    TextDocument,
    window,
} from 'vscode';
import * as util from '../util';

export default class LinkProvider implements DocumentLinkProvider {
    methods: string;

    constructor() {
        this.methods = util.methods;
    }

    async provideDocumentLinks(doc: TextDocument): Promise<DocumentLink[]> {
        const editor = window.activeTextEditor;

        if (editor) {
            util.setWs(doc.uri);

            const text = doc.getText();
            const links = [];
            const founds = [];
            let regex;
            let matches;

            /* Normal ------------------------------------------------------------------- */

            regex = new RegExp(`(?<=(${this.methods})\\()['"]([^$*]*?)['"]`, 'g');
            matches = text.matchAll(regex);

            for (const match of matches) {
                const text = match[2];

                founds.push({
                    text  : text,
                    index : match.index + text.length,
                });
            }

            /* Special ------------------------------------------------------------------ */

            regex = new RegExp('(?<=Route::view\\()(?:.*,( +)?)([\'"]([^$*]*?)[\'"])', 'g');
            matches = text.matchAll(regex);

            for (const match of matches) {
                const text = match[3];

                founds.push({
                    text  : text,
                    index : match.index + text.length,
                });
            }


            /* -------------------------------------------------------------------------- */
            /*                                     OPS                                    */
            /* -------------------------------------------------------------------------- */

            for (const { text, index } of founds) {
                const files = await util.getFilePath(text);
                const range = doc.getWordRangeAtPosition(
                    doc.positionAt(index),
                    new RegExp(text),
                );

                if (files.length && range) {
                    for (const file of files) {
                        const documentlink = new DocumentLink(range, file.fileUri);
                        documentlink.tooltip = file.tooltip;

                        links.push(documentlink);
                    }
                }
            }

            return links;
        }
    }
}
