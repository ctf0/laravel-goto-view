'use strict'

import {
    commands,
    env,
    ExtensionContext,
    languages,
    Uri,
    window,
    workspace
} from 'vscode'
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
    context.subscriptions.push(commands.registerCommand('lgtv.copyPath', copyPath))

    context.subscriptions.push(commands.registerCommand('lgtv.openPath', openPath))

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

function copyPath() {
    let editor = window.activeTextEditor
    let {fileName} = editor.document
    let path = fileName
        .replace(/.*views\//, '') // remove start
        .replace(/\.blade.*/, '') // remove end
        .replace(/\//g, '.')      // convert
    let ph = util.config.copiedPathSurround?.replace('$ph', path) || path

    return env.clipboard.writeText(ph)
}

async function openPath() {
    let path = await window.showInputBox({
        placeHolder : 'blade.file.path',
        value       : await env.clipboard.readText() || '',
        validateInput(v) {
            if (!v) {
                return 'you have to add a path'
            } else {
                return ''
            }
        }
    })

    if (path) {
        let viewPath = '/resources/views'

        if (path.includes('::')) {
            let searchFor = path.split('::')
            viewPath = `${viewPath}/vendor/${searchFor[0]}`
            path = searchFor[1]
        }

        let fileName = path.replace(/\./g, '/') + '.blade.php'
        let workspaceFolder = workspace.getWorkspaceFolder(window.activeTextEditor.document.uri) || workspace.workspaceFolders[0]
        let folder = workspaceFolder?.uri.fsPath
        let filePath = Uri.file(`${folder}${viewPath}/${fileName}`)

        return commands.executeCommand('vscode.openFolder', filePath)
    }
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
