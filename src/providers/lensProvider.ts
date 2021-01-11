'use strict'

import {
    CodeLens,
    CodeLensProvider,
    Position,
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
            let regex = new RegExp(`(?<=(${this.similarIncludeDirectives})\\()['"](((?![$*]).)*?)['"]`, 'g')
            const text = doc.getText()
            let links = []
            let matches

            while ((matches = regex.exec(text)) !== null) {
                let found = matches[0]
                const line = doc.lineAt(doc.positionAt(matches.index).line)
                const indexOf = line.text.indexOf(found)
                const position = new Position(line.lineNumber, indexOf)
                const range = doc.getWordRangeAtPosition(position, new RegExp(regex))

                if (range) {
                    let files = await util.searchForContentInFiles(found, doc.uri.path)

                    if (files.length) {
                        links.push(
                            new CodeLens(range, {
                                command   : 'lgtv.showSimilarCall',
                                title     : util.config.codeLensText,
                                arguments : [files]
                            })
                        )
                    }
                }
            }

            return links
        }
    }
}
