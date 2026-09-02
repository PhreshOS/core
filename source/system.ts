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
