'use strict'

import {
    commands,
    env,
    EventEmitter,
    Position,
    Range,
    Selection,
    Uri,
    window,
    workspace,
    WorkspaceEdit
} from 'vscode'
import * as util from './util'

export const resetLinks = new EventEmitter()

export async function getFilePath(text) {
    let internal = getWsFullPath(util.defaultPath)
    let char     = '::'

    if (text.includes(char)) {
        text       = text.split(char)
        let vendor = text[0]
        let key    = text[1]

        return Promise.all(
            util.vendorPath.map((item) => {
                return getData(
                    getWsFullPath(item).replace('*', util.pascalcase(vendor)),
                    key
                )
            }).concat([
                getData(`${internal}${util.sep}vendor${util.sep}${vendor}`, key)
            ])
        ).then((data) => {
            return data.filter((e) => e)
        })
    }

    return [getData(internal, text)]
}

async function getData(fullPath, text) {
    let fileName = text.replace(/\./g, util.sep) + '.blade.php'
    let filePath = `${fullPath}${util.sep}${fileName}`
    let exists   = await util.fs.pathExists(filePath)

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
        ? `${ws}${path}`.replace(/[\\\/]/g, util.sep)
        : path.replace(ws, '')
}

/* Copy --------------------------------------------------------------------- */

export function copyPath() {
    let editor     = window.activeTextEditor
    let {fileName} = editor.document
    let path       = fileName
        .replace(/.*views[\\\/]/, '') // remove start
        .replace(/\.blade.*/, '')     // remove end
        .replace(/[\\\/]/g, '.')      // convert

    let ph = util.config.copiedPathSurround?.replace('$ph', path) || path

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

                if (util.config.createViewIfNotFound) {
                    let defVal = util.config.viewDefaultValue

                    if (defVal) {
                        edit.insert(file, new Position(0, 0), defVal)
                    }

                    await workspace.applyEdit(edit)

                    window.showInformationMessage(`Laravel Goto View: "${path}" created`)
                    resetLinks.fire(resetLinks)

                    if (util.config.activateViewAfterCreation) {
                        commands.executeCommand('vscode.openFolder', file)
                    }
                }
            }
        }
    })
}

/* Show Similar ------------------------------------------------------------- */

export async function showSimilarCall(files, query, currentFile) {
    files   = files.filter((e) => e.detail != currentFile)
    let len = files.length
    let all = `Open All (${len})`
    let pad = '-'.repeat(94)

    let list = len <= 1
        ? files
        : [...files, {
            label  : all,
            detail : pad
        }]

    return window.showQuickPick(
        list,
        {
            ignoreFocusOut : false,
            placeHolder    : `chose file to open (${len})`
        }
    ).then(async (selection: any) => {
        if (selection) {
            if (selection.label != all) {
                return commands.executeCommand('vscode.openFolder', Uri.file(selection.detail))
                    .then(() => {
                        setTimeout(() => {
                            let editor = window.activeTextEditor
                            let range  = getTextPosition(query, editor.document)

                            if (range) {
                                editor.selection = new Selection(range.start, range.end)
                                editor.revealRange(range, 3)
                            }
                        }, 500)
                    })
            }

            for (const file of files) {
                await commands.executeCommand('vscode.openFolder', Uri.file(file.detail))
            }
        }
    })
}

function getTextPosition(searchFor, doc) {
    const regex = new RegExp(searchFor)
    const match = regex.exec(doc.getText())

    if (match) {
        let pos = doc.positionAt(match.index + match[0].length)

        return new Range(pos, pos)
    }
}
