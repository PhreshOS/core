import { isRelativeValue } from "./value.js"
import { isLayer, type Position, type Size } from "./launch.js"
import type { ClientDeclaration, EndpointDeclaration } from "./program.js"
import type { SessionEndReason } from "./session.js"
import { parseWindowFrame, parseWindowTransaction } from "./window-values.js"

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
  version: string
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

/** Public state of one browser Connection carried across a System boundary. */
export type ConnectionSnapshot = Readonly<{
  identity: string
  connected: boolean
  session: string | null
}>

/** Public state of one Session carried across a System boundary. */
export type SessionSnapshot = Readonly<{
  identity: string
  valid: boolean
}>

/** Terminal Session state carried with registry and entity events. */
export type SessionEndSnapshot = SessionSnapshot & Readonly<{
  reason: SessionEndReason
}>

/** Validates and canonicalizes shared Program state from an unknown boundary. */
export function parseProgramSnapshot(value: unknown): ProgramSnapshot {
  const source = object(value, "Program")

  if (typeof source.reference !== "string"
    || typeof source.identity !== "string"
    || typeof source.assetId !== "string"
    || typeof source.name !== "string"
    || typeof source.version !== "string"
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
  const source = object(value, "Process")
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
  const source = object(value, "Endpoint reference")

  if (source.kind !== "server" && source.kind !== "client") throw invalid("Endpoint reference")

  return Object.freeze({ kind: source.kind, process: parseProcessSnapshot(source.process) })
}

/** Validates and canonicalizes one Connection snapshot from an unknown boundary. */
export function parseConnectionSnapshot(value: unknown): ConnectionSnapshot {
  const source = object(value, "Connection")

  if (typeof source.identity !== "string"
    || typeof source.connected !== "boolean"
    || source.session !== null && typeof source.session !== "string") {
    throw invalid("Connection")
  }

  return Object.freeze({ identity: source.identity, connected: source.connected, session: source.session })
}

/** Validates and canonicalizes one Session snapshot from an unknown boundary. */
export function parseSessionSnapshot(value: unknown): SessionSnapshot {
  const source = object(value, "Session")

  if (typeof source.identity !== "string" || typeof source.valid !== "boolean") throw invalid("Session")

  return Object.freeze({ identity: source.identity, valid: source.valid })
}

/** Validates one ended Session snapshot and its exact reason. */
export function parseSessionEndSnapshot(value: unknown): SessionEndSnapshot {
  const session = parseSessionSnapshot(value)
  const reason = (value as Record<string, unknown>).reason

  if (reason !== "signedOut" && reason !== "expired") throw invalid("Session end")

  return Object.freeze({ ...session, reason })
}

function parseEndpointDeclaration(value: unknown): EndpointDeclaration {
  const source = object(value, "Endpoint declaration")
  if (typeof source.start !== "boolean" || typeof source.service !== "boolean") throw invalid("Endpoint declaration")
  return Object.freeze({ start: source.start, service: source.service })
}

function parseClientDeclaration(value: unknown): ClientDeclaration {
  const source = object(value, "Client declaration")

  if (typeof source.start !== "boolean"
    || typeof source.service !== "boolean") {
    throw invalid("Client declaration")
  }

  return Object.freeze({
    start: source.start,
    service: source.service,
    title: nullableText(source.title, "Client declaration"),
    header: nullableBoolean(source.header, "Client declaration"),
    frame: source.frame === null ? null : parseWindowFrame(source.frame),
    transaction: source.transaction === null ? null : parseWindowTransaction(source.transaction),
    size: source.size === null ? null : parseSize(source.size),
    position: source.position === null ? null : parsePosition(source.position),
    layer: nullableLayer(source.layer),
    minimize: nullableBoolean(source.minimize, "Client declaration"),
    maximize: nullableBoolean(source.maximize, "Client declaration")
  }) satisfies ClientDeclaration
}

function parseEndpointSnapshot(value: unknown): EndpointSnapshot {
  const source = object(value, "Endpoint")
  if (typeof source.service !== "boolean") throw invalid("Endpoint")
  return Object.freeze({ service: source.service })
}

function parsePosition(value: unknown): Position {
  const source = object(value, "Window position")
  if (!isRelativeValue(source.x) || !isRelativeValue(source.y)) throw invalid("Window position")
  return Object.freeze({ x: source.x, y: source.y })
}

function parseSize(value: unknown): Size {
  const source = object(value, "Window size")
  if (!isRelativeValue(source.width) || !isRelativeValue(source.height)) throw invalid("Window size")
  return Object.freeze({ width: source.width, height: source.height })
}

function object(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw invalid(name)
  return value as Record<string, unknown>
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
  if (value === null || isLayer(value)) return value
  throw invalid("Client declaration")
}

function invalid(name: string) { return new Error(`The System returned an invalid ${name}`) }
