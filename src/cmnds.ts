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
import {config, defaultPath, fs, pascalcase, vendorPath} from './util'

export const resetLinks = new EventEmitter()

export async function getFilePath(text) {
    let internal = getWsFullPath(defaultPath)

    if (text.includes('::')) {
        text = text.split('::')
        let vendor = text[0]
        let key = text[1]

        return Promise.all(
            vendorPath.map((item) => {
                return getData(
                    getWsFullPath(item).replace('*', pascalcase(vendor)),
                    key
                )
            }).concat([
                getData(`${internal}/vendor/${vendor}`, key)
            ])
        ).then((data) => {
            return data.filter((e) => e)
        })
    }

    return [getData(internal, text)]
}

async function getData(fullPath, text) {
    let fileName = text.replace(/\./g, '/') + '.blade.php'
    let filePath = `${fullPath}/${fileName}`
    let exists = await fs.pathExists(filePath)

    if (exists) {
        return {
            tooltip : getWsFullPath(filePath, false),
            fileUri : filePath
        }
    }
}

function getWsFullPath(path, add = true) {
    let ws = workspace.workspaceFolders[0]?.uri.fsPath

    return add
        ? path.replace('$base', ws)
        : path.replace(ws, '')
}

/* Copy --------------------------------------------------------------------- */

export function copyPath() {
    let editor = window.activeTextEditor
    let {fileName} = editor.document
    let path = fileName
        .replace(/.*views\//, '') // remove start
        .replace(/\.blade.*/, '') // remove end
        .replace(/\//g, '.')      // convert
    let ph = config.copiedPathSurround?.replace('$ph', path) || path

    return env.clipboard.writeText(ph)
}

/* Open --------------------------------------------------------------------- */

export async function openPath() {
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
        let files: any = await getFilePath(path)

        // open if only one
        if (files.length == 1) {
            return commands.executeCommand('vscode.openFolder', Uri.file(files[0].fileUri))
        }

        // show picker if > one
        await window.showQuickPick(
            files.map((file: any) => {
                return {
                    label  : file.tooltip,
                    detail : file.fileUri
                }
            }),
            {
                ignoreFocusOut : true,
                placeHolder    : 'chose file to open'
            }
        ).then((selection: any) => {
            if (selection) {
                return commands.executeCommand('vscode.openFolder', Uri.file(selection.detail))
            }
        })
    }
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
