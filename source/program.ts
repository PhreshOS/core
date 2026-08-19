import type { Launch, Layer, Position, Size } from "./launch.js"
import type { Exit, Process } from "./process.js"
import type { ProgramSql } from "./sql.js"
import type { ProgramArea, ProgramStore } from "./storage.js"
import type { Subscribable } from "./subscribable.js"

/** Standard rendered sizes available for every Program icon. */
export type ProgramIconSize = "small" | "medium" | "large"

/** Resolved declaration shared by Server and Client endpoint kinds. */
export type EndpointDeclaration = Readonly<{
  /** Whether a default Process starts this declared Endpoint. */
  start: boolean
}>

/** Resolved Client declaration and its default Window state. */
export type ClientDeclaration = EndpointDeclaration & Readonly<{
  /** Default Window title, or `null` when the system supplies it. */
  title: string | null

  /** Default Window size, or `null` when the system supplies it. */
  size: Size | null

  /** Default Window position, or `null` when the system supplies it. */
  position: Position | null

  /** Default Window layer, or `null` for the system default. */
  layer: Layer | null

  /** Default minimized state, or `null` for the system default. */
  minimize: boolean | null
}>

/** A Process exit scoped to its owning Program. */
export type ProgramProcessExit = Exit & Readonly<{
  /** Process that ended. */
  process: Process
}>

/** Lifecycle events scoped to one Program. */
export type ProgramEvents = {
  /** One Process Endpoint entered a new live incarnation. */
  endpointStart: Process["server"] | Process["client"]

  /** One Process Endpoint incarnation ended. */
  endpointStop: Process["server"] | Process["client"]

  /** A Process entered this Program's runtime set. */
  processCreate: Process

  /** A Process left this Program's runtime set. */
  processExit: ProgramProcessExit

  /** This Program left the runtime registry. */
  forget: undefined

  /** This Program left the installed state. */
  uninstall: Readonly<{
    /** Whether every installed resource, including storage, was removed. */
    everythingRemoved: boolean
  }>
}

/** The stable domain root from which Processes are created. */
export class Program<Events extends object = {}> {
  protected constructor() {}
}

export interface Program<Events extends object = {}> extends Subscribable<ProgramEvents & Events, never> {
  /** Stable public identity. */
  readonly identity: string

  /** Human-readable name. */
  readonly name: string

  /** Declared version, or `null`. */
  readonly version: string | null

  /** Declared description, or `null`. */
  readonly description: string | null

  /** Server declaration, or `null` when this Program cannot start one. */
  readonly server: EndpointDeclaration | null

  /** Client declaration, or `null` when this Program cannot start one. */
  readonly client: ClientDeclaration | null

  /** Persistent filesystem data shared by every Process of this Program. */
  readonly data: ProgramArea

  /** Disposable filesystem data shared by every Process of this Program. */
  readonly cache: ProgramArea

  /** Persistent key-value storage shared by every Process of this Program. */
  readonly store: ProgramStore

  /** Read-only SQL access to captured Client and Server output. */
  readonly logs: ProgramSql

  /** Writable SQLite database owned by this Program. */
  readonly database: ProgramSql

  /** Returns every live Process of this Program available to this SDK. */
  processes(): Promise<Process[]>

  /** Returns the earliest-started live Process, or `null` when none exist. */
  firstProcess(): Promise<Process | null>

  /** Returns the latest-started live Process, or `null` when none exist. */
  lastProcess(): Promise<Process | null>

  /** Finds a live Process by identity or Program-local name. */
  getProcess(identityOrName: string): Promise<Process | null>

  /** Creates one Process of this Program. */
  createProcess(launch?: Launch): Promise<Process>

  /**
   * Returns one standard PNG representation of this Program's icon.
   * Programs without an authored icon receive the system default.
   *
   * @param size Rendered size. Omission selects `medium`.
   */
  icon(size?: ProgramIconSize): Promise<Blob>

  /** Returns whether this Program currently has an installed form. */
  installed(): Promise<boolean>

  /** Removes this Program's installed form. */
  uninstall(everything?: boolean): Promise<void>

  /** Ends all Processes and removes this Program from the runtime registry. */
  forget(): Promise<void>

  /** Ends every live Process and returns their identities. */
  exitAll(): Promise<string[]>
}
