import escapeStringRegexp from 'escape-string-regexp';
import debounce from 'lodash.debounce';
import { pascalcase } from 'pascalcase';
import { Uri, workspace, WorkspaceConfiguration } from 'vscode';

const path = require('path');
export const fs = require('fs-extra');
export const sep = path.sep;
const scheme = 'command:lgtv.createFileFromText'
let ws;

export function setWs(uri) {
    ws = workspace.getWorkspaceFolder(uri)?.uri.fsPath;
}

/* Link --------------------------------------------------------------------- */
const cache_store_link = [];

export async function getFilePath(text) {
    text = text.replace(/['"]/g, '');

    if (text.endsWith('.')) {
        return [];
    }

    const cache_key = text;
    let list = checkCache(cache_store_link, cache_key);

    if (!list.length) {
        const internal = getDocFullPath(defaultPath);
        const char = '::';

        if (text.includes(char)) {
            text = text.split(char);
            const vendor = text[0];
            const key = text[1];

            list = await Promise.all(
                vendorPath.map((item) => getData(
                    getDocFullPath(item).replace('*', pascalcase(vendor)),
                    key,
                )).concat([
                    await getData(`${internal}${sep}vendor${sep}${vendor}`, key),
                ]),
            );
        } else {
            list = [await getData(internal, text)];
        }

        list = list.filter((e) => e);

        if (list.length) {
            saveCache(cache_store_link, cache_key, list);
        }
    }

    return list;
}

async function getData(fullPath, text) {
    const fileName = text.replace(/\./g, sep) + '.blade.php';
    const filePath = normalizePath(`${fullPath}${sep}${fileName}`);
    const fullFileName = getDocFullPath(filePath, false);
    const exists = await fs.pathExists(filePath);
    const args = prepareArgs({ path: filePath });

    return exists
        ? {
            tooltip: fullFileName,
            fileUri: Uri.file(filePath),
        }
        : config.createViewIfNotFound
            ? {
                tooltip: `create "${fullFileName}"`,
                fileUri: Uri.parse(`${scheme}?${args}`),
            }
            : false;
}

function prepareArgs(args: object) {
    return encodeURIComponent(JSON.stringify([args]));
}

function normalizePath(path) {
    return path
        .replace(/\/+/g, '/')
        .replace(/\+/g, '\\');
}

function getDocFullPath(path, add = true) {
    return add
        ? util.replaceSlash(`${ws}${path}`)
        : path.replace(`${ws}${sep}`, '');
}

/* Lens --------------------------------------------------------------------- */

const findInFiles = require('find-in');
const cache_store_lens = [];
let similarIncludeFilesCache: any = [];

export async function searchForContentInFiles(text) {
    const list = checkCache(cache_store_lens, text);

    if (!list.length) {
        for (const path of similarIncludeFilesCache) {
            const found = await findInFiles({
                path,
                request: [text],
            });

            if (found.some((e) => e.match)) {
                list.push({
                    label: getDocFullPath(path, false),
                    detail: path,
                });
            }
        }

        saveCache(cache_store_lens, text, list);
    }

    return list;
}

/* Content ------------------------------------------------------------------ */

export async function listenForFileChanges(subscriptions) {
    if (config.watchFilesForChange) {
        try {
            const watcher = workspace.createFileSystemWatcher('**/*.blade.php');

            subscriptions.push(
                watcher.onDidChange(
                    debounce(async (e) => await saveSimilarIncludeFilesCache(), 60 * 1000),
                ),
            );
        } catch (error) {
            // console.error(error);
        }
    }
}

async function saveSimilarIncludeFilesCache() {
    if (config.showCodeLens) {
        for (const path of config.similarIncludeFilesRegex) {
            similarIncludeFilesCache.push(await workspace.findFiles(path, '**/.*'));
        }

        similarIncludeFilesCache = similarIncludeFilesCache.flat().map((file) => file.path);
    }
}

/* Helpers ------------------------------------------------------------------ */

function checkCache(cache_store, text) {
    const check = cache_store.find((e) => e.key == text);

    return check ? check.val : [];
}

function saveCache(cache_store, text, val) {
    checkCache(cache_store, text).length
        ? false
        : cache_store.push({
            key: text,
            val: val,
        });

    return val;
}

/* Config ------------------------------------------------------------------- */
export const PACKAGE_NAME = 'laravelGotoView';

export let config: WorkspaceConfiguration;
export let methods = '';
export let similarIncludeDirectives = '';
export let defaultPath = '';
export let vendorPath: any = [];

export async function readConfig() {
    config = workspace.getConfiguration(PACKAGE_NAME);
    methods = config.methods.map((e) => (e.includes('?') ? e : escapeStringRegexp(e))).join('|');
    similarIncludeDirectives = config.similarIncludeDirectives.map((e) => escapeStringRegexp(replaceSlash(e))).join('|');
    defaultPath = replaceSlash(config.defaultPath);
    vendorPath = config.vendorPath.map((item) => replaceSlash(item));

    await saveSimilarIncludeFilesCache();
}

function replaceSlash(item) {
    return item.replace(/[\\/]/g, sep);
}
