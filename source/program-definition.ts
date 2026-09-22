import { isLayer, layers, type Layer, type Position, type Size } from "./launch.js"
import { parseProgramPermissionDeclarations } from "./permissions.js"
import type { ClientDefinition, ProgramDefinition, ServerDefinition } from "./system.js"
import { isRelativeValue } from "./value.js"
import { parseLaunch } from "./launch-validation.js"
import { parseWindowFrame, parseWindowTransaction } from "./window-values.js"
import { isProgramIdentity } from "./program-identity.js"
import { defaultProgramVersion } from "./program.js"

type ProgramDefinitionBase = Omit<ProgramDefinition, "server" | "client">

/** Validates and canonicalizes one complete Program definition at an unknown boundary. */
export function parseProgramDefinition(value: unknown): ProgramDefinition {
  const source = object(value, "Program definition")

  if (!isProgramIdentity(source.identity)) {
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
    version: version ?? defaultProgramVersion,
    ...present("description", description),
    ...present("categories", list(source.categories, "categories", 20)),
    ...present("keywords", list(source.keywords, "keywords", 50)),
    ...present("website", website),
    ...present("icon", icon),
    ...present("agent", agent),
    ...present<"installLaunch", ProgramDefinition["installLaunch"]>("installLaunch", source.installLaunch === undefined || source.installLaunch === true ? source.installLaunch : parseLaunch(source.installLaunch)),
    ...(source.permissions === undefined ? {} : { permissions: parseProgramPermissionDeclarations(source.permissions) }),
    storage: source.storage
  } satisfies ProgramDefinitionBase

  if (server) return Object.freeze({ ...base, server, ...present("client", client) }) satisfies ProgramDefinition
  if (client) return Object.freeze({ ...base, client }) satisfies ProgramDefinition

  throw new Error("A Program must declare a Server, a Client, or both")
}

function parseServer(value: unknown): ServerDefinition {
  const source = object(value, "Server definition")

  if (typeof source.location !== "string") throw new Error("A Server must have a location")
  const start = optionalBoolean(source.start, "A Server's start default")
  const service = optionalBoolean(source.service, "A Server's service default")
  const installCommand = optionalText(source.installCommand, "A Server's install command")
  const uninstallCommand = optionalText(source.uninstallCommand, "A Server's uninstall command")

  const modes = [source.command, source.worker, source.sandbox].filter(mode => mode !== undefined)
  if (modes.length !== 1) throw new Error("A Server must declare exactly one command, worker, or sandbox")

  const base = {
    location: source.location,
    ...present("start", start),
    ...present("service", service),
    ...present("installCommand", installCommand),
    ...present("uninstallCommand", uninstallCommand)
  }

  if (source.command !== undefined) return Object.freeze({
    ...base,
    command: nonempty(source.command, "A Server's command")
  }) satisfies ServerDefinition

  if (source.worker !== undefined) return Object.freeze({
    ...base,
    worker: nonempty(source.worker, "A Server's worker entry")
  }) satisfies ServerDefinition

  return Object.freeze({
    ...base,
    sandbox: nonempty(source.sandbox, "A Server's sandbox entry")
  }) satisfies ServerDefinition
}

function parseClient(value: unknown): ClientDefinition {
  const source = object(value, "Client definition")

  if (typeof source.location !== "string") throw new Error("A Client must have a location")
  const sandbox = optionalBoolean(source.sandbox, "A Client's sandbox mode")
  const start = optionalBoolean(source.start, "A Client's start default")
  const service = optionalBoolean(source.service, "A Client's service default")
  const minimize = optionalBoolean(source.minimize, "A Client's minimize default")
  const maximize = optionalBoolean(source.maximize, "A Client's maximize default")
  const header = optionalBoolean(source.header, "A Client's header default")
  const frame = source.frame === undefined ? undefined : parseWindowFrame(source.frame)
  const transaction = source.transaction === undefined ? undefined : parseWindowTransaction(source.transaction)
  const title = optionalText(source.title, "A Client's title")
  const layer = optionalLayer(source.layer)

  return Object.freeze({
    location: source.location,
    ...present("sandbox", sandbox),
    ...present("start", start),
    ...present("service", service),
    ...present("title", title),
    ...present("header", header),
    ...present("frame", frame),
    ...present("transaction", transaction),
    ...present("size", source.size === undefined ? undefined : size(source.size)),
    ...present("position", source.position === undefined ? undefined : position(source.position)),
    ...present("layer", layer),
    ...present("minimize", minimize),
    ...present("maximize", maximize)
  }) satisfies ClientDefinition
}

function size(value: unknown): Size {
  const source = object(value, "Window size")
  if (!isRelativeValue(source.width) || !isRelativeValue(source.height)) throw invalidGeometry("size")
  return Object.freeze({ width: source.width, height: source.height })
}

function position(value: unknown): Position {
  const source = object(value, "Window position")
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

function object(value: unknown, name: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${name} must be an object`)
  return value as Record<string, unknown>
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
  if (isLayer(value)) return value
  throw new Error(`A Client's layer must be one of ${layers.join(", ")}`)
}

function invalidGeometry(name: string) {
  return new Error(`A Window's ${name} values must be finite pixels or relative expressions`)
}

function nonempty(value: unknown, name: string) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${name} must be non-empty text`)
  return value
}
