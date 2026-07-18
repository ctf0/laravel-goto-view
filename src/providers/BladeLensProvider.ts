import {
    CodeLens,
    CodeLensProvider,
    Range,
    TextDocument,
    window,
    workspace,
} from 'vscode'
import * as cache from '../libs/cache'
import {getViewName} from '../libs/cmnds'
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
                    title   : '$(copy) Copy File Path',
                }),
            ]

            const viewName = getViewName(uri.fsPath)
            const componentPath = uri.fsPath
                .replace(/.*views[\\/]/, '')
                .replace(/\.blade.*/, '')
                .replace(/[\\/]/g, '.')
            const viewNames = componentPath.startsWith('components.')
                ? [
                    viewName,
                    viewName.includes('::')
                        ? viewName.replace('::', '::components.')
                        : `components.${viewName}`,
                ]
                : [viewName]
            const callers = await this.findPhpCallers(viewNames)

            if (callers.length) {
                links.push(
                    new CodeLens(new Range(0, 0, 0, 0), {
                        command   : 'lgtv.showSimilarCall',
                        title     : `$(go-to-file) Open PHP callers (${callers.length})`,
                        arguments : [callers, viewNames],
                    }),
                )
            }

            const currentFile = uri.path
            const text = doc.getText()
            const regexes = util.similarIncludeDirectives.map((pattern) => new RegExp(pattern, 'g'))

            for (const regex of regexes) {
                for (const match of text.matchAll(regex)) {
                    const found = match[match.length - 1] || match[0]
                    const files = [...await util.searchForContentInFiles(found)].filter((file) => file.absolutePath.toLowerCase() != currentFile.toLowerCase())
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

    private async findPhpCallers(viewNames: string[]) {
        const files = await workspace.findFiles('**/*.php', this.getPhpExclude())
        const regex = new RegExp(`(?<=(${util.phpMethods})\\()['"]([^$*]*?)['"]`, 'g')
        const specialRegex = new RegExp(util.routeViewRegex, 'g')
        const callers = []

        for (const file of files) {
            const text = await util.fs.readFile(file.fsPath, 'utf8')
            const matches = [
                ...[...text.matchAll(regex)].map((match) => match[2]),
                ...[...text.matchAll(specialRegex)].map((match) => match[3]),
            ]

            if (matches.some((match) => viewNames.includes(match))) {
                callers.push({
                    label        : workspace.asRelativePath(file, false),
                    absolutePath : file.fsPath,
                })
            }
        }

        return callers
    }

    private getPhpExclude() {
        const excludes = util.baseExclude.filter((pattern) => !pattern.toLowerCase().includes('vendor'))

        return excludes.length > 1
            ? `{${excludes.join(',')}}`
            : excludes[0] || null
    }
}
