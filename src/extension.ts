'use strict'

import {
    commands,
    ExtensionContext,
    languages,
    window,
    workspace
} from 'vscode'
import * as cmnds   from './cmnds'
import LensProvider from './providers/lensProvider'
import LinkProvider from './providers/linkProvider'
import * as util    from './util'

let providers  = []
const debounce = require('lodash.debounce')

export async function activate(context: ExtensionContext) {
    await util.readConfig()

    // config
    workspace.onDidChangeConfiguration(async (e) => {
        if (e.affectsConfiguration(util.PACKAGE_NAME)) {
            await util.readConfig()
        }
    })

    // command
    context.subscriptions.push(commands.registerCommand('lgtv.copyPath', cmnds.copyPath))
    context.subscriptions.push(commands.registerCommand('lgtv.openPath', cmnds.openPath))
    context.subscriptions.push(commands.registerCommand('lgtv.showSimilarCall', cmnds.showSimilarCall))

    // links
    initProviders()
    window.onDidChangeActiveTextEditor(async (e) => {
        await clearAll()
        initProviders()
    })

    // create
    cmnds.createFileFromText()
    cmnds.resetLinks.event(async () => {
        await clearAll()
        initProviders()
    })

    // .blade files changes
    await util.listenForFileChanges()
}

const initProviders = debounce(function() {
    providers.push(languages.registerDocumentLinkProvider(['php', 'blade'], new LinkProvider()))

    if (util.showCodeLens) {
        providers.push(languages.registerCodeLensProvider(['blade'], new LensProvider()))
    }
}, 250)


function clearAll() {
    return new Promise((res, rej) => {
        providers.map((e) => e.dispose())
        providers = []

        setTimeout(() => {
            return res(true)
        }, 500)
    })
}

export function deactivate() {
    clearAll()
}
