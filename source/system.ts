import type { WritableAppearance } from "./appearance.js"
import type { Program } from "./program.js"
import type { Layer, Position, Size } from "./launch.js"
import type { Exit, Process } from "./process.js"
import type { ClientService, ServerService, ServiceKey } from "./service.js"
import type { Storage } from "./storage.js"
import type { Subscribable } from "./subscribable.js"
import type { SystemUploads } from "./uploads.js"
import type { WindowEvents } from "./window.js"
import type { ClientPermissionDeclarations } from "./permissions.js"

type ServerDefinitionBase = Readonly<{
  location: string
  start?: boolean
  service?: boolean
  installCommand?: string
  uninstallCommand?: string
}>

export type ServerDefinition = ServerDefinitionBase & (
  | Readonly<{ startCommand: string, entryFile?: never }>
  | Readonly<{ startCommand?: never, entryFile: string }>
)

export type ClientDefinition = Readonly<{
  location: string
  start?: boolean
  service?: boolean
  title?: string
  size?: Size
  position?: Position
  layer?: Layer
  minimize?: boolean
  permissions?: ClientPermissionDeclarations
}>

type ProgramDefinitionBase = Readonly<{
  identity: string
  name?: string
  version?: string
  description?: string
  icon?: string
  agent?: string
  storage: string
}>

export type ProgramDefinition = ProgramDefinitionBase & (
  | Readonly<{ server: ServerDefinition, client?: ClientDefinition }>
  | Readonly<{ server?: ServerDefinition, client: ClientDefinition }>
)

export type SystemProgramUninstall = Readonly<{
  program: Program
  everything: boolean
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
}

export type SystemProcessEvents = {
  create: Process
  exit: SystemProcessExit
}

export interface SystemProgram extends Subscribable<SystemProgramEvents, never> {
  list(onlyInstalled?: boolean): Promise<Program[]>
  find(identity: string): Promise<Program | null>
  create(source: ProgramDefinition | string): Promise<Program>
}

export interface SystemProcess extends Subscribable<SystemProcessEvents, never> {
  list(): Promise<Process[]>
  find(identity: string): Promise<Process | null>
}

/** Transport-neutral authoritative System contract shared by environment adapters. */
export interface System {
  readonly storage: Storage
  readonly appearance: WritableAppearance
  readonly program: SystemProgram
  readonly process: SystemProcess
  readonly uploads: SystemUploads

  /** Performs one outbound request through this environment's System adapter. */
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>

  /** Opens one outbound connection and returns the platform-standard WebSocket. */
  websocket(url: string | URL, protocols?: string | string[]): Promise<WebSocket>

  /** Runs one shell command whose complete process tree belongs to the returned iterator. */
  shell(command: string, options?: ShellOptions): AsyncGenerator<ShellEvent, void, void>

  /**
   * Atomically claims a Program identity for a new uninstalled runtime entity.
   *
   * Any current runtime Program at the identity is forgotten first. Installed
   * files and storage remain untouched; invalid incoming definitions are
   * rejected before the current entity is changed.
   */
  forceCreateProgram(source: ProgramDefinition | string): Promise<Program>

  service<Endpoint extends ServiceKey["endpoint"]>(key: Omit<ServiceKey, "endpoint"> & Readonly<{ endpoint: Endpoint }>): Endpoint extends "server" ? ServerService : ClientService
  service<Events extends object = {}, Fallback = unknown>(key: ServiceKey & { endpoint: "server" }): ServerService<Events, Fallback>
  service<Events extends object = {}, Fallback = unknown>(key: ServiceKey & { endpoint: "client" }): ClientService<Events, Fallback>
}

// Keep Window's event vocabulary explicitly reachable from this contract.
export type SystemWindowEvents = WindowEvents
