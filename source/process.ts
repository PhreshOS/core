import type { Client } from "./client.js"
import type { Program } from "./program.js"
import type { Server } from "./server.js"
import type { Subscribable } from "./subscribable.js"

/** How an operating-system-backed endpoint or Process finished. */
export type Exit = Readonly<{
  /** Whether the endpoint exited normally or was terminated by a signal. */
  status: "exited" | "signaled"

  /** Numeric exit code, or `null` when no code was reported. */
  code: number | null

  /** Signal name, or `null` when no signal ended it. */
  signal: string | null
}>

/** Lifecycle events emitted by one Process. */
export type ProcessEvents = {
  /** One declared Endpoint entered a new live incarnation. */
  endpointStart: Server | Client

  /** One live Endpoint incarnation ended. */
  endpointStop: Server | Client

  /** The complete Process ended. */
  exit: Exit
}

/** One live execution of a Program. */
export class Process<Events extends object = {}> {
  protected constructor() {}
}

export interface Process<Events extends object = {}> extends Subscribable<ProcessEvents & Events, never> {
  /** Immutable runtime identity. */
  readonly identity: string

  /** Optional meaningful name unique among this Program's live Processes. */
  readonly name: string | null

  /** Instant at which this Process was created. */
  readonly startedAt: Date

  /** Permanent handle to this Process's Server. */
  readonly server: Server

  /** Permanent handle to this Process's Client. */
  readonly client: Client

  /** Returns the Program that owns this Process. */
  program(): Program

  /**
   * Returns the Process whose `createProcess()` call created this Process.
   *
   * Returns `null` when this Process has no accessible parent handle. Rejects
   * when this Process or its retained parent no longer exists. Client
   * environments never expose a parent belonging to another Program.
   */
  parent(): Promise<Process | null>

  /** Returns one immutable launch option. */
  option(name: string): Promise<string | undefined>

  /** Ends the complete Process and all live Endpoints. */
  exit(): Promise<void>

  /** Returns whether this Process has ended. */
  exited(): Promise<boolean>
}
