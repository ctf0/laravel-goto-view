'use strict'

import {
    workspace,
    Uri,
    window,
    env,
    WorkspaceEdit,
    commands
} from 'vscode'

const fs = require("fs-extra")

export async function getFilePath(text, document) {
    let info = text.replace(/['"]/g, '')
    let viewPath = '/resources/views'

    if (info.includes("::")) {
        let searchFor = info.split('::')
        viewPath = `${viewPath}/vendor/${searchFor[0]}`
        info = searchFor[1]
    }

    return getData(document, viewPath, info)
}

async function getData(document, path, list) {
    let workspaceFolder = workspace.getWorkspaceFolder(document.uri).uri.fsPath
    let editor = `${env.uriScheme}://file`
    let fileName = list.replace(/\./g, '/') + '.blade.php'
    let filePath = `${workspaceFolder}${path}/${fileName}`
    let exists = await fs.pathExists(filePath)

    if (exists) {
        return {
            "tooltip": fileName,
            "fileUri": Uri.file(filePath)
        }
    }

    return {
        "tooltip": `create "${fileName}"`,
        fileUri: Uri
            .parse(`${editor}${workspaceFolder}${path}/${fileName}`)
            .with({ authority: 'ctf0.laravel-goto-view' })
    }
}

/* Create ------------------------------------------------------------------- */
export function createFileFromText() {
    window.registerUriHandler({
        async handleUri(uri) {
            let { authority, path } = uri

            if (authority == 'ctf0.laravel-goto-view') {
                let edit = await new WorkspaceEdit()
                let file = Uri.file(path)
                edit.createFile(file)
                await workspace.applyEdit(edit)
                commands.executeCommand('vscode.openFolder', file)
            }
        }
    })
}

/* Config ------------------------------------------------------------------- */
const escapeStringRegexp = require('escape-string-regexp')
export let methods: any = ''

export function readConfig() {
    let config = workspace.getConfiguration('laravel_goto_view')
    methods = config.methods.map((e) => escapeStringRegexp(e)).join('|')
}
