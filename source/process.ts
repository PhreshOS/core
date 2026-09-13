import type { ClientEndpoint } from "./client-endpoint.js"
import type { Program } from "./program.js"
import type { ServerEndpoint } from "./server-endpoint.js"
import { subscribableDefinition, type Subscribable, type SubscribableDefinition } from "./subscribable.js"

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
export abstract class Process implements Subscribable<ProcessEvents, never> {
  protected constructor() {}

  public declare readonly [subscribableDefinition]?: SubscribableDefinition<ProcessEvents, never>

  public abstract readonly subscribe: Subscribable<ProcessEvents, never>["subscribe"]
  public abstract readonly wait: Subscribable<ProcessEvents, never>["wait"]
  public abstract readonly events: Subscribable<ProcessEvents, never>["events"]

  /** Immutable runtime identity. */
  public abstract readonly identity: string

  /** Optional meaningful name unique among this Program's live Processes. */
  public abstract readonly name: string | null

  /** Instant at which this Process was created. */
  public abstract readonly startedAt: Date

  /** Permanent handle to this Process's Server Endpoint. */
  public abstract readonly server: ServerEndpoint

  /** Permanent handle to this Process's Client Endpoint. */
  public abstract readonly client: ClientEndpoint

  /** Returns the Program that owns this Process. */
  public abstract program(): Program

  /**
   * Returns the Process whose `program.process.create()` call created this Process.
   *
   * Returns `null` when this Process has no parent. The retained parent handle
   * remains available after that parent exits.
   */
  public abstract parent(): Promise<Process | null>

  /** Returns every immutable option supplied when this Process was created. */
  public abstract options<Options extends object = Readonly<Record<string, string>>>(): Promise<Readonly<Options>>

  /** Returns one immutable option supplied when this Process was created. */
  public abstract options<Option extends string = string>(name: string): Promise<Option | undefined>

  /** Ends the complete Process and all live Endpoints. */
  public abstract exit(): Promise<void>

  /** Returns whether this Process has ended. */
  public abstract exited(): Promise<boolean>
}
