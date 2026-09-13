import { layers, type Layer, type Position, type Size } from "./launch.js"
import { parseClientPermissionDeclarations } from "./permissions.js"
import type { ClientDefinition, ProgramDefinition, ServerDefinition } from "./system.js"
import { isRelativeValue } from "./value.js"

const identityPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
type ProgramDefinitionBase = Omit<ProgramDefinition, "server" | "client">

/** Validates and canonicalizes one complete Program definition at an unknown boundary. */
export function parseProgramDefinition(value: unknown): ProgramDefinition {
  const source = exact(value, [
    "identity", "name", "version", "description", "categories", "keywords",
    "website", "icon", "agent", "storage", "server", "client"
  ], "Program definition")

  if (typeof source.identity !== "string" || !identityPattern.test(source.identity)) {
    throw new Error("A Program's identity must be kebab-case")
  }

  const name = optionalText(source.name, "A Program's name")
  const version = optionalText(source.version, "A Program's version")
  const description = optionalText(source.description, "A Program's description")
  const website = optionalText(source.website, "A Program's website")
  const icon = optionalText(source.icon, "A Program's icon")
  const agent = optionalText(source.agent, "A Program's agent")

  if (typeof source.storage !== "string") throw new Error("A Program must name its storage")
  if (agent !== undefined && agent.trim().length === 0) throw new Error("A Program's agent must be a non-empty path")
  if (website !== undefined) {
    try { new URL(website) }
    catch { throw new Error("A Program's website must be a valid URL") }
  }

  const server = source.server === undefined ? undefined : parseServer(source.server)
  const client = source.client === undefined ? undefined : parseClient(source.client)

  if (!server && !client) throw new Error("A Program must declare a Server, a Client, or both")
  if (!(server && (server.start ?? true)) && !(client && (client.start ?? true))) {
    throw new Error("A Program's default Process must start a Server Endpoint, a Client Endpoint, or both")
  }

  const base = {
    identity: source.identity,
    ...present("name", name),
    ...present("version", version),
    ...present("description", description),
    ...present("categories", list(source.categories, "categories", 20)),
    ...present("keywords", list(source.keywords, "keywords", 50)),
    ...present("website", website),
    ...present("icon", icon),
    ...present("agent", agent),
    storage: source.storage
  } satisfies ProgramDefinitionBase

  if (server) return Object.freeze({ ...base, server, ...present("client", client) }) satisfies ProgramDefinition
  if (client) return Object.freeze({ ...base, client }) satisfies ProgramDefinition

  throw new Error("A Program must declare a Server, a Client, or both")
}

function parseServer(value: unknown): ServerDefinition {
  const source = exact(value, [
    "location", "start", "service", "installCommand", "uninstallCommand", "startCommand", "entryFile"
  ], "Server definition")

  if (typeof source.location !== "string") throw new Error("A Server must have a location")
  const start = optionalBoolean(source.start, "A Server's start default")
  const service = optionalBoolean(source.service, "A Server's service default")
  const installCommand = optionalText(source.installCommand, "A Server's install command")
  const uninstallCommand = optionalText(source.uninstallCommand, "A Server's uninstall command")

  const hasCommand = source.startCommand !== undefined
  const hasEntry = source.entryFile !== undefined
  if (hasCommand === hasEntry) throw new Error("A Server must declare exactly one startCommand or entryFile")

  const base = {
    location: source.location,
    ...present("start", start),
    ...present("service", service),
    ...present("installCommand", installCommand),
    ...present("uninstallCommand", uninstallCommand)
  }

  if (hasCommand) return Object.freeze({
    ...base,
    startCommand: nonempty(source.startCommand, "A Server's startCommand")
  }) satisfies ServerDefinition

  return Object.freeze({
    ...base,
    entryFile: nonempty(source.entryFile, "A Server's entryFile")
  }) satisfies ServerDefinition
}

function parseClient(value: unknown): ClientDefinition {
  const source = exact(value, [
    "location", "start", "service", "title", "size", "position", "layer", "minimize", "maximize", "permissions"
  ], "Client definition")

  if (typeof source.location !== "string") throw new Error("A Client must have a location")
  const start = optionalBoolean(source.start, "A Client's start default")
  const service = optionalBoolean(source.service, "A Client's service default")
  const minimize = optionalBoolean(source.minimize, "A Client's minimize default")
  const maximize = optionalBoolean(source.maximize, "A Client's maximize default")
  const title = optionalText(source.title, "A Client's title")
  const layer = optionalLayer(source.layer)

  return Object.freeze({
    location: source.location,
    ...present("start", start),
    ...present("service", service),
    ...present("title", title),
    ...present("size", source.size === undefined ? undefined : size(source.size)),
    ...present("position", source.position === undefined ? undefined : position(source.position)),
    ...present("layer", layer),
    ...present("minimize", minimize),
    ...present("maximize", maximize),
    ...(source.permissions === undefined ? {} : { permissions: parseClientPermissionDeclarations(source.permissions) })
  }) satisfies ClientDefinition
}

function size(value: unknown): Size {
  const source = exact(value, ["width", "height"], "Window size")
  if (!isRelativeValue(source.width) || !isRelativeValue(source.height)) throw invalidGeometry("size")
  return Object.freeze({ width: source.width, height: source.height })
}

function position(value: unknown): Position {
  const source = exact(value, ["x", "y"], "Window position")
  if (!isRelativeValue(source.x) || !isRelativeValue(source.y)) throw invalidGeometry("position")
  return Object.freeze({ x: source.x, y: source.y })
}

function list(value: unknown, field: "categories" | "keywords", maximum: number): readonly string[] | undefined {
  if (value === undefined) return undefined
  if (!Array.isArray(value) || value.length > maximum || value.some(entry => typeof entry !== "string" || !entry.trim() || entry.trim().length > 50)) {
    throw new Error(`A Program's ${field} must contain at most ${maximum} non-empty values of at most 50 characters`)
  }
  return Object.freeze([...value])
}

function exact(value: unknown, keys: readonly string[], name: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${name} must be an object`)
  const source = value as Record<string, unknown>
  const unknown = Object.keys(source).find(key => !keys.includes(key))
  if (unknown) throw new Error(`${name} contains the unknown field "${unknown}"`)
  return source
}

function present<Key extends string, Value>(key: Key, value: Value | undefined): Partial<Readonly<Record<Key, Value>>> {
  return value === undefined ? {} : { [key]: value } as Readonly<Record<Key, Value>>
}

function optionalText(value: unknown, name: string): string | undefined {
  if (value !== undefined && typeof value !== "string") throw new Error(`${name} must be text`)
  return value
}

function optionalBoolean(value: unknown, name: string): boolean | undefined {
  if (value !== undefined && typeof value !== "boolean") throw new Error(`${name} must be true or false`)
  return value
}

function optionalLayer(value: unknown): Layer | undefined {
  if (value === undefined) return undefined
  if (value === "window" || value === "under" || value === "over") return value
  throw new Error(`A Client's layer must be one of ${layers.join(", ")}`)
}

function invalidGeometry(name: string) {
  return new Error(`A Window's ${name} values must be finite pixels or relative expressions`)
}

function nonempty(value: unknown, name: string) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${name} must be non-empty text`)
  return value
}
