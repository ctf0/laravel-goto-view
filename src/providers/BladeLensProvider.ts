import {
    CodeLens,
    CodeLensProvider,
    Range,
    TextDocument,
    window,
} from 'vscode'
import * as cache from '../libs/cache'
import * as util from '../util'

export default class BladeLensProvider implements CodeLensProvider {
    async provideCodeLenses(doc: TextDocument): Promise<CodeLens[]> {
        const editor = window.activeTextEditor

        if (editor) {
            const {uri} = doc
            const cached = cache.get('bladeLens', doc)

            if (cached) {
                return cached
            }

            util.setWs(uri)

            const links = [
                new CodeLens(new Range(0, 0, 0, 0), {
                    command : 'lgtv.copyPath',
                    title   : '$(copy)‎ Copy File Path',
                }),
            ]

            const viewNames = util.getViewNames(uri.fsPath)
            const callers = await util.findPhpCallers(viewNames)
            const callersLength = callers.length

            if (callersLength) {
                const count = callersLength > 1 ? ` (${callersLength})` : ''

                links.push(
                    new CodeLens(new Range(0, 0, 0, 0), {
                        command   : 'lgtv.showSimilarCall',
                        title     : `$(go-to-file)‎ Open PHP callers${count}`,
                        arguments : [callers, viewNames],
                    }),
                )
            }

            const currentFile = uri.path
            const text = doc.getText()
            const regexes = util.similarIncludeDirectives.map((pattern) => new RegExp(pattern, 'g'))

            for (const regex of regexes) {
                if (regex.source === '(?:)') {
                    continue
                }

                for (const match of text.matchAll(regex)) {
                    const found = match[match.length - 1] || match[0]
                    const files = [...await util.searchForContentInFiles(found)].filter((file) => file.fileUri.toLowerCase() != currentFile.toLowerCase())
                    const range = doc.getWordRangeAtPosition(
                        doc.positionAt(match.index),
                        regex,
                    )

                    if (files.length && range) {
                        links.push(
                            new CodeLens(range, {
                                command   : 'lgtv.showSimilarCall',
                                title     : util.config.similarCallCodeLens.replace('#', files.length),
                                arguments : [files, found],
                            }),
                        )
                    }
                }
            }

            cache.set('bladeLens', doc, links)

            return links
        }
    }
}
