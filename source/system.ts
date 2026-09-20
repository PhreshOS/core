import type { WritableAppearance } from "./appearance.js"
import type { Program } from "./program.js"
import type { Launch, Layer, Position, Size } from "./launch.js"
import type { Exit, Process } from "./process.js"
import type { ClientService, ServerService, Service, ServiceAddress, ServiceEndpoint } from "./service.js"
import type { Storage } from "./storage.js"
import type { Subscribable } from "./subscribable.js"
import type { SystemUploads } from "./uploads.js"
import type { WindowEvents } from "./window.js"
import type { WindowFrame } from "./window.js"
import type { WindowTransaction } from "./appearance-transaction.js"
import type { Network } from "./network.js"
import type { ProgramPermissionDeclarations } from "./permissions.js"
import type { Connection } from "./connection.js"
import type { Session, SessionEndReason } from "./session.js"
import type { ExecuteRequest, ExecuteResult } from "./execute/contract.js"

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
  start?: boolean
  service?: boolean
  title?: string
  header?: boolean
  frame?: WindowFrame
  transaction?: WindowTransaction
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
  website?: string
  icon?: string
  agent?: string
  storage: string
  /** Startup configuration written at creation and installation; omission preserves stored configuration. */
  startup?: true | Launch
  /** Icon launch configuration written at creation and installation; omission preserves stored configuration. */
  launch?: true | Launch
  /** Permission declarations applied to this Program's authoritative permission state. */
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

/** Lifecycle events in the System Connection registry. */
export type SystemConnectionEvents = {
  create: Connection
  disconnect: Connection
}

/** Live browser Connections known by the System. */
export interface SystemConnection extends Subscribable<SystemConnectionEvents, never> {
  list(): Promise<Connection[]>
  find(identity: string): Promise<Connection | null>
}

/** One Session ending in the authoritative System registry. */
export type SystemSessionEnd = Readonly<{
  session: Session
  reason: SessionEndReason
}>

/** Lifecycle events in the System Session registry. */
export type SystemSessionEvents = {
  create: Session
  end: SystemSessionEnd
}

/** Authentication Sessions known by the System. */
export interface SystemSession extends Subscribable<SystemSessionEvents, never> {
  list(): Promise<Session[]>
  find(identity: string): Promise<Session | null>
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
  /** Returns every ready Service visible to the caller. */
  list(): Promise<(ServerService | ClientService)[]>

  /** Returns every ready visible Service whose Process has this name. */
  search(name: string): Promise<(ServerService | ClientService)[]>

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
  readonly connection: SystemConnection
  readonly session: SystemSession
  readonly service: SystemService
  readonly uploads: SystemUploads
  readonly network: Network

  /** Executes one JSON operation through the ordinary public System handles. */
  execute<Request extends ExecuteRequest>(request: Request): Promise<ExecuteResult<Request>>

  /** Runs one shell command whose complete process tree belongs to the returned iterator. */
  shell(command: string, options?: ShellOptions): AsyncGenerator<ShellEvent, void, void>

}

// Keep Window's event vocabulary explicitly reachable from this contract.
export type SystemWindowEvents = WindowEvents
