'use strict'

import {
    CodeLens,
    CodeLensProvider,
    TextDocument,
    window
} from 'vscode'
import * as util from '../util'

export default class lensProvider implements CodeLensProvider {
    similarIncludeDirectives: string

    constructor() {
        this.similarIncludeDirectives = util.similarIncludeDirectives
    }

    async provideCodeLenses(doc: TextDocument): Promise<CodeLens[]> {
        let editor = window.activeTextEditor

        if (editor) {
            let {uri} = doc
            util.setWs(uri)

            const currentFile = uri.path
            const text = doc.getText()
            const regex = new RegExp(`(?<=(${this.similarIncludeDirectives})\\()['"](((?![$*]).)*?)['"]`, 'g')
            let links = []
            let matches = text.matchAll(regex)

            for (const match of matches) {
                let found = match[0]
                let files = await util.searchForContentInFiles(found, currentFile)

                if (files.length) {
                    const range = doc.getWordRangeAtPosition(
                        doc.positionAt(match.index),
                        regex
                    )

                    links.push(
                        new CodeLens(range, {
                            command   : 'lgtv.showSimilarCall',
                            title     : util.config.codeLensText,
                            arguments : [files]
                        })
                    )
                }
            }

            return links
        }
    }
}
