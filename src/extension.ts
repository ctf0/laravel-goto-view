import debounce from 'lodash.debounce'
import {
    commands,
    ExtensionContext,
    languages,
    window,
    workspace,
} from 'vscode'
import {clear as clearCache} from './libs/cache'
import * as cmnds from './libs/cmnds'
import BladeCodeActionProvider from './providers/BladeCodeActionProvider'
import BladeLensProvider from './providers/BladeLensProvider'
import LinkProvider from './providers/LinkProvider'
import * as util from './util'

let providers = []
let providerInstances: {dispose(): void}[] = []

export type LaravelGotoViewApi = {
    getViewName(
        fileName: string,
        keepFullPath: boolean,
        workspaceFolder?: string,
    ): string|undefined
    findViewNameCalls(text: string): {text: string, index: number}[]
}

export async function activate(context: ExtensionContext): Promise<LaravelGotoViewApi> {
    util.readConfig()

    // config
    workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration(util.PACKAGE_NAME)) {
            util.readConfig()
            clearCache()
            util.clearPhpCallersCache()
        }
    })

    context.subscriptions.push(
        workspace.onDidChangeTextDocument(() => {
            clearCache()
        }),
    )

    // command
    context.subscriptions.push(
        commands.registerCommand('lgtv.copyPath', cmnds.copyPath),
        commands.registerCommand('lgtv.openPath', cmnds.openPath),
        commands.registerCommand('lgtv.showSimilarCall', cmnds.filesPicker),
        commands.registerCommand('lgtv.createFileFromText', cmnds.createFileFromText),
    )

    // links
    initProviders()
    context.subscriptions.push(
        window.onDidChangeActiveTextEditor(async(e) => {
            await clearAll()
            initProviders()
        }),
    )

    // create
    cmnds.resetLinks.event(async() => {
        clearCache()
        util.clearPhpCallersCache()
        await clearAll()
        initProviders()
    })

    // .blade files changes
    await util.listenForFileChanges(context.subscriptions)

    return {
        getViewName       : util.getViewName,
        findViewNameCalls : util.findViewNameCalls,
    }
}

const initProviders = debounce(() => {
    const linkProvider = new LinkProvider()
    providers.push(languages.registerDocumentLinkProvider(['php', 'blade'], linkProvider))

    const codeActionProvider = new BladeCodeActionProvider()
    providers.push(languages.registerCodeActionsProvider(['blade'], codeActionProvider, {
        providedCodeActionKinds : BladeCodeActionProvider.providedCodeActionKinds,
    }))
    providerInstances.push(codeActionProvider)

    if (util.config.showCodeLens) {
        const bladeLensProvider = new BladeLensProvider()
        providers.push(languages.registerCodeLensProvider(['blade'], bladeLensProvider))
        providerInstances.push(bladeLensProvider)
    }
}, 250)

function clearAll() {
    return new Promise((res, rej) => {
        providers.map((e) => e.dispose())
        providers = []

        providerInstances.map((e) => e.dispose())
        providerInstances = []

        setTimeout(() => res(true), 500)
    })
}

export function deactivate() {
    clearAll()
}
