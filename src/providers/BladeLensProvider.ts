import {
    CodeLens,
    CodeLensProvider,
    Disposable,
    EventEmitter,
    Range,
    TextDocument,
    window,
} from 'vscode'
import * as cache from '../libs/cache'
import * as util from '../util'

export default class BladeLensProvider implements CodeLensProvider {
    private readonly _onDidChangeCodeLenses = new EventEmitter<void>()
    readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event

    private readonly callersWatcher : Disposable

    constructor() {
        this.callersWatcher = util.onPhpCallersReady.event(() => {
            const editor = window.activeTextEditor

            if (editor) {
                cache.clear('bladeLens', editor.document)
            }

            this._onDidChangeCodeLenses.fire()
        })
    }

    dispose() {
        this.callersWatcher.dispose()
        this._onDidChangeCodeLenses.dispose()
    }

    async provideCodeLenses(doc: TextDocument): Promise<CodeLens[]> {
        const editor = window.activeTextEditor

        if (!editor) {
            return []
        }

        const {uri} = doc
        const cached = cache.get('bladeLens', doc)

        if (cached) {
            return cached
        }

        util.setWs(uri)

        const links: CodeLens[] = [
            new CodeLens(new Range(0, 0, 0, 0), {
                command : 'lgtv.copyPath',
                title   : '$(copy)‎ Copy File Path',
            }),
        ]

        const viewNames = util.getViewNames(uri.fsPath)
        const callers = util.peekPhpCallers(viewNames)

        if (callers && callers.length) {
            const count = callers.length > 1 ? ` (${callers.length})` : ''

            links.push(
                new CodeLens(new Range(0, 0, 0, 0), {
                    command   : 'lgtv.showSimilarCall',
                    title     : `$(go-to-file)‎ Open PHP callers${count}`,
                    arguments : [callers, viewNames],
                }),
            )
        } else if (util.isPhpCallersInflight(viewNames)) {
            links.push(
                new CodeLens(new Range(0, 0, 0, 0), {
                    command : '',
                    title   : '$(loading~spin)‎ Searching PHP callers...',
                }),
            )
        }

        this.computeSlowLenses(doc, links.slice(), viewNames)

        return links
    }

    private async computeSlowLenses(
        doc: TextDocument,
        links: CodeLens[],
        viewNames: string[],
    ) {
        const cached = cache.get('bladeLens', doc)

        if (cached) {
            return
        }

        const currentFile = doc.uri.path
        const text = doc.getText()
        const regexes = util.similarIncludeDirectives.map((pattern) => new RegExp(pattern, 'g'))

        for (const regex of regexes) {
            if (regex.source === '(?:)') {
                continue
            }

            for (const match of text.matchAll(regex)) {
                const found = match[match.length - 1] || match[0]
                const files = [...await util.searchForContentInFiles(found)].filter(
                    (file) => file.fileUri.toLowerCase() != currentFile.toLowerCase(),
                )
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

        if (doc.isClosed) {
            return
        }

        cache.set('bladeLens', doc, links)
        this._onDidChangeCodeLenses.fire()
    }
}
