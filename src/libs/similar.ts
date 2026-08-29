import escapeStringRegexp from 'escape-string-regexp'

/**
 * Directive pairs for Laravel blade sections/stacks: a `@yield` is completed
 * by a `@section` in child templates, and `@stack` by `@push`.
 */
const directivePairs: Record<string, string[]> = {
    yield      : ['section', 'hasSection'],
    section    : ['section', 'yield'],
    stack      : ['push', 'pushOnce'],
    push       : ['push', 'once', 'stack'],
    hasSection : ['section', 'yield'],
}

/**
 * Build the search pattern used by the "show similar call" lens.
 *
 * Given the directive matched in the current file (e.g. `@yield`) and the
 * captured view/section name (e.g. `header`), return a query that only
 * matches files which reference that name through a compatible directive
 * (e.g. `@section('header')`), instead of any file containing the bare word.
 */
export function buildSimilarCallQuery(directive: string|undefined, text: string) {
    if (directive) {
        // config regexes capture directives with `@`; pair table is bare-keyed
        const name = directive.replace(/^@/, '')
        const searchDirectives = directivePairs[name]

        if (searchDirectives) {
            const names = searchDirectives.map((name) => escapeStringRegexp(name)).join('|')

            return new RegExp(`@(${names})\\s*\\(\\s*['"]${escapeStringRegexp(text)}['"]`)
        }
    }

    // components / livewire tags and unknown directives: plain substring match
    return new RegExp(escapeStringRegexp(text))
}
