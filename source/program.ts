import type { Launch, Layer, Position, Size } from "./launch.js"
import type { Exit, Process } from "./process.js"
import type { ProgramSql } from "./sql.js"
import type { ProgramStore, Storage } from "./storage.js"
import { subscribableDefinition, type Subscribable, type SubscribableDefinition } from "./subscribable.js"
import type { ProgramPermissions } from "./permissions.js"

/** Standard rendered sizes available for every Program icon. */
export type ProgramIconSize = "small" | "medium" | "large"

/** One ordered text chunk produced by a Program lifecycle command. */
export type ProgramCommandChunk = Readonly<{
  /** Command stream that produced this chunk. */
  stream: "stdout" | "stderr"

  /** Text exactly as emitted by the install command. */
  text: string
}>

/** Resolved declaration shared by Server and Client endpoint kinds. */
export type EndpointDeclaration = Readonly<{
  /** Whether a default Process starts this declared Endpoint. */
  start: boolean

  /** Default service role for new Endpoint incarnations. */
  service: boolean
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
  /** Default maximized state, or null for the system default. */
  maximize: boolean | null

}>

/** A Process exit scoped to its owning Program. */
export type ProgramProcessExit = Exit & Readonly<{
  /** Process that ended. */
  process: Process
}>

/** Process lifecycle events scoped to one Program. */
export type ProgramProcessEvents = {
  /** A Process entered this Program's runtime set. */
  create: Process

  /** A Process left this Program's runtime set. */
  exit: ProgramProcessExit

}

/** Operations over the Processes belonging to one Program. */
export interface ProgramProcess extends Subscribable<ProgramProcessEvents, never> {
  /** Returns every live Process of this Program available to this SDK. */
  list(): Promise<Process[]>

  /** Returns the earliest-started live Process, or `null` when none exist. */
  first(): Promise<Process | null>

  /** Returns the latest-started live Process, or `null` when none exist. */
  last(): Promise<Process | null>

  /** Finds a live Process by identity or Program-local name. */
  find(identityOrName: string): Promise<Process | null>

  /** Creates one Process of this Program. */
  create(launch?: Launch): Promise<Process>

  /** Finds the named Process or atomically creates it with the same resolved launch. */
  findOrCreate(launch: Launch & Readonly<{ name: string }>): Promise<Process>

  /** Ends every live Process and returns their identities. */
  exitAll(): Promise<string[]>

  /** Creates a Process whose lifetime belongs to the returned iterator. */
  run(launch?: Launch, options?: ProgramProcessRunOptions): AsyncGenerator<ProgramProcessRunEvent, void, void>
}

/** Cancellation controls for one Process whose lifetime belongs to its iterator. */
export type ProgramProcessRunOptions = Readonly<{
  /** Exits the Process and aborts iteration with this signal's reason. */
  signal?: AbortSignal
}>

/** Ordered lifecycle information produced by an attached Process run. */
export type ProgramProcessRunEvent =
  | Readonly<{ event: "started", process: Process }>
  | (Readonly<{ event: "output" }> & ProgramCommandChunk)
  | Readonly<{ event: "exited", process: Process, exit: Exit }>

/** Persistent Process launch used when the System starts. */
export interface ProgramStartup {
  /** Returns the configured launch, or `null` when startup is disabled. */
  get(): Promise<Launch | null>

  /** Enables startup with one validated Process launch. */
  enable(launch?: Launch): Promise<void>

  /** Disables startup without changing the Program or its Processes. */
  disable(): Promise<void>
}

/** Lifecycle events belonging to one Program entity. */
export type ProgramEvents = {
  /** This Program left the runtime registry. */
  forget: undefined

  /** Whether every installed resource, including storage, was removed. */
  uninstall: boolean
}

/** The stable domain root from which Processes are created. */
export abstract class Program implements Subscribable<ProgramEvents, never> {
  protected constructor() {}

  public declare readonly [subscribableDefinition]?: SubscribableDefinition<ProgramEvents, never>

  public abstract readonly subscribe: Subscribable<ProgramEvents, never>["subscribe"]
  public abstract readonly wait: Subscribable<ProgramEvents, never>["wait"]
  public abstract readonly events: Subscribable<ProgramEvents, never>["events"]

  /** Stable public identity. */
  public abstract readonly identity: string

  /** Runtime identity used to address this Program's browser assets. */
  public abstract readonly assetId: string

  /** Human-readable name. */
  public abstract readonly name: string

  /** Declared version, or `null`. */
  public abstract readonly version: string | null

  /** Declared description, or `null`. */
  public abstract readonly description: string | null

  /** Whether this Program provides Program-specific documentation for agents. */
  public abstract readonly hasAgent: boolean

  /** Server declaration, or `null` when this Program cannot start one. */
  public abstract readonly server: EndpointDeclaration | null

  /** Client declaration, or `null` when this Program cannot start one. */
  public abstract readonly client: ClientDeclaration | null

  /** Persistent filesystem data shared by every Process of this Program. */
  public abstract readonly data: Storage

  /** Disposable filesystem data shared by every Process of this Program. */
  public abstract readonly cache: Storage

  /** Persistent key-value storage shared by every Process of this Program. */
  public abstract readonly store: ProgramStore

  /** Read-only SQL access to captured Client and Server output. */
  public abstract readonly logs: ProgramSql

  /** Writable SQLite database owned by this Program. */
  public abstract readonly database: ProgramSql

  /** Operations and lifecycle observation for this Program's Processes. */
  public abstract readonly process: ProgramProcess

  /** Persistent Process launch applied when the System starts. */
  public abstract readonly startup: ProgramStartup

  /** Authoritative permission state managed for this Program. */
  public abstract readonly permissions: ProgramPermissions

  /**
   * Returns one standard PNG representation of this Program's icon.
   * Programs without an authored icon receive the system default.
   *
   * @param size Rendered size. Omission selects `medium`.
   */
  public abstract icon(size?: ProgramIconSize): Promise<Blob>

  /** Reads this Program's agent documentation, or `null` when none is declared. */
  public abstract agent(): Promise<string | null>

  /** Returns whether this Program currently has an installed form. */
  public abstract installed(): Promise<boolean>

  /** Installs this Program while yielding command output. */
  public abstract install(): AsyncGenerator<ProgramCommandChunk, void, void>

  /** Removes this Program's installed form while yielding cleanup output. */
  public abstract uninstall(everything?: boolean): AsyncGenerator<ProgramCommandChunk, void, void>

  /** Ends all Processes and removes this Program from the runtime registry. */
  public abstract forget(): Promise<void>

  /** Creates another Program from this Program under a new identity. */
  public abstract fork(identity: string): Promise<Program>
}
