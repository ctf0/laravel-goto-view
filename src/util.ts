'use strict'

import {env, Uri, workspace} from 'vscode'

export const fs = require('fs-extra')
export const pascalcase = require('pascalcase')

export async function getFilePath(text, document) {
    text = text.replace(/['"]/g, '')
    let internal = getDocFullPath(document, defaultPath)

    if (text.includes('::')) {
        text = text.split('::')
        let vendor = text[0]
        let key = text[1]

        return Promise.all(
            vendorPath.map((item) => {
                return getData(
                    document,
                    getDocFullPath(document, item).replace('*', pascalcase(vendor)),
                    key
                )
            }).concat([
                getData(document, `${internal}/vendor/${vendor}`, key)
            ])
        ).then((data) => {
            return data.filter((e) => e)
        })
    }

    return [getData(document, internal, text)]
}

async function getData(document, fullPath, text) {
    let editor = `${env.uriScheme}://file`
    let fileName = text.replace(/\./g, '/') + '.blade.php'
    let filePath = `${fullPath}/${fileName}`
    let fullFileName = getDocFullPath(document, filePath, false)
    let exists = await fs.pathExists(filePath)

    return exists
        ? {
            tooltip : fullFileName,
            fileUri : Uri.file(filePath)
        }
        : config.createViewIfNotFound
            ? {
                tooltip : `create "${fullFileName}"`,
                fileUri : Uri
                    .parse(`${editor}${fullPath}/${fileName}`)
                    .with({authority: 'ctf0.laravel-goto-view'})
            }
            : false
}

function getDocFullPath(doc, path, add = true) {
    let ws = workspace.getWorkspaceFolder(doc.uri)?.uri.fsPath

    return add
        ? path.replace('$base', ws)
        : path.replace(`${ws}/`, '')
}

/* Config ------------------------------------------------------------------- */
const escapeStringRegexp = require('escape-string-regexp')
export const PACKAGE_NAME = 'laravelGotoView'
export let config: any = {}
export let methods: string = ''

export let defaultPath: string = ''
export let vendorPath: any = []

export function readConfig() {
    config = workspace.getConfiguration(PACKAGE_NAME)
    methods = config.methods.map((e) => escapeStringRegexp(e)).join('|')
    defaultPath = config.defaultPath
    vendorPath = config.vendorPath
}
