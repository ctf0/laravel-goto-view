'use strict';

import { debounce } from 'lodash';
import {
    commands,
    ExtensionContext,
    languages,
    window,
    workspace,
} from 'vscode';
import * as cmnds from './cmnds';
import BladeLensProvider from './providers/BladeLensProvider';
import LinkProvider from './providers/LinkProvider';
import PhpLensProvider from './providers/PhpLensProvider';
import * as util from './util';

let providers = [];

export async function activate(context: ExtensionContext) {
    await util.readConfig();

    // config
    workspace.onDidChangeConfiguration(async (e) => {
        if (e.affectsConfiguration(util.PACKAGE_NAME)) {
            await util.readConfig();
        }
    });

    // command
    context.subscriptions.push(commands.registerCommand('lgtv.copyPath', cmnds.copyPath));
    context.subscriptions.push(commands.registerCommand('lgtv.openPath', cmnds.openPath));
    context.subscriptions.push(commands.registerCommand('lgtv.showSimilarCall', cmnds.showSimilarCall));

    // links
    initProviders();
    window.onDidChangeActiveTextEditor(async (e) => {
        await clearAll();
        initProviders();
    }),

    // create
    cmnds.createFileFromText();
    cmnds.resetLinks.event(async () => {
        await clearAll();
        initProviders();
    });

    // .blade files changes
    await util.listenForFileChanges();
}

const initProviders = debounce(() => {
    providers.push(languages.registerDocumentLinkProvider(['php', 'blade'], new LinkProvider()));

    if (util.config.showCodeLens) {
        providers.push(languages.registerCodeLensProvider(['blade'], new BladeLensProvider()));
        providers.push(languages.registerCodeLensProvider(['php'], new PhpLensProvider()));
    }
}, 250);


function clearAll() {
    return new Promise((res, rej) => {
        providers.map((e) => e.dispose());
        providers = [];

        setTimeout(() => res(true), 500);
    });
}

export function deactivate() {
    clearAll();
}
