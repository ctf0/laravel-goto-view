'use strict'

import {env, Uri, workspace} from 'vscode'

export const fs = require('fs-extra')
export const pascalcase = require('pascalcase')
const escapeStringRegexp = require('escape-string-regexp')

let ws = null

/* Link --------------------------------------------------------------------- */
let cache_store_link = []

export async function getFilePath(text, document) {
    ws = workspace.getWorkspaceFolder(document.uri)?.uri.fsPath

    text = text.replace(/['"]/g, '')
    let cache_key = text
    let list = checkCache(cache_store_link, cache_key)

    if (!list.length) {
        let internal = getDocFullPath(defaultPath)
        let char     = '::'

        if (text.includes(char)) {
            text       = text.split(char)
            let vendor = text[0]
            let key    = text[1]

            list = await Promise.all(
                vendorPath.map((item) => {
                    return getData(
                        getDocFullPath(item).replace('*', pascalcase(vendor)),
                        key
                    )
                }).concat([
                    getData(`${internal}/vendor/${vendor}`, key)
                ])
            )

            list = list.filter((e) => e)

            saveCache(cache_store_link, cache_key, list)
        } else {
            list = [getData(internal, text)]

            saveCache(cache_store_link, cache_key, list)
        }
    }

    return list
}

async function getData(fullPath, text) {
    let editor = `${env.uriScheme}://file`
    let fileName = text.replace(/\./g, '/') + '.blade.php'
    let filePath = `${fullPath}/${fileName}`
    let fullFileName = getDocFullPath(filePath, false)
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
                    .parse(`${editor}${filePath}`)
                    .with({authority: 'ctf0.laravel-goto-view'})
            }
            : false
}

function getDocFullPath(path, add = true) {
    return add
        ? path.replace('$base', ws)
        : path.replace(`${ws}/`, '')
}

/* Lens --------------------------------------------------------------------- */

const findInFiles = require('find-in')
let cache_store_lens = []
let similarIncludeFilesCache: any = []

export async function searchForContentInFiles(text, currentFile) {
    let list = checkCache(cache_store_lens, text)

    if (!list.length) {
        for (const path of similarIncludeFilesCache) {
            if (path != currentFile) {
                let found = await findInFiles({path: path, request: [new RegExp(`${text}`)]})

                if (found.some((e) => e.match)) {
                    list.push({
                        label  : getDocFullPath(path, false),
                        detail : path
                    })
                }
            }
        }

        saveCache(cache_store_lens, text, list)
    }

    return list
}

/* Helpers ------------------------------------------------------------------ */

function checkCache(cache_store, text) {
    let check = cache_store.find((e) => e.key == text)

    return check ? check.val : []
}

function saveCache(cache_store, text, val) {
    cache_store.push({
        key : text,
        val : val
    })

    return val
}

/* Config ------------------------------------------------------------------- */
export const PACKAGE_NAME = 'laravelGotoView'

export let config: any = {}
export let methods: string = ''
export let similarIncludeDirectives: string = ''
export let showCodeLens: boolean = true
export let defaultPath: string = ''
export let vendorPath: any = []

export async function readConfig() {
    config = workspace.getConfiguration(PACKAGE_NAME)
    methods = config.methods.map((e) => escapeStringRegexp(e)).join('|')
    similarIncludeDirectives = config.similarIncludeDirectives.map((e) => escapeStringRegexp(e)).join('|')
    defaultPath = config.defaultPath
    vendorPath = config.vendorPath
    showCodeLens = config.showCodeLens

    if (showCodeLens) {
        for (const path of config.similarIncludeFilesRegex) {
            similarIncludeFilesCache.push(await workspace.findFiles(path, '**/.*'))
        }

        similarIncludeFilesCache = similarIncludeFilesCache.flat().map((file) => file.path)
    }
}
