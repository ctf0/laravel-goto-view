'use strict'

import {
    DocumentLink,
    DocumentLinkProvider,
    TextDocument,
    window
} from 'vscode'
import * as util from '../util'

export default class LinkProvider implements DocumentLinkProvider {
    methods: string

    constructor() {
        this.methods = util.methods
    }

    async provideDocumentLinks(doc: TextDocument): Promise<DocumentLink[]> {
        let editor = window.activeTextEditor

        if (editor) {
            util.setWs(doc.uri)

            const text = doc.getText()
            let links  = []
            let founds = []
            let regex
            let matches

            /* Normal ------------------------------------------------------------------- */

            regex   = new RegExp(`(?<=(${this.methods})\\()[\'"]([^$*]*?)[\'"]`, 'g')
            matches = text.matchAll(regex)

            for (const match of matches) {
                founds.push({
                    text    : match[0],
                    index   : match.index,
                    pattern : regex
                })
            }

            /* Special ------------------------------------------------------------------ */

            regex   = new RegExp('(?<=Route::view\\()(?:.*,( +)?)([\'"]([^$*]*?)[\'"])', 'g')
            matches = text.matchAll(regex)

            for (const match of matches) {
                let text = match[2]

                founds.push({
                    text    : text,
                    index   : match.index + (match[0].length - text.length),
                    pattern : new RegExp(text)
                })
            }


            /* -------------------------------------------------------------------------- */
            /*                                     OPS                                    */
            /* -------------------------------------------------------------------------- */

            for (const {text, index, pattern} of founds) {
                let files   = await util.getFilePath(text)
                const range = doc.getWordRangeAtPosition(
                    doc.positionAt(index),
                    pattern
                )

                if (files.length && range) {
                    for (const file of files) {
                        let documentlink     = new DocumentLink(range, file.fileUri)
                        documentlink.tooltip = file.tooltip

                        links.push(documentlink)
                    }
                }
            }

            return links
        }
    }
}
