import type { OpenTarget, SystemOpening } from "./opening.js"
import type { WritableAppearance } from "./appearance.js"
import type { IconSize, Program } from "./program.js"
import type { Launch, Layer, Position, ProcessDefaults, Size } from "./launch.js"
import type { Exit, Process } from "./process.js"
import type { ClientService, ServerService, Service, ServiceAddress, ServiceEndpoint } from "./service.js"
import type { Storage } from "./storage.js"
import type { Subscribable } from "./subscribable.js"
import type { SystemUploads } from "./uploads.js"
import type { WindowEvents } from "./window.js"
import type { Network } from "./network.js"
import type { Permissions, ProgramPermissionDeclarations, SystemPermissions } from "./permissions.js"
import type { SystemAuthentication } from "./authentication.js"
import type { ExecuteRequest, ExecuteResult } from "./execute/contract.js"
import type { SystemLogs } from "./sql.js"

type ServerDefinitionBase = Readonly<{
  location: string
  start?: boolean
  service?: boolean
  installCommand?: string
  uninstallCommand?: string
}>

export type ServerDefinition = ServerDefinitionBase & (
  | Readonly<{ command: string, worker?: never, sandbox?: never }>
  | Readonly<{ command?: never, worker: string, sandbox?: never }>
  | Readonly<{ command?: never, worker?: never, sandbox: string }>
)

export type ClientDefinition = Readonly<{
  location: string
  /** Whether the Client document runs in a browser sandbox. Defaults to `true`. */
  sandbox?: boolean
  start?: boolean
  service?: boolean
  title?: string
  header?: boolean
  size?: Size
  position?: Position
  layer?: Layer
  minimize?: boolean
  /** Whether the Window initially fills its Desktop workspace. */
  maximize?: boolean
}>

type ProgramDefinitionBase = Readonly<{
  identity: string
  name?: string
  /** Program version. Omission resolves to `0.0.0`. */
  version?: string
  description?: string
  categories?: readonly string[]
  keywords?: readonly string[]
  /** Media types this Program opens, such as `image/png`; `image/*` stands for every image. */
  opens?: readonly string[]
  website?: string
  icon?: string
  agent?: string
  storage: string
  /** Process launched once after installation. `true` uses Endpoint defaults. */
  installLaunch?: true | Launch
  /** What every launch of this Program takes unless it says otherwise. */
  process?: ProcessDefaults
  /** Permission requests used when stored state has no assignment for a permission. */
  permissions?: ProgramPermissionDeclarations
}>

export type ProgramDefinition = ProgramDefinitionBase & (
  | Readonly<{ server: ServerDefinition, client?: ClientDefinition }>
  | Readonly<{ server?: ServerDefinition, client: ClientDefinition }>
)

export type SystemProgramUninstall = Readonly<{
  program: Program
  purge: boolean
}>

export type SystemProgramPin = Readonly<{
  program: Program
  pinned: boolean
}>
export type SystemProgramPermissions = Readonly<{
  program: Program
  permissions: Permissions
}>
export type SystemProgramStartup = Readonly<{
  program: Program
  launch: Launch | null
}>

export type SystemProcessExit = Exit & Readonly<{ process: Process }>

/** Options for one operating-system shell command owned by its result stream. */
export type ShellOptions = Readonly<{
  /** Working directory. Omission starts from the operating-system user's home. */
  cwd?: string

  /** Environment values merged over the System process environment. */
  env?: Readonly<Record<string, string>>

  /** Ends the command tree and aborts iteration with this signal's reason. */
  signal?: AbortSignal
}>

/** Ordered lifecycle information produced by one System shell command. */
export type ShellEvent =
  | Readonly<{ event: "started", pid: number }>
  | Readonly<{ event: "output", stream: "stdout" | "stderr", text: string }>
  | Readonly<{ event: "exited", exit: Exit }>

/** Validate and canonicalize one value from a System shell stream. */
export function parseShellEvent(value: unknown): ShellEvent {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("The System returned an invalid shell event")

  const event = value as Record<string, unknown>

  if (event.event === "started" && typeof event.pid === "number" && Number.isInteger(event.pid) && event.pid > 0) {
    return Object.freeze({ event: "started", pid: event.pid })
  }

  if (event.event === "output" && (event.stream === "stdout" || event.stream === "stderr") && typeof event.text === "string") {
    return Object.freeze({ event: "output", stream: event.stream, text: event.text })
  }

  if (event.event === "exited" && event.exit && typeof event.exit === "object" && !Array.isArray(event.exit)) {
    const exit = event.exit as Record<string, unknown>

    if (exit.status !== "exited" && exit.status !== "signaled") throw new Error("The System returned an invalid shell exit")
    if (exit.code !== null && typeof exit.code !== "number") throw new Error("The System returned an invalid shell exit code")
    if (exit.signal !== null && typeof exit.signal !== "string") throw new Error("The System returned an invalid shell exit signal")

    return Object.freeze({
      event: "exited",
      exit: Object.freeze({ status: exit.status, code: exit.code, signal: exit.signal })
    })
  }

  throw new Error("The System returned an invalid shell event")
}

export type SystemProgramEvents = {
  create: Program
  forget: Program
  install: Program
  uninstall: SystemProgramUninstall
  pin: SystemProgramPin
  changePermissions: SystemProgramPermissions
  changeStartup: SystemProgramStartup
}

export type SystemProcessEvents = {
  create: Process
  exit: SystemProcessExit
}

/** Filters for visible Programs. */
export type SystemProgramListOptions = Readonly<{
  installed?: boolean
  /** Only the Programs that open this exact media type. */
  opens?: string
  /** Only the Programs that start with the System, or only those that do not. */
  startup?: boolean
}>

/** Filters for ready Services visible to the caller. */
export type SystemServiceListOptions = Readonly<{ name?: string }>

export function parseSystemProgramListOptions(value: unknown = {}): SystemProgramListOptions {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Program list options must be an object")
  const { installed, opens, startup } = value as { installed?: unknown, opens?: unknown, startup?: unknown }
  if (installed !== undefined && typeof installed !== "boolean") throw new Error("The installed Program filter must be a boolean")
  if (opens !== undefined && (typeof opens !== "string" || !opens.includes("/"))) throw new Error("The opens Program filter must be a media type")
  if (startup !== undefined && typeof startup !== "boolean") throw new Error("The startup Program filter must be a boolean")
  return {
    ...(installed === undefined ? {} : { installed }),
    ...(opens === undefined ? {} : { opens: (opens as string).toLowerCase() }),
    ...(startup === undefined ? {} : { startup })
  }
}

/** What a System is: its name, its version, and the release that version belongs to. */
export type SystemAbout = Readonly<{
  /** The name the System shows people, such as "PhreshOS". */
  name: string

  /** The installed version, such as "0.1.108". */
  version: string

  /** The major version's name, and the Program that looks after it. */
  release: Readonly<{ name: string, program: string }>

  /** When the System started; how long it has run is counted from here. */
  startedAt: Date
}>

export function parseSystemAbout(value: unknown): SystemAbout {
  const record = value as { name?: unknown, version?: unknown, release?: { name?: unknown, program?: unknown }, startedAt?: unknown } | null
  const text = (candidate: unknown) => typeof candidate === "string" && candidate.length > 0
  const startedAt = record && typeof record === "object" && (record.startedAt instanceof Date || text(record.startedAt))
    ? new Date(record.startedAt as Date | string)
    : null
  if (!record || typeof record !== "object" || !text(record.name) || !text(record.version)
    || !record.release || typeof record.release !== "object" || !text(record.release.name) || !text(record.release.program)
    || !startedAt || Number.isNaN(startedAt.getTime())) {
    throw new Error("The System's description is malformed")
  }
  return Object.freeze({
    name: record.name as string,
    version: record.version as string,
    release: Object.freeze({ name: record.release.name as string, program: record.release.program as string }),
    startedAt
  })
}

export function parseSystemServiceListOptions(value: unknown = {}): SystemServiceListOptions {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Service list options must be an object")
  const name = (value as { name?: unknown }).name
  if (name !== undefined && (typeof name !== "string" || !name.trim())) throw new Error("A Service name must be a non-empty string")
  return name === undefined ? {} : { name }
}

export interface SystemProgram extends Subscribable<SystemProgramEvents, never> {
  /** Lists visible Programs; an omitted installation state includes both states. */
  list(options?: SystemProgramListOptions): Promise<Program[]>
  find(identity: string): Promise<Program | null>
  create(source: ProgramDefinition | string): Promise<Program>

  /**
   * Atomically claims a Program identity for a new uninstalled runtime entity.
   *
   * Any current runtime Program at the identity is forgotten first. Installed
   * files and storage remain untouched; invalid incoming definitions are
   * rejected before the current entity is changed.
   */
  forceCreate(source: ProgramDefinition | string): Promise<Program>
}

export interface SystemProcess extends Subscribable<SystemProcessEvents, never> {
  list(): Promise<Process[]>
  find(identity: string): Promise<Process | null>
}

/** Availability changes in the caller's visible Service discovery scope. */
export type SystemServiceEvents = {
  /** A ready Service became visible to this caller. */
  available: Service

  /** A Service ceased to be ready or visible to this caller. */
  unavailable: Service
}

type ServiceHandle<Endpoint extends ServiceEndpoint, Events extends object, Fallback> = Endpoint extends "server"
  ? ServerService<Events, Fallback>
  : ClientService<Events, Fallback>

/** Discoverable Endpoint Services and stable Service address handles. */
export interface SystemService extends Subscribable<SystemServiceEvents, never> {
  /** Returns ready Services visible to the caller, optionally filtered by Process name. */
  list(options?: SystemServiceListOptions): Promise<(ServerService | ClientService)[]>

  /** Prepares a canonical local handle from the address's Endpoint discriminant. */
  prepare<Endpoint extends ServiceEndpoint>(address: ServiceAddress<Endpoint>): ServiceHandle<Endpoint, {}, unknown>

  /** Prepares one canonical local Server Service handle with an explicit event contract. */
  prepare<Events extends object = {}, Fallback = unknown>(address: ServiceAddress<"server">): ServerService<Events, Fallback>

  /** Prepares one canonical local Client Service handle with an explicit event contract. */
  prepare<Events extends object = {}, Fallback = unknown>(address: ServiceAddress<"client">): ClientService<Events, Fallback>

  /** Prepares one canonical local Service handle without communicating. */
  prepare(address: ServiceAddress): ServerService | ClientService
}

/** Transport-neutral authoritative System contract shared by environment adapters. */
export interface System {
  readonly storage: Storage
  readonly appearance: WritableAppearance
  readonly program: SystemProgram
  readonly process: SystemProcess
  readonly authentication: SystemAuthentication
  readonly permissions: SystemPermissions
  readonly logs: SystemLogs
  readonly service: SystemService
  readonly uploads: SystemUploads
  readonly network: Network

  /** What this System is: its name, its version, and its release. It never changes while the System runs. */
  about(): Promise<SystemAbout>

  /**
   * Returns one standard PNG representation of the System's own icon. Anyone may read it.
   *
   * @param size Rendered size. Omission selects `medium`.
   */
  icon(size?: IconSize): Promise<Blob>

  /**
   * Opens something with the Program its type opens with: the default one, or the one the owner
   * chooses when there is no default. It resolves once a Process is started for it, and rejects when
   * no Program opens it or the owner opens it with none.
   */
  open(target: OpenTarget): Promise<void>

  /** Open requests waiting for a choice, and the default Program for each type. Requires `all`. */
  readonly opening: SystemOpening

  /** Executes one JSON operation through the ordinary public System handles. */
  execute<Request extends ExecuteRequest>(request: Request): Promise<ExecuteResult<Request>>

  /** Runs one shell command whose complete process tree belongs to the returned iterator. */
  shell(command: string, options?: ShellOptions): AsyncGenerator<ShellEvent, void, void>

}

// Keep Window's event vocabulary explicitly reachable from this contract.
export type SystemWindowEvents = WindowEvents
