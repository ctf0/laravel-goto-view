import {
    CodeAction,
    CodeActionKind,
    CodeActionProvider,
    Disposable,
    EventEmitter,
    TextDocument,
    window,
} from 'vscode'
import * as util from '../util'

export default class BladeCodeActionProvider implements CodeActionProvider {
    static readonly providedCodeActionKinds = [CodeActionKind.QuickFix]

    private readonly _onDidChangeCodeActions = new EventEmitter<void>()
    readonly onDidChangeCodeActions = this._onDidChangeCodeActions.event

    private readonly watcher : Disposable

    constructor() {
        this.watcher = util.onPhpCallersReady.event(() => {
            this._onDidChangeCodeActions.fire()
        })
    }

    dispose() {
        this.watcher.dispose()
        this._onDidChangeCodeActions.dispose()
    }

    provideCodeActions(doc: TextDocument) {
        if (!window.activeTextEditor) {
            return []
        }

        util.setWs(doc.uri)

        const actions: CodeAction[] = []

        const copyAction = new CodeAction(
            'View: Copy File Path',
            CodeActionKind.Empty,
        )
        copyAction.command = {
            command : 'lgtv.copyPath',
            title   : 'Copy File Path',
        }
        actions.push(copyAction)

        const viewNames = util.getViewNames(doc.uri.fsPath)
        const callers = util.peekPhpCallers(viewNames)

        if (callers && callers.length) {
            const callersAction = new CodeAction(
                `View: Open PHP callers`,
                CodeActionKind.Empty,
            )
            callersAction.command = {
                command   : 'lgtv.showSimilarCall',
                title     : 'Open PHP callers',
                arguments : [callers, viewNames],
            }
            actions.push(callersAction)
        }

        return actions
    }
}
