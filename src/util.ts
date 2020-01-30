'use strict'

import { workspace, TextDocument, Uri } from 'vscode'

const glob = require("fast-glob")

export async function getFilePaths(text: string, document: TextDocument) {
    let info = text.replace(new RegExp(/(view|@(include|extends|component))\(['"]|['"]\)/, 'g'), '')
    let viewPath = '/resources/views'

    if (info.includes("::")) {
        let searchFor = info.split('::')
        viewPath = `${viewPath}/vendor/${searchFor[0]}`
        info = searchFor[1]
    }

    return getData(document, viewPath, info)
}

async function getData(document, path, list) {
    let fileList = list.split('.')
    let workspaceFolder = workspace.getWorkspaceFolder(document.uri).uri.fsPath
    let toCheck = []
    while (fileList.length > 0) {
        toCheck.push(`**/${fileList.join('/')}.blade.php`)
        fileList.pop()
    }

    let result = await glob(toCheck, { cwd: `${workspaceFolder}${path}` })

    result = result.map((item) => {
        return {
            "showPath": item,
            "fileUri": Uri.file(`${workspaceFolder}${path}/${item}`)
        }
    })

    return result
}
