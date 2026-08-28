import type { Askable } from "./askable.js"
import type { WritableAppearance } from "./appearance.js"
import type { ClientDeclaration, EndpointDeclaration, ProgramCommandChunk, ProgramEvents } from "./program.js"
import type { Layer, Launch, LaunchClient, Position, Size } from "./launch.js"
import type { Exit } from "./process.js"
import type { Publishable } from "./publishable.js"
import type { ClientServiceHandler, ServerServiceHandler, ServiceHandler, ServiceKey } from "./service.js"
import type { Storage } from "./storage.js"
import type { Subscribable } from "./subscribable.js"
import type { SystemUploads } from "./uploads.js"
import type { Window, WindowEvents } from "./window.js"

type ServerDescriptionBase = Readonly<{
  location: string
  start?: boolean
  installCommand?: string
  uninstallCommand?: string
}>

export type ServerDescription = ServerDescriptionBase & (
  | Readonly<{ startCommand: string, entryFile?: never }>
  | Readonly<{ startCommand?: never, entryFile: string }>
)

export type ClientDescription = Readonly<{
  location: string
  start?: boolean
  title?: string
  size?: Size
  position?: Position
  layer?: Layer
  minimize?: boolean
}>

type Description = Readonly<{
  identity: string
  name?: string
  version?: string
  description?: string
  icon?: string
  agent?: string
  storage: string
}>

export type ProgramDescription = Description & (
  | Readonly<{ server: ServerDescription, client?: ClientDescription }>
  | Readonly<{ server?: ServerDescription, client: ClientDescription }>
)

export interface SystemProgramProcess extends Subscribable<SystemProgramProcessEvents, never> {
  list(): Promise<SystemProcessEntity[]>
  first(): Promise<SystemProcessEntity | null>
  last(): Promise<SystemProcessEntity | null>
  find(identityOrName: string): Promise<SystemProcessEntity | null>
  create(launch?: Launch): Promise<SystemProcessEntity>
  findOrCreate(launch: Launch & Readonly<{ name: string }>): Promise<SystemProcessEntity>
  exitAll(): Promise<string[]>
}

export type SystemProgramProcessEvents = {
  endpointStart: SystemServerEntity | SystemClientEntity
  endpointStop: SystemServerEntity | SystemClientEntity
  create: SystemProcessEntity
  exit: SystemProcessExit
}

/** Program entity exposed by the authoritative System registry. */
export interface SystemProgramEntity extends Subscribable<ProgramEvents, never> {
  readonly identity: string
  readonly name: string
  readonly version: string | null
  readonly description: string | null
  readonly hasAgent: boolean
  readonly server: EndpointDeclaration | null
  readonly client: ClientDeclaration | null
  readonly process: SystemProgramProcess

  agent(): Promise<string | null>
  installed(): Promise<boolean>
  install(): AsyncGenerator<ProgramCommandChunk, void, void>
  uninstall(everything?: boolean): AsyncGenerator<ProgramCommandChunk, void, void>
  forget(): Promise<void>
}

export interface SystemEndpointEntity<Events extends object = {}>
  extends Publishable, Subscribable<Events, keyof Events extends never ? unknown : never> {
  process(): Promise<SystemProcessEntity>
  exists(): Promise<boolean>
  start(): Promise<void>
  stop(): Promise<void>
  service(): Promise<ServiceHandler | null>
}

export interface SystemServerEntity<Events extends object = {}> extends SystemEndpointEntity<Events>, Askable {
  waitReady(timeout?: number): Promise<void>
  service<ServiceEvents extends object = {}>(): Promise<ServerServiceHandler<ServiceEvents> | null>
}

export interface SystemClientEntity<Events extends object = {}> extends SystemEndpointEntity<Events> {
  readonly window: Window
  start(overrides?: LaunchClient): Promise<void>
  service<ServiceEvents extends object = {}>(): Promise<ClientServiceHandler<ServiceEvents> | null>
}

export type SystemProcessEntityEvents = {
  endpointStart: SystemServerEntity | SystemClientEntity
  endpointStop: SystemServerEntity | SystemClientEntity
  exit: Exit
}

/** Process entity exposed by the authoritative System registry. */
export interface SystemProcessEntity extends Subscribable<SystemProcessEntityEvents, never> {
  readonly identity: string
  readonly name: string | null
  readonly startedAt: Date
  readonly server: SystemServerEntity
  readonly client: SystemClientEntity

  program(): SystemProgramEntity
  exit(): Promise<void>
  exited(): Promise<boolean>
}

export type SystemProgramUninstall = Readonly<{
  program: SystemProgramEntity
  everythingRemoved: boolean
}>

export type SystemProcessExit = Exit & Readonly<{ process: SystemProcessEntity }>

export type SystemProgramEvents = {
  create: SystemProgramEntity
  forget: SystemProgramEntity
  install: SystemProgramEntity
  uninstall: SystemProgramUninstall
}

export type SystemProcessEvents = {
  endpointStart: SystemServerEntity | SystemClientEntity
  endpointStop: SystemServerEntity | SystemClientEntity
  create: SystemProcessEntity
  exit: SystemProcessExit
}

export interface SystemProgram extends Subscribable<SystemProgramEvents, never> {
  list(onlyInstalled?: boolean): Promise<SystemProgramEntity[]>
  find(identity: string): Promise<SystemProgramEntity | null>
  create(source: ProgramDescription | string): Promise<SystemProgramEntity>
}

export interface SystemProcess extends Subscribable<SystemProcessEvents, never> {
  list(): Promise<SystemProcessEntity[]>
  find(identity: string): Promise<SystemProcessEntity | null>
}

/** Transport-neutral authoritative System contract shared by Server and Gateway adapters. */
export interface System {
  readonly storage: Storage
  readonly appearance: WritableAppearance
  readonly program: SystemProgram
  readonly process: SystemProcess
  readonly uploads: SystemUploads

  service<Events extends object = {}>(key: ServiceKey & { endpoint: "server" }): ServerServiceHandler<Events>
  service<Events extends object = {}>(key: ServiceKey & { endpoint: "client" }): ClientServiceHandler<Events>
}

// Keep Window's event vocabulary explicitly reachable from this contract.
export type SystemWindowEvents = WindowEvents
