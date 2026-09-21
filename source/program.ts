import type { Launch, Layer, Position, Size } from "./launch.js"
import type { Exit, Process } from "./process.js"
import type { ProgramSql } from "./sql.js"
import type { ProgramStore, Storage } from "./storage.js"
import { subscribableDefinition, type Subscribable, type SubscribableDefinition } from "./subscribable.js"
import type { ProgramPermissions } from "./permissions.js"
import type { WindowFrame } from "./window.js"
import type { WindowTransaction } from "./appearance-transaction.js"
import type { ProgramDefinition } from "./system.js"

/** Version assigned when a Program definition omits one. */
export const defaultProgramVersion = "0.0.0"

/** Standard rendered sizes available for every Program icon. */
export type ProgramIconSize = "small" | "medium" | "large"

/** One ordered text chunk produced by a Program lifecycle command. */
export type ProgramCommandChunk = Readonly<{
  /** Command stream that produced this chunk. */
  stream: "stdout" | "stderr"

  /** Text exactly as emitted by the install command. */
  text: string
}>

/** Installation decisions applied by System. */
export type ProgramInstallOptions = Readonly<{
  /** Override the Program definition's post-install launch. `true` uses Endpoint defaults; `false` disables it. */
  launch?: boolean | Launch
  /** Delete existing installed Program storage. Omission preserves it. */
  purge?: boolean
}>

/** Removal decisions applied by System. */
export type ProgramUninstallOptions = Readonly<{
  /** Also remove Processes, persistent storage, and the runtime Program. */
  purge?: boolean
}>

/** Resolved declaration shared by Server and Client endpoint kinds. */
export type EndpointDeclaration = Readonly<{
  /** Whether a default Process starts this declared Endpoint. */
  start: boolean

  /** Default service role for new Endpoint execution contexts. */
  service: boolean
}>

/** Resolved Client declaration and its default Window state. */
export type ClientDeclaration = EndpointDeclaration & Readonly<{
  /** Default Window title, or `null` when the system supplies it. */
  title: string | null

  /** Default standard Window header state, or `null` for the system default. */
  header: boolean | null

  /** Default authoritative frame, or `null` for the layer default. */
  frame: WindowFrame | null

  /** Default presentation transaction, or `null` for the layer default. */
  transaction: WindowTransaction | null

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
  /** A Process was created by this Program. */
  processCreate: Process

  /** A Process belonging to this Program ended. */
  processExit: ProgramProcessExit

  /** This Program left the runtime registry. */
  forget: undefined

  /** Whether every installed resource, including storage, was removed. */
  uninstall: Readonly<{ purge: boolean }>

  /** Whether this Program is retained as a pinned Program. */
  pinned: boolean
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

  /** Declared version, or the default Program version when omitted. */
  public abstract readonly version: string

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

  /** Persistent Process launch applied when the System starts. */
  public abstract readonly startup: ProgramStartup

  /** Effective permission state resolved from stored assignments and the Program definition. */
  public abstract readonly permissions: ProgramPermissions

  /** Returns whether this Program is pinned. */
  public abstract pinned(): Promise<boolean>

  /** Pins this Program. */
  public abstract pin(): Promise<void>

  /** Unpins this Program. */
  public abstract unpin(): Promise<void>

  /**
   * Returns one standard PNG representation of this Program's icon.
   * Programs without an authored icon receive the system default.
   *
   * @param size Rendered size. Omission selects `medium`.
   */
  public abstract icon(size?: ProgramIconSize): Promise<Blob>

  /** Returns the complete canonical definition accepted by System Program creation. */
  public abstract definition(): Promise<ProgramDefinition>

  /** Reads this Program's agent documentation, or `null` when none is declared. */
  public abstract agent(): Promise<string | null>

  /** Returns whether this Program currently has an installed form. */
  public abstract installed(): Promise<boolean>

  /** Returns every live Process belonging to this Program. */
  public abstract processes(): Promise<Process[]>

  /** Returns the earliest-started live Process, or `null` when none exist. */
  public abstract firstProcess(): Promise<Process | null>

  /** Returns the latest-started live Process, or `null` when none exist. */
  public abstract lastProcess(): Promise<Process | null>

  /** Finds a live Process by identity or Program-local name. */
  public abstract findProcess(identityOrName: string): Promise<Process | null>

  /** Creates one Process belonging to this Program. */
  public abstract createProcess(launch?: Launch): Promise<Process>

  /** Finds the named Process or atomically creates it with the same resolved launch. */
  public abstract findOrCreateProcess(launch: Launch & Readonly<{ name: string }>): Promise<Process>

  /** Ends every live Process belonging to this Program and returns their identities. */
  public abstract exitProcesses(): Promise<string[]>

  /** Creates a Process whose lifetime belongs to the returned iterator. */
  public abstract runProcess(launch?: Launch, options?: ProgramProcessRunOptions): AsyncGenerator<ProgramProcessRunEvent, void, void>

  /** Installs this Program while yielding command output. */
  public abstract install(options?: ProgramInstallOptions): AsyncGenerator<ProgramCommandChunk, void, void>

  /**
   * Ensures this Program has no installed form while yielding cleanup output.
   * An already-uninstalled Program yields nothing. Purge additionally removes
   * its runtime entity and storage.
   */
  public abstract uninstall(options?: ProgramUninstallOptions): AsyncGenerator<ProgramCommandChunk, void, void>

  /** Ends all Processes and removes this Program from the runtime registry. */
  public abstract forget(): Promise<void>

}
