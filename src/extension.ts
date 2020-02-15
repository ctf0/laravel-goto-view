'use strict'

import {
    languages,
    ExtensionContext,
    window,
    commands,
    workspace,
    env
} from 'vscode'
import LinkProvider from './providers/linkProvider'
import * as util from './util'

let providers = []
const debounce = require('lodash.debounce')

export function activate(context: ExtensionContext) {
    util.readConfig()

    // config
    workspace.onDidChangeConfiguration(async (e) => {
        if (e.affectsConfiguration('laravel_goto_view')) {
            util.readConfig()
        }
    })

    // command
    context.subscriptions.push(commands.registerCommand('lgtv.copyPath', () => {
        let editor = window.activeTextEditor
        let { fileName } = editor.document
        let path = fileName
            .replace(/.*views\//, '') // remove start
            .replace(/\.blade.*/, '') // remove end
            .replace(/\//g, '.')      // convert
        let ph = util.config.copiedPathSurround?.replace('$ph', path) || path

        return env.clipboard.writeText(ph)
    }))

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
    util.createFileFromText()
    util.resetLinks.event(() => {
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
