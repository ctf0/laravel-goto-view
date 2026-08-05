import escapeStringRegexp from 'escape-string-regexp'
import {
    DocumentLink,
    DocumentLinkProvider,
    Range,
    TextDocument,
    Uri,
    window,
    workspace,
} from 'vscode'
import * as cache from '../libs/cache'
import * as util from '../util'

export default class LinkProvider implements DocumentLinkProvider {
    async provideDocumentLinks(doc: TextDocument): Promise<DocumentLink[]> {
        if (!window.activeTextEditor) {
            return []
        }

        const cached = cache.get('links', doc)

        if (cached) {
            return cached
        }

        const links: DocumentLink[] = []
        util.setWs(doc.uri)

        const calls = util.findViewNameCalls(doc.getText())
        const filePathPromises = new Map()

        for (const {text} of calls) {
            if (!filePathPromises.has(text)) {
                filePathPromises.set(text, util.getFilePath(text))
            }
        }

        for (const {text, index} of calls) {
            const files = await filePathPromises.get(text)
            const range = doc.getWordRangeAtPosition(
                doc.positionAt(index),
                new RegExp(escapeStringRegexp(text)),
            )

            if (files.length && range) {
                for (const file of files) {
                    const link = new DocumentLink(range, file.fileUri)
                    link.tooltip = file.tooltip

                    links.push(link)
                }
            }
        }

        links.push(...await this.findShareLinks(doc))
        cache.set('links', doc, links)

        return links
    }

    private async findShareLinks(doc: TextDocument) {
        return doc.languageId == 'blade'
            ? this.findBladeShareLinks(doc)
            : this.findPhpShareLinks(doc)
    }

    private async findBladeShareLinks(doc: TextDocument) {
        const links = []
        const regex = new RegExp(`${util.viewSharePrefix.blade}[A-Za-z_][A-Za-z0-9_]*`, 'g')
        const matches = [...doc.getText().matchAll(regex)]

        if (!matches.length) {
            return links
        }

        const shareIndex = await this.getPhpShareIndex()

        for (const match of matches) {
            const variable = match[0].slice(1)
            const relatedFiles = shareIndex.get(variable) || []

            if (relatedFiles.length) {
                links.push(this.createShareLink(doc, match.index, match[0].length, relatedFiles, variable))
            }
        }

        return links
    }

    private async findPhpShareLinks(doc: TextDocument) {
        const links = []
        const regex = new RegExp(
            `(?<=(${util.viewShareMethods})\\()['"]([^$*]*?${util.viewSharePrefix.php}[^$*]*?)['"]`,
            'g',
        )
        const matches = [...doc.getText().matchAll(regex)]

        if (!matches.length) {
            return links
        }

        const files = await this.readFiles('**/*.blade.php')

        for (const match of matches) {
            const variable = `$${match[2]}`
            const relatedFiles = files
                .filter(({text}) => text.includes(variable))
                .map(({file}) => file)

            if (relatedFiles.length) {
                links.push(this.createShareLink(doc, match.index + 1, match[2].length, relatedFiles, variable))
            }
        }

        return links
    }

    private async getPhpShareIndex() {
        const cacheKey = ['phpShareIndex', ...util.baseExclude].join('|')
        const cached = cache.getIndex(cacheKey)

        if (cached) {
            return cached
        }

        const index = this.buildShareIndex(await this.readFiles('**/*.php', '**/*.blade.php'), new RegExp(
            `(?<=(${util.viewShareMethods})\\()['"]([^$*]*?${util.viewSharePrefix.php}[^$*]*?)['"]`,
            'g',
        ))

        cache.setIndex(cacheKey, index)

        return index
    }

    private buildShareIndex(files, regex) {
        const index = new Map()

        for (const {file, text} of files) {
            const keys = new Set([...text.matchAll(regex)].map((match) => match[2]))

            for (const key of keys) {
                const relatedFiles = index.get(key) || []
                relatedFiles.push(file)
                index.set(key, relatedFiles)
            }
        }

        return index
    }

    private async readFiles(pattern: string, exclude?: string) {
        const cacheKey = [pattern, exclude, ...util.baseExclude].join('|')
        const cached = cache.getIndex(cacheKey)

        if (cached) {
            return cached
        }

        const excludes = [...util.baseExclude, ...(exclude ? [exclude] : [])]
        const fileExclude = excludes.length > 1
            ? `{${excludes.join(',')}}`
            : excludes[0] || null
        const workspaceFiles = await workspace.findFiles(pattern, fileExclude)
        const files = []

        for (let index = 0; index < workspaceFiles.length; index += 16) {
            files.push(...await this.readFileBatch(workspaceFiles.slice(index, index + 16)))
        }

        cache.setIndex(cacheKey, files)

        return files
    }

    private readFileBatch(files) {
        return Promise.all(files.map(async(file) => ({
            file : {
                label   : workspace.asRelativePath(file, false),
                fileUri : file.fsPath,
            },
            text : await util.fs.readFile(file.fsPath, 'utf8'),
        })))
    }

    private createShareLink(
        doc: TextDocument,
        index: number,
        length: number,
        files: {label: string, fileUri: string}[],
        query: string,
    ) {
        const args = encodeURIComponent(JSON.stringify([files, query]))
        const link = new DocumentLink(
            new Range(doc.positionAt(index), doc.positionAt(index + length)),
            Uri.parse(`command:lgtv.showSimilarCall?${args}`),
        )

        link.tooltip = 'Open related files'

        return link
    }
}
