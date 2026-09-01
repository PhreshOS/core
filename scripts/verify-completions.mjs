import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import ts from "typescript"

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const file = join(repository, "event-completion.ts")
const source = `import type { Endpoint } from "./source/main.js"

type Events = {
  changed: { value: number }
  closed: undefined
}

declare const endpoint: Endpoint<Events>

endpoint.subscribe("")
endpoint.subscribe("", () => undefined)
endpoint.waitFor("")
endpoint.events("")
`
const host = {
  ...ts.sys,
  getCompilationSettings: () => ({
    lib: ["lib.dom.d.ts", "lib.esnext.d.ts"],
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    strict: true,
    target: ts.ScriptTarget.ESNext
  }),
  getCurrentDirectory: () => repository,
  getDefaultLibFileName: options => ts.getDefaultLibFilePath(options),
  getScriptFileNames: () => [file],
  getScriptSnapshot: path => {
    if (path === file) return ts.ScriptSnapshot.fromString(source)
    if (!ts.sys.fileExists(path)) return undefined
    return ts.ScriptSnapshot.fromString(readFileSync(path, "utf8"))
  },
  getScriptVersion: () => "0",
  useCaseSensitiveFileNames: () => ts.sys.useCaseSensitiveFileNames
}
const service = ts.createLanguageService(host)

const subscribeMarker = `subscribe("`
const firstSubscribe = source.indexOf(subscribeMarker)

for (const position of [
  firstSubscribe + subscribeMarker.length,
  source.indexOf(subscribeMarker, firstSubscribe + 1) + subscribeMarker.length
]) {
  const completions = service.getCompletionsAtPosition(file, position, {})?.entries.map(entry => entry.name)
  assert.deepEqual(completions, ["changed", "closed"], "subscribe() event completions diverged")
}

for (const method of ["waitFor", "events"]) {
  const marker = `${method}("`
  const position = source.indexOf(marker) + marker.length
  const completions = service.getCompletionsAtPosition(file, position, {})?.entries.map(entry => entry.name)

  assert.deepEqual(completions, ["changed", "closed"], `${method}() event completions diverged`)
}
