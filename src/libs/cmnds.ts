import escapeStringRegexp from 'escape-string-regexp'
import {pascalcase} from 'pascalcase'
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
    WorkspaceEdit,
} from 'vscode'
import * as util from '../util'

export const resetLinks = new EventEmitter()

export async function getFilePath(text) {
    const internal = getWsFullPath(util.defaultPath)
    const external = '::'
    const component = 'x-'
    let isComponent = false

    if (text.includes(component)) {
        text = text.split(component)
        text = text[1]
        isComponent = true
    }

    const extra = isComponent ? `components${util.sep}` : ''

    if (text.includes(external)) {
        text = text.split(external)
        const vendor = text[0]
        const key = `${extra}${text[1]}`

        return Promise.all(
            util.vendorPath.map((item) => getData(
                getWsFullPath(item).replace('*', pascalcase(vendor)),
                key,
            )).concat([
                getData(`${internal}${util.sep}vendor${util.sep}${vendor}`, key),
            ]),
        ).then((data) => data.filter((e) => e))
    }

    return [await getData(internal, `${extra}${text}`)]
}

async function getData(fullPath, text) {
    const fileName = text.replace(/\./g, util.sep) + '.blade.php'
    const filePath = `${fullPath}${util.sep}${fileName}`
    const exists = await util.fs.pathExists(filePath)

    if (exists) {
        return {
            tooltip : getWsFullPath(filePath, false),
            fileUri : filePath,
        }
    }
}

function getWsFullPath(path, add = true) {
    const ws = workspace.workspaceFolders[0]?.uri.fsPath

    return add
        ? util.replaceSlash(`${ws}${path}`)
        : path.replace(ws, '')
}

/* Copy --------------------------------------------------------------------- */

export function copyPath() {
    const editor = window.activeTextEditor
    const {fileName} = editor.document
    const path = util.getViewName(fileName)
    const isComponent = fileName
        .replace(/.*views[\\/]/, '')
        .replace(/\.blade.*/, '')
        .replace(/[\\/]/g, '.')
        .startsWith('components.')

    const ph = isComponent
        ? `<x-${path}>`
        : util.config.copiedPathSurround?.replace('$ph', path) || path

    env.clipboard.writeText(ph)

    window.showInformationMessage(`Copied: "${ph}"`)
}

/* Open --------------------------------------------------------------------- */

export async function openPath() {
    let filePath = await window.showInputBox({
        placeHolder : 'blade.file.path',
        value       : await env.clipboard.readText() || '',
        validateInput(v) {
            if (!v) {
                return 'you have to add a path'
            } else {
                return ''
            }
        },
    })

    if (filePath) {
        filePath = filePath.replace(/['"]/g, '')
        const files: any = await getFilePath(filePath)
        const len = files.length

        if (
            len == 0
            || (len == 1 && files[0] == undefined)
        ) {
            return window.showInformationMessage(`Laravel Goto View: "${filePath}" not found`)
        }

        // open if only one
        if (len == 1) {
            return openFile(files[0])
        }

        // show picker if > one
        await window.showQuickPick(
            files.map((file: any) => ({
                label   : file.tooltip,
                fileUri : file.fileUri,
            })),
            {
                ignoreFocusOut : true,
                placeHolder    : 'choose file to open',
            },
        ).then((selection: any) => {
            if (selection) {
                return openFile(selection)
            }
        })
    }
}

/* Create ------------------------------------------------------------------- */

export async function createFileFromText(args) {
    if (args == undefined) {
        return
    }

    const {path} = args
    const file = Uri.file(path)
    const edit = new WorkspaceEdit()
    edit.createFile(file) // open or create new file

    const defVal = util.config.viewDefaultValue

    if (defVal) {
        edit.insert(file, new Position(0, 0), defVal)
    }

    await workspace.applyEdit(edit)

    window.showInformationMessage(`Laravel Goto View: "${path}" created`)
    resetLinks.fire(resetLinks)

    if (util.config.activateViewAfterCreation) {
        return openFile(file)
    }
}

/* Show Similar ------------------------------------------------------------- */

export async function filesPicker(files, query) {
    const len = files.length

    if (len == 1) {
        return openFile(files[0], query)
    }

    const all = `Open All (${len})`

    const list = [...files, {
        label  : ' ',
        detail : all,
    }]

    return window.showQuickPick(
        list,
        {
            ignoreFocusOut : false,
            placeHolder    : `chose file to open (${len})`,
        },
    ).then(async(selection: any) => {
        if (selection) {
            if (selection.detail != all) {
                return openFile(selection, query)
            }

            for (const file of files) {
                await openFile(file)
            }
        }
    })
}

function openFile(file: any, query: any) {
    return commands.executeCommand('vscode.open', Uri.file(file.fileUri))
        .then(() => {
            if (query) {
                setTimeout(() => {
                    const editor = window.activeTextEditor
                    const range = getTextPosition(query, editor.document)

                    if (range) {
                        editor.selection = new Selection(range.start, range.end)
                        editor.revealRange(range, 3)
                    }
                }, 500)
            }
        })
}

function getTextPosition(searchFor, doc) {
    const queries = Array.isArray(searchFor) ? searchFor : [searchFor]
    const text = doc.getText()

    for (const query of queries) {
        const match = new RegExp(escapeStringRegexp(query)).exec(text)

        if (match) {
            const pos = doc.positionAt(match.index + match[0].length)

            return new Range(pos, pos)
        }
    }
}
