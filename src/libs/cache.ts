const cache = new Map()
const indexCache = new Map()

function getKey(name, doc) {
    return `${name}:${doc.uri.toString()}`
}

export function get(name, doc) {
    const cached = cache.get(getKey(name, doc))

    return cached?.version == doc.version ? cached.value : undefined
}

export function set(name, doc, value) {
    cache.set(getKey(name, doc), {
        version : doc.version,
        value,
    })
}

export function getIndex(name) {
    return indexCache.get(name)
}

export function setIndex(name, value) {
    indexCache.set(name, value)
}

export function clear() {
    cache.clear()
    indexCache.clear()
}
