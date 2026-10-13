import type { Process } from "./process.js"
import type { Publishable } from "./publishable.js"
import { subscribableDefinition, type Captures, type Cleanup, type EventOptions, type Subscribable, type SubscribableDefinition } from "./subscribable.js"

/**
 * Who an Endpoint is, as a message carries it: public values filled by the System, never a handle and
 * never hidden by permissions. Whoever may reach that Endpoint finds it by its Process:
 * `system.process.find(metadata.process)`.
 */
export type EndpointMetadata = Readonly<{
  /** The Program it belongs to. */
  program: Readonly<{ identity: string, name: string }>

  /** The identity of its Process: random, and never reused. */
  process: string

  /** Which side of that Process it is. */
  endpoint: "server" | "client"
}>

/** Validate one Endpoint's metadata, or `null` for a party outside every Program. */
export function parseEndpointMetadata(value: unknown): EndpointMetadata | null {
  if (value === null) return null
  const record = value as { program?: { identity?: unknown, name?: unknown }, process?: unknown, endpoint?: unknown } | undefined
  if (!record || typeof record !== "object" || !record.program || typeof record.program !== "object"
    || typeof record.program.identity !== "string" || typeof record.program.name !== "string"
    || typeof record.process !== "string" || (record.endpoint !== "server" && record.endpoint !== "client")) {
    throw new Error("The System sent malformed Endpoint metadata")
  }
  return Object.freeze({
    program: Object.freeze({ identity: record.program.identity, name: record.program.name }),
    process: record.process,
    endpoint: record.endpoint
  })
}

/** One application value observed in traffic originating from an Endpoint. */
export type TrafficMessage<Payload = unknown> = Readonly<{
  /** Who it went to, or `null` for a party outside every Program. */
  to: EndpointMetadata | null

  /** Single value supplied by the publisher. */
  payload: Payload
}>

/** Applies destination metadata to every observed ordinary event. */
export type TrafficEvents<Events extends object> = {
  readonly [Event in keyof Events]: TrafficMessage<Events[Event]>
}

type TrafficFallback<Fallback> = [Fallback] extends [never]
  ? never
  : TrafficMessage<Fallback>

/** One question sent by this Endpoint to a Server Endpoint. */
export type AskMessage<Payload = unknown> = Readonly<{
  /** The Server it asked. */
  to: EndpointMetadata

  /** Single question value supplied by the asker. */
  payload: Payload
}>

/** One observed question sent by this Endpoint. */
export type AskCapture<Payload = unknown> = Readonly<{
  /** Event addressed by the question. */
  event: string

  /** Correlation identity shared with the eventual answer. */
  questionId: string

  /** Question destination and payload. */
  message: AskMessage<Payload>
}>

/** A callback subscribed to questions sent by this Endpoint. */
export type AskSubscriber<Payload = unknown> = (capture: AskCapture<Payload>) => unknown

/** Every ordinary publication observable in traffic from one Endpoint. */
export type TrafficCapture<Events extends object = {}, Fallback = unknown> =
  Captures<TrafficEvents<Events>, TrafficFallback<Fallback>>

/** Directed communication originating from one Endpoint. */
export interface EndpointTraffic<Events extends object = {}, Fallback = unknown>
  extends Subscribable<TrafficEvents<Events>, TrafficFallback<Fallback>> {
  /** Subscribes to questions originating from this Endpoint. */
  subscribeAsks<Payload = unknown>(subscriber: AskSubscriber<Payload>): Cleanup

  /** Iterates questions originating from this Endpoint. */
  asks<Payload = unknown>(options?: EventOptions): AsyncIterableIterator<AskCapture<Payload>>
}

/** Lifecycle transitions observed for one Endpoint's execution context. */
export type EndpointLifecycleEvents = {
  /** A fresh Endpoint execution context began running. */
  start: undefined

  /** The running Endpoint execution context ended. */
  stop: undefined
}

/** Start and stop events observed at one Endpoint address. */
export interface EndpointLifecycle extends Subscribable<EndpointLifecycleEvents, never> {}

/**
 * The shared permanent handle of a Process's Server or Client Endpoint.
 *
 * Promise-based operations reject once the owning Process has ended or when
 * its Program never declared this Endpoint kind. A stopped declared Endpoint
 * remains valid because another execution context may be started.
 */
export abstract class Endpoint<Events extends object = {}, Fallback = unknown>
  implements Publishable, Subscribable<Events, Fallback> {
  protected constructor() {}

  public declare readonly [subscribableDefinition]?: SubscribableDefinition<Events, Fallback>

  public abstract readonly publish: Publishable["publish"]
  public abstract readonly subscribe: Subscribable<Events, Fallback>["subscribe"]
  public abstract readonly wait: Subscribable<Events, Fallback>["wait"]
  public abstract readonly events: Subscribable<Events, Fallback>["events"]

  /** Directed communication originating from this Endpoint. */
  public abstract readonly traffic: EndpointTraffic<Events, Fallback>

  /** Start and stop transitions of this permanent Endpoint's execution context. */
  public abstract readonly lifecycle: EndpointLifecycle

  /** Returns the Process that owns this Endpoint. */
  public abstract process(): Promise<Process>

  /** Returns whether this Endpoint currently has a running execution context. */
  public abstract running(): Promise<boolean>

  /**
   * Waits until this Endpoint can be used.
   *
   * A Client Endpoint is ready when it has a running execution context. A Server Endpoint additionally
   * has to announce readiness. Temporary absence remains waitable while the
   * owning Process exists. The SDK uses its ten-second deadline unless one is
   * supplied.
   */
  public abstract waitReady(timeout?: number): Promise<void>

  /**
   * Ensures this Endpoint has a running execution context without waiting for Server
   * Endpoint readiness. Launch values configure a newly created context;
   * an already-running context remains unchanged.
   *
   * Rejects when the Process is gone or inaccessible, the Program did not
   * declare this endpoint kind, the launch is invalid, or creation fails.
   */
  public abstract start(): Promise<void>

  /**
   * Ensures this Endpoint has no running execution context and destroys the current
   * context's boundary-owned resources when present.
   *
   * Rejects when the Process is gone or inaccessible, this is the Process's
   * final live Endpoint, or stopping fails. Stopping never exits the Process
   * implicitly.
   */
  public abstract stop(): Promise<void>

  /** The Service name this Endpoint is reached by across the System now, or `false` for none. */
  public abstract service(): Promise<string | false>

}
