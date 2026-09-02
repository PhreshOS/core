import type { WritableAppearance } from "./appearance.js"
import type { Client } from "./client.js"
import type { Endpoint } from "./endpoint.js"
import type { Program, ProgramCommandChunk, ProgramProcess } from "./program.js"
import type { ClientLaunch, Layer, Launch, Position, ServerLaunch, Size } from "./launch.js"
import type { Exit, Process } from "./process.js"
import type { Server } from "./server.js"
import type { ClientService, ServerService, ServiceKey } from "./service.js"
import type { Storage } from "./storage.js"
import type { Subscribable } from "./subscribable.js"
import type { SystemUploads } from "./uploads.js"
import type { WindowEvents } from "./window.js"
import type { ClientPermissionDeclarations } from "./permissions.js"

/** Native filesystem storage exposed by an authoritative System. */
export interface SystemStorage extends Storage {
  /** Returns the absolute directory represented by this storage handle. */
  path(): Promise<string>

  /** Resolves path segments within this storage directory. */
  resolve(...path: string[]): Promise<string>
}

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

export interface SystemProgramProcess extends ProgramProcess {
  list(): Promise<SystemProcessEntity[]>
  first(): Promise<SystemProcessEntity | null>
  last(): Promise<SystemProcessEntity | null>
  find(identityOrName: string): Promise<SystemProcessEntity | null>
  create(launch?: Launch): Promise<SystemProcessEntity>
  findOrCreate(launch: Launch & Readonly<{ name: string }>): Promise<SystemProcessEntity>
  run(launch?: Launch, options?: SystemProcessRunOptions): AsyncGenerator<SystemProcessRunEvent, void, void>
}

/** Persistent Process launch used when the System starts. */
export interface SystemProgramStartup {
  /** Returns the configured launch, or `null` when startup is disabled. */
  get(): Promise<Launch | null>

  /** Enables startup with one validated Process launch. */
  enable(launch?: Launch): Promise<void>

  /** Disables startup without changing the Program or its Processes. */
  disable(): Promise<void>
}

/** Cancellation controls for one Process whose lifetime belongs to its iterator. */
export type SystemProcessRunOptions = Readonly<{
  /** Exits the Process and aborts iteration with this signal's reason. */
  signal?: AbortSignal
}>

/** Ordered lifecycle information produced by an attached Process run. */
export type SystemProcessRunEvent =
  | Readonly<{ event: "started", process: SystemProcessEntity }>
  | (Readonly<{ event: "output" }> & ProgramCommandChunk)
  | Readonly<{ event: "exited", process: SystemProcessEntity, exit: Exit }>

/** Canonical Program with authoritative System-owner capabilities. */
export interface SystemProgramEntity extends Program {
  readonly data: SystemStorage
  readonly cache: SystemStorage
  readonly process: SystemProgramProcess
  readonly startup: SystemProgramStartup

  install(): AsyncGenerator<ProgramCommandChunk, void, void>
  fork(identity: string): Promise<SystemProgramEntity>
}

export interface SystemEndpointEntity<Events extends object = {}, Fallback = unknown>
  extends Endpoint<Events, Fallback> {
  process(): Promise<SystemProcessEntity>
}

export interface SystemServerEntity<Events extends object = {}, Fallback = unknown> extends Server<Events, Fallback> {
  process(): Promise<SystemProcessEntity>
  start(launch?: ServerLaunch): Promise<void>
}

export interface SystemClientEntity<Events extends object = {}, Fallback = unknown> extends Client<Events, Fallback> {
  process(): Promise<SystemProcessEntity>
  start(launch?: ClientLaunch): Promise<void>
}

/** Canonical Process exposed by the authoritative System registry. */
export interface SystemProcessEntity extends Process {
  readonly server: SystemServerEntity
  readonly client: SystemClientEntity

  program(): SystemProgramEntity
  parent(): Promise<SystemProcessEntity | null>
}

export type SystemProgramUninstall = Readonly<{
  program: SystemProgramEntity
  everything: boolean
}>

export type SystemProcessExit = Exit & Readonly<{ process: SystemProcessEntity }>

export type SystemProgramEvents = {
  create: SystemProgramEntity
  forget: SystemProgramEntity
  install: SystemProgramEntity
  uninstall: SystemProgramUninstall
}

export type SystemProcessEvents = {
  create: SystemProcessEntity
  exit: SystemProcessExit
}

export interface SystemProgram extends Subscribable<SystemProgramEvents, never> {
  list(onlyInstalled?: boolean): Promise<SystemProgramEntity[]>
  find(identity: string): Promise<SystemProgramEntity | null>
  create(source: ProgramDefinition | string): Promise<SystemProgramEntity>
}

export interface SystemProcess extends Subscribable<SystemProcessEvents, never> {
  list(): Promise<SystemProcessEntity[]>
  find(identity: string): Promise<SystemProcessEntity | null>
}

/** Transport-neutral authoritative System contract shared by environment adapters. */
export interface System {
  readonly storage: SystemStorage
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
  forceCreateProgram(source: ProgramDefinition | string): Promise<SystemProgramEntity>

  service<Endpoint extends ServiceKey["endpoint"]>(key: Omit<ServiceKey, "endpoint"> & Readonly<{ endpoint: Endpoint }>): Endpoint extends "server" ? ServerService : ClientService
  service<Events extends object = {}, Fallback = unknown>(key: ServiceKey & { endpoint: "server" }): ServerService<Events, Fallback>
  service<Events extends object = {}, Fallback = unknown>(key: ServiceKey & { endpoint: "client" }): ClientService<Events, Fallback>
}

// Keep Window's event vocabulary explicitly reachable from this contract.
export type SystemWindowEvents = WindowEvents
