import type { ClientEndpoint } from "./client-endpoint.js"
import type { Program } from "./program.js"
import type { ServerEndpoint } from "./server-endpoint.js"
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

/** Events emitted directly by one Process. */
export type ProcessEvents = {
  /** The complete Process ended. */
  exit: Exit
}

/** One live execution of a Program. */
export class Process {
  protected constructor() {}
}

export interface Process extends Subscribable<ProcessEvents, never> {
  /** Immutable runtime identity. */
  readonly identity: string

  /** Optional meaningful name unique among this Program's live Processes. */
  readonly name: string | null

  /** Instant at which this Process was created. */
  readonly startedAt: Date

  /** Permanent handle to this Process's Server Endpoint. */
  readonly server: ServerEndpoint

  /** Permanent handle to this Process's Client Endpoint. */
  readonly client: ClientEndpoint

  /** Returns the Program that owns this Process. */
  program(): Program

  /**
   * Returns the Process whose `program.process.create()` call created this Process.
   *
   * Returns `null` when this Process has no parent. Rejects when this Process
   * or its retained parent no longer exists.
   */
  parent(): Promise<Process | null>

  /** Returns one immutable launch option. */
  option(name: string): Promise<string | undefined>

  /** Ends the complete Process and all live Endpoints. */
  exit(): Promise<void>

  /** Returns whether this Process has ended. */
  exited(): Promise<boolean>
}
