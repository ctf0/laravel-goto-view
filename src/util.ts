import escapeStringRegexp from 'escape-string-regexp'
import debounce from 'lodash.debounce'
import {pascalcase} from 'pascalcase'
import {Uri, workspace, WorkspaceConfiguration} from 'vscode'

const path = require('path')
export const fs = require('fs-extra')
export const sep = path.sep
const scheme = 'command:lgtv.createFileFromText'
let ws

export function setWs(uri) {
    ws = workspace.getWorkspaceFolder(uri)?.uri.fsPath
}

/* Link --------------------------------------------------------------------- */
const routeViewRegex = '(?<=Route::view\\()(?:.*,( +)?)([\'"]([^$*]*?)[\'"])'
const cache_store_link = []

export function findViewNameCalls(text: string): {text: string, index: number}[] {
    const regex = new RegExp(`(?<=(${methods})\\()['"]([^$*]*?)['"]`, 'g')
    const specialRegex = new RegExp(routeViewRegex, 'g')

    return [
        ...[...text.matchAll(regex)].map((match) => ({
            text  : match[2],
            index : match.index,
        })),
        ...[...text.matchAll(specialRegex)].map((match) => ({
            text  : match[3],
            index : match.index,
        })),
    ].map(({text, index}) => ({
        text,
        index : index + text.length,
    }))
}

export async function getFilePath(text) {
    text = text.replace(/['"]/g, '')

    if (text.endsWith('.')) {
        return []
    }

    const cache_key = text
    let list = checkCache(cache_store_link, cache_key)

    if (!list.length) {
        const internal = getDocFullPath(defaultPath)
        const char = '::'

        if (text.includes(char)) {
            text = text.split(char)
            const vendor = text[0]
            const key = text[1]

            list = await Promise.all(
                vendorPath.map((item) => getData(
                    getDocFullPath(item).replace('*', pascalcase(vendor)),
                    key,
                )),
            )
        } else {
            list = [await getData(internal, text)]
        }

        list = list.filter((e) => e)

        if (list.length) {
            saveCache(cache_store_link, cache_key, list)
        }
    }

    return list
}

async function getData(fullPath, text) {
    const fileName = text.replace(/\./g, sep) + '.blade.php'
    const filePath = normalizePath(`${fullPath}${sep}${fileName}`)
    const fullFileName = getDocFullPath(filePath, false)
    const exists = await fs.pathExists(filePath)
    const args = prepareArgs({path: filePath})

    return exists
        ? {
            fileUri : Uri.file(filePath),
        }
        : config.createViewIfNotFound
            ? {
                tooltip : `create "${fullFileName}"`,
                fileUri : Uri.parse(`${scheme}?${args}`),
            }
            : false
}

function prepareArgs(args: object) {
    return encodeURIComponent(JSON.stringify([args]))
}

function normalizePath(path) {
    return path
        .replace(/\/+/g, '/')
        .replace(/\+/g, '\\')
}

function getDocFullPath(path, add = true) {
    return add
        ? replaceSlash(`${ws}${path}`)
        : path.replace(`${ws}${sep}`, '')
}

/* Lens --------------------------------------------------------------------- */

const findInFiles = require('find-in')
const cache_store_lens = []
let similarIncludeFilesCache: any = []

export async function searchForContentInFiles(text) {
    const list = checkCache(cache_store_lens, text)

    if (!list.length) {
        for (const path of similarIncludeFilesCache) {
            const found = await findInFiles({
                path,
                request : [text],
            })

            if (found.some((e) => e.match)) {
                list.push({
                    label   : getDocFullPath(path, false),
                    fileUri : path,
                })
            }
        }

        saveCache(cache_store_lens, text, list)
    }

    return list
}

/* Content ------------------------------------------------------------------ */

export async function listenForFileChanges(subscriptions) {
    if (config.watchFilesForChange) {
        try {
            const watcher = workspace.createFileSystemWatcher('**/*.blade.php')

            subscriptions.push(
                watcher.onDidChange(
                    debounce(async(e) => await saveSimilarIncludeFilesCache(), 60 * 1000),
                ),
            )
        } catch (error) {
            // console.error(error);
        }
    }
}

async function saveSimilarIncludeFilesCache() {
    if (config.showCodeLens) {
        for (const path of config.similarIncludeFilesRegex) {
            similarIncludeFilesCache.push(await workspace.findFiles(path, '**/.*'))
        }

        similarIncludeFilesCache = similarIncludeFilesCache.flat().map((file) => file.path)
    }
}

/* Helpers ------------------------------------------------------------------ */

function checkCache(cache_store, text) {
    const check = cache_store.find((e) => e.key == text)

    return check ? check.val : []
}

function saveCache(cache_store, text, val) {
    checkCache(cache_store, text).length
        ? false
        : cache_store.push({
            key : text,
            val : val,
        })

    return val
}

/* Config ------------------------------------------------------------------- */
export const PACKAGE_NAME = 'laravelGotoView'

export let config: WorkspaceConfiguration
export let methods = ''
export let bladeMethods = ''
export let phpMethods = ''
export let viewShareMethods = ''
export let viewSharePrefix = {
    blade : '',
    php   : '',
}
export let similarIncludeDirectives: any = []
export let defaultPath = ''
export let vendorPath: any = []
export let baseExclude: any = []

export async function readConfig() {
    config = workspace.getConfiguration(PACKAGE_NAME)

    bladeMethods = config.bladeMethods.map((e) => (e.includes('?') ? e : escapeStringRegexp(e))).join('|')
    phpMethods = config.phpMethods.map((e) => (e.includes('?') ? e : escapeStringRegexp(e))).join('|')
    methods = [...config.phpMethods, ...config.bladeMethods].map((e) => (e.includes('?') ? e : escapeStringRegexp(e))).join('|')

    viewShareMethods = config.viewShareMethods.map((e) => (e.includes('?') ? e : escapeStringRegexp(e))).join('|')
    viewSharePrefix = {
        blade : escapeStringRegexp(`$${config.viewShareVariablePrefix}`),
        php   : escapeStringRegexp(config.viewShareVariablePrefix),
    }

    similarIncludeDirectives = config.similarIncludeDirectives
    defaultPath = replaceSlash(config.defaultPath)
    vendorPath = config.vendorPath.map((item) => replaceSlash(item))

    baseExclude = Object.entries(workspace.getConfiguration('files').get('exclude', {}))
        .filter(([pattern, excluded]) => excluded)
        .map(([pattern]) => pattern)

    await saveSimilarIncludeFilesCache()
}

export function replaceSlash(item) {
    return item.replace(/[\\/]/g, sep)
}

/* View Name ---------------------------------------------------------------- */

export function getViewName(fileName: string, keepFullPath = false, workspaceFolder?: string): string|undefined {
    const ws = workspaceFolder ?? workspace.workspaceFolders?.[0]?.uri.fsPath

    if (!ws) {
        return undefined
    }

    fileName = fileName.replace(ws, '')

    if (fileName.startsWith('/vendor/')) {
        return undefined
    }

    const rawPath = viewPathToBlade(fileName)

    let path = rawPath

    if (keepFullPath) {
        path = rawPath
    }

    if (rawPath.startsWith('components.') && !keepFullPath) {
        path = rawPath.replace('components.', '')
    }

    const filePath = fileName.replace(/[\\/]/g, '/')
    const module = vendorPath.map((vendorPath) => {
        const [prefix, suffix] = vendorPath.replace(/[\\/]/g, '/').split('*')
        const start = filePath.indexOf(prefix)
        const end = filePath.indexOf(suffix, start + prefix.length)

        return start >= 0 && end > start
            ? filePath.slice(start + prefix.length, end)
            : ''
    }).find((name) => name)

    if (module) {
        return `${module.toLowerCase()}::${path}`
    }

    if (path.startsWith('vendor.')) {
        return path.replace('vendor.', '').replace(/\./, '::')
    }

    return path
}

export function viewPathToBlade(fsPath: string) {
    return fsPath
        .replace(/.*views[\\/]/, '') // remove start
        .replace(/\.blade.*/, '')    // remove end
        .replace(/[\\/]/g, '.')      // convert
}

export function getViewNames(fsPath: string): string[] {
    const viewName = getViewName(fsPath)

    if (!viewName) {
        return []
    }

    const componentPath = viewPathToBlade(fsPath)

    if (componentPath.startsWith('components.')) {
        return [
            viewName,
            viewName.includes('::')
                ? viewName.replace('::', '::components.')
                : `components.${viewName}`,
        ]
    }

    if (componentPath.startsWith('livewire.')) {
        return [
            viewName,
            viewName.includes('::')
                ? viewName.replace('::', '::livewire.')
                : `livewire.${viewName}`,
        ]
    }

    return [viewName]
}

const phpCallersCache = new Map<string, {result: any[], timestamp: number}>()
const phpCallersInflight = new Map<string, Promise<any[]>>()

export function clearPhpCallersCache() {
    phpCallersCache.clear()
    phpCallersInflight.clear()
}

function phpCallersCacheKey(viewNames: string[]) {
    return viewNames.slice().sort().join('\x00')
}

export async function findPhpCallers(viewNames: string[]) {
    const key = phpCallersCacheKey(viewNames)

    // return fresh cached result
    const cached = phpCallersCache.get(key)

    if (cached && Date.now() - cached.timestamp < 30_000) {
        return cached.result
    }

    // dedup concurrent in-flight calls
    const inflight = phpCallersInflight.get(key)

    if (inflight) {
        return inflight
    }

    const promise = findPhpCallersRaw(viewNames)
    phpCallersInflight.set(key, promise)

    try {
        const result = await promise
        phpCallersCache.set(key, {result, timestamp: Date.now()})

        return result
    } finally {
        phpCallersInflight.delete(key)
    }
}

async function findPhpCallersRaw(viewNames: string[]) {
    const files = await workspace.findFiles('**/*.php', getPhpExclude())
    const regex = new RegExp(`(?<=(${phpMethods})\\()['"]([^$*]*?)['"]`, 'g')
    const specialRegex = new RegExp(routeViewRegex, 'g')
    const callers = []

    for (const file of files) {
        const text = await fs.readFile(file.fsPath, 'utf8')
        const matches = [
            ...[...text.matchAll(regex)].map((match) => match[2]),
            ...[...text.matchAll(specialRegex)].map((match) => match[3]),
        ]

        if (matches.some((match) => viewNames.includes(match))) {
            callers.push({
                label   : workspace.asRelativePath(file, false),
                fileUri : file.fsPath,
            })
        }
    }

    return callers
}

function getPhpExclude() {
    const excludes = baseExclude.filter((pattern) => !pattern.toLowerCase().includes('vendor'))

    return excludes.length > 1
        ? `{${excludes.join(',')}}`
        : excludes[0] || null
}
