'use strict'

import {
    commands,
    env,
    EventEmitter,
    Position,
    Uri,
    window,
    workspace,
    WorkspaceEdit
} from 'vscode'

const fs = require('fs-extra')
export const resetLinks = new EventEmitter()

export async function getFilePath(text, document) {
    let info = text.replace(/['"]/g, '')
    let viewPath = '/resources/views'

    if (info.includes('::')) {
        let searchFor = info.split('::')
        viewPath = `${viewPath}/vendor/${searchFor[0]}`
        info = searchFor[1]
    }

    return getData(document, viewPath, info)
}

async function getData(document, path, list) {
    let workspaceFolder = workspace.getWorkspaceFolder(document.uri)?.uri.fsPath
    let editor = `${env.uriScheme}://file`
    let fileName = list.replace(/\./g, '/') + '.blade.php'
    let filePath = `${workspaceFolder}${path}/${fileName}`
    let exists = await fs.pathExists(filePath)

    return exists
        ? {
            tooltip : fileName,
            fileUri : Uri.file(filePath)
        }
        : config.createViewIfNotFound
            ? {
                tooltip : `create "${fileName}"`,
                fileUri : Uri
                    .parse(`${editor}${workspaceFolder}${path}/${fileName}`)
                    .with({authority: 'ctf0.laravel-goto-view'})
            }
            : false
}

/* Create ------------------------------------------------------------------- */
export function createFileFromText() {
    window.registerUriHandler({
        async handleUri(provider) {
            let {authority, path} = provider

            if (authority == 'ctf0.laravel-goto-view') {
                let file = Uri.file(path)
                let edit = new WorkspaceEdit()
                edit.createFile(file) // open or create new file

                if (config.createViewIfNotFound) {
                    let defVal = config.viewDefaultValue

                    if (defVal) {
                        edit.insert(file, new Position(0, 0), defVal)
                    }

                    await workspace.applyEdit(edit)

                    window.showInformationMessage(`Laravel Goto View: "${path}" created`)
                    resetLinks.fire(resetLinks)

                    if (config.activateViewAfterCreation) {
                        commands.executeCommand('vscode.openFolder', file)
                    }
                }
            }
        }
    })
}

/* Config ------------------------------------------------------------------- */
const escapeStringRegexp = require('escape-string-regexp')
export const PACKAGE_NAME = 'laravelGotoView'
export let config: any = {}
export let methods: any = ''

export function readConfig() {
    config = workspace.getConfiguration(PACKAGE_NAME)
    methods = config.methods.map((e) => escapeStringRegexp(e)).join('|')
}
