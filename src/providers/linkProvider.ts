'use strict'

import {
    DocumentLinkProvider as vsDocumentLinkProvider,
    TextDocument,
    DocumentLink,
    Position,
    window,
    Range
} from 'vscode'
import * as util from '../util'

export default class LinkProvider implements vsDocumentLinkProvider {
    regex

    constructor() {
        this.regex = util.methods
    }

    async provideDocumentLinks(doc: TextDocument): Promise<DocumentLink[]> {
        let editor = window.activeTextEditor

        if (editor) {
            let range = editor.visibleRanges[0]
            let reg = new RegExp(`(?<=(${this.regex})\\()['"](.*?)['"]`, 'g')
            let documentLinks = []

            for (let i = range.start.line; i <= range.end.line; i++) {
                let line = doc.lineAt(i)
                let txt = line.text
                let result = txt.match(reg)

                if (result) {
                    for (let found of result) {
                        if (!found.includes('*')) {
                            let file = await util.getFilePath(found, doc)

                            if (file) {
                                let start = new Position(line.lineNumber, txt.indexOf(found))
                                let end = start.translate(0, found.length)

                                let documentlink = new DocumentLink(new Range(start, end), file.fileUri)
                                documentlink.tooltip = file.tooltip
                                documentLinks.push(documentlink)
                            }
                        }
                    }
                }
            }

            return documentLinks
        }
    }
}
