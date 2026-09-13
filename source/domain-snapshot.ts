import { isRelativeValue } from "./value.js"
import type { Position, Size } from "./launch.js"
import type { ClientDeclaration, EndpointDeclaration } from "./program.js"

/** Stable coordinates shared by every handle for one runtime entity. */
export type HandleAddress = Readonly<{
  identity: string
  reference: string
}>

/** Public Program state shared across System boundaries. */
export type ProgramSnapshot = HandleAddress & Readonly<{
  assetId: string
  installed?: boolean
  name: string
  version: string | null
  description: string | null
  categories?: readonly string[]
  keywords?: readonly string[]
  hasAgent: boolean
  server: EndpointDeclaration | null
  client: ClientDeclaration | null
}>

/** Live state of one Endpoint carried with a Process reference. */
export type EndpointSnapshot = Readonly<{ service: boolean }>

/** Immutable Process identity and Endpoint state shared across boundaries. */
export type ProcessSnapshot = HandleAddress & Readonly<{
  name: string | null
  program: ProgramSnapshot
  options: Readonly<Record<string, string>>
  startedAt: Date
  server: EndpointSnapshot | null
  client: EndpointSnapshot | null
}>

/** Address of one concrete Endpoint carried over a boundary. */
export type EndpointReference = Readonly<{
  kind: "server" | "client"
  process: ProcessSnapshot
}>

/** Validates and canonicalizes shared Program state from an unknown boundary. */
export function parseProgramSnapshot(value: unknown): ProgramSnapshot {
  const source = exact(value, [
    "reference", "identity", "assetId", "installed", "name", "version",
    "description", "categories", "keywords", "hasAgent", "server", "client"
  ], "Program")

  if (typeof source.reference !== "string"
    || typeof source.identity !== "string"
    || typeof source.assetId !== "string"
    || typeof source.name !== "string"
    || source.version !== null && typeof source.version !== "string"
    || source.description !== null && typeof source.description !== "string"
    || typeof source.hasAgent !== "boolean"
    || source.installed !== undefined && typeof source.installed !== "boolean") {
    throw invalid("Program")
  }

  return Object.freeze({
    reference: source.reference,
    identity: source.identity,
    assetId: source.assetId,
    ...(source.installed === undefined ? {} : { installed: source.installed }),
    name: source.name,
    version: source.version,
    description: source.description,
    ...(source.categories === undefined ? {} : { categories: strings(source.categories, "Program categories") }),
    ...(source.keywords === undefined ? {} : { keywords: strings(source.keywords, "Program keywords") }),
    hasAgent: source.hasAgent,
    server: source.server === null ? null : parseEndpointDeclaration(source.server),
    client: source.client === null ? null : parseClientDeclaration(source.client)
  })
}

/** Validates and canonicalizes shared Process state from an unknown boundary. */
export function parseProcessSnapshot(value: unknown): ProcessSnapshot {
  const source = exact(value, [
    "reference", "identity", "name", "program", "options", "startedAt", "server", "client"
  ], "Process")
  const startedAt = source.startedAt instanceof Date ? new Date(source.startedAt) : new Date(String(source.startedAt))

  if (typeof source.reference !== "string"
    || typeof source.identity !== "string"
    || source.name !== null && typeof source.name !== "string"
    || !recordOfStrings(source.options)
    || Number.isNaN(startedAt.getTime())) {
    throw invalid("Process")
  }

  return Object.freeze({
    reference: source.reference,
    identity: source.identity,
    name: source.name,
    program: parseProgramSnapshot(source.program),
    options: Object.freeze({ ...source.options }),
    startedAt,
    server: source.server === null ? null : parseEndpointSnapshot(source.server),
    client: source.client === null ? null : parseEndpointSnapshot(source.client)
  })
}

/** Validates and canonicalizes an Endpoint address from an unknown boundary. */
export function parseEndpointReference(value: unknown): EndpointReference {
  const source = exact(value, ["kind", "process"], "Endpoint reference")

  if (source.kind !== "server" && source.kind !== "client") throw invalid("Endpoint reference")

  return Object.freeze({ kind: source.kind, process: parseProcessSnapshot(source.process) })
}

function parseEndpointDeclaration(value: unknown): EndpointDeclaration {
  const source = exact(value, ["start", "service"], "Endpoint declaration")
  if (typeof source.start !== "boolean" || typeof source.service !== "boolean") throw invalid("Endpoint declaration")
  return Object.freeze({ start: source.start, service: source.service })
}

function parseClientDeclaration(value: unknown): ClientDeclaration {
  const source = exact(value, ["start", "service", "title", "size", "position", "layer", "minimize", "maximize"], "Client declaration")

  if (typeof source.start !== "boolean"
    || typeof source.service !== "boolean") {
    throw invalid("Client declaration")
  }

  return Object.freeze({
    start: source.start,
    service: source.service,
    title: nullableText(source.title, "Client declaration"),
    size: source.size === null ? null : parseSize(source.size),
    position: source.position === null ? null : parsePosition(source.position),
    layer: nullableLayer(source.layer),
    minimize: nullableBoolean(source.minimize, "Client declaration"),
    maximize: nullableBoolean(source.maximize, "Client declaration")
  }) satisfies ClientDeclaration
}

function parseEndpointSnapshot(value: unknown): EndpointSnapshot {
  const source = exact(value, ["service"], "Endpoint")
  if (typeof source.service !== "boolean") throw invalid("Endpoint")
  return Object.freeze({ service: source.service })
}

function parsePosition(value: unknown): Position {
  const source = exact(value, ["x", "y"], "Window position")
  if (!isRelativeValue(source.x) || !isRelativeValue(source.y)) throw invalid("Window position")
  return Object.freeze({ x: source.x, y: source.y })
}

function parseSize(value: unknown): Size {
  const source = exact(value, ["width", "height"], "Window size")
  if (!isRelativeValue(source.width) || !isRelativeValue(source.height)) throw invalid("Window size")
  return Object.freeze({ width: source.width, height: source.height })
}

function object(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw invalid(name)
  return value as Record<string, unknown>
}

function exact(value: unknown, keys: readonly string[], name: string) {
  const source = object(value, name)
  if (Object.keys(source).some(key => !keys.includes(key))) throw invalid(name)
  return source
}

function recordOfStrings(value: unknown): value is Record<string, string> {
  return !!value && typeof value === "object" && !Array.isArray(value)
    && Object.values(value).every(entry => typeof entry === "string")
}

function strings(value: unknown, name: string) {
  if (!Array.isArray(value) || value.some(entry => typeof entry !== "string")) throw invalid(name)
  return Object.freeze([...value]) as readonly string[]
}

function nullableText(value: unknown, name: string): string | null {
  if (value === null || typeof value === "string") return value
  throw invalid(name)
}

function nullableBoolean(value: unknown, name: string): boolean | null {
  if (value === null || typeof value === "boolean") return value
  throw invalid(name)
}

function nullableLayer(value: unknown): ClientDeclaration["layer"] {
  if (value === null || value === "window" || value === "under" || value === "over") return value
  throw invalid("Client declaration")
}

function invalid(name: string) { return new Error(`The System returned an invalid ${name}`) }
