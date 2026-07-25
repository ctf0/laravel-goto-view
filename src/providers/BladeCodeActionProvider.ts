import {
    CodeAction,
    CodeActionKind,
    CodeActionProvider,
    TextDocument,
    window,
} from 'vscode'
import * as util from '../util'

export default class BladeCodeActionProvider implements CodeActionProvider {
    static readonly providedCodeActionKinds = [CodeActionKind.QuickFix]

    async provideCodeActions(doc: TextDocument) {
        if (!window.activeTextEditor) {
            return []
        }

        util.setWs(doc.uri)

        const actions: CodeAction[] = []

        // Copy File Path
        const copyAction = new CodeAction(
            'Copy File Path',
            CodeActionKind.Empty,
        )
        copyAction.command = {
            command : 'lgtv.copyPath',
            title   : 'Copy File Path',
        }
        actions.push(copyAction)

        // Open PHP callers
        const viewNames = util.getViewNames(doc.uri.fsPath)
        const callers = await util.findPhpCallers(viewNames)

        if (callers.length) {
            const callersAction = new CodeAction(
                `Open PHP callers`,
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
