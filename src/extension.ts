'use strict'

import {
    commands,
    ExtensionContext,
    languages,
    window,
    workspace
} from 'vscode'
import * as cmnds   from './cmnds'
import LinkProvider from './providers/linkProvider'
import * as util    from './util'

let providers = []
const debounce = require('lodash.debounce')

export function activate(context: ExtensionContext) {
    util.readConfig()

    // config
    workspace.onDidChangeConfiguration(async (e) => {
        if (e.affectsConfiguration(util.PACKAGE_NAME)) {
            util.readConfig()
        }
    })

    // command
    context.subscriptions.push(commands.registerCommand('lgtv.copyPath', cmnds.copyPath))
    context.subscriptions.push(commands.registerCommand('lgtv.openPath', cmnds.openPath))

    // links
    setTimeout(() => {
        if (window.activeTextEditor) {
            initProvider()
        }

        window.onDidChangeTextEditorVisibleRanges(
            debounce(function (e) {
                clearAll()
                initProvider()
            }, 250)
        )

        window.onDidChangeActiveTextEditor(
            debounce(function (editor) {
                if (editor) {
                    clearAll()
                    initProvider()
                }
            }, 250)
        )
    }, 2000)

    // create
    cmnds.createFileFromText()
    cmnds.resetLinks.event(() => {
        clearAll()
        initProvider()
    })
}

function initProvider() {
    providers.push(languages.registerDocumentLinkProvider(['php', 'blade'], new LinkProvider()))
}

function clearAll() {
    providers.map((e) => e.dispose())
    providers = []
}

export function deactivate() {
    clearAll()
}
