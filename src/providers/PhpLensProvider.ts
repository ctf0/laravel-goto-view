import {
    CodeLens,
    CodeLensProvider, TextDocument,
    window,
} from 'vscode'
import * as cache from '../libs/cache'
import * as util from '../util'

export default class PhpLensProvider implements CodeLensProvider {
    async provideCodeLenses(doc: TextDocument): Promise<CodeLens[]> {
        const editor = window.activeTextEditor
        const links = []
        const openPath = util.config.openPathCodelens

        if (editor && openPath) {
            const {uri} = doc
            const cached = cache.get('phpLens', doc)

            if (cached) {
                return cached
            }

            util.setWs(uri)

            const text = doc.getText()
            const regex = new RegExp(openPath.join('|'), 'gm')
            const matches = text.matchAll(regex)

            for (const match of matches) {
                const range = doc.getWordRangeAtPosition(
                    doc.positionAt(match.index),
                    regex,
                )

                links.push(
                    new CodeLens(range, {
                        command : 'lgtv.openPath',
                        title   : '$(open)‎ Open File From Path',
                    }),
                )
            }

            cache.set('phpLens', doc, links)
        }

        return links
    }
}
