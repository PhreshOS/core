import type { Process } from "./process.js"
import type { Publishable } from "./publishable.js"
import type { ServerEndpoint } from "./server-endpoint.js"
import type { Captures, Cleanup, EventOptions, Subscribable } from "./subscribable.js"

/** One application value observed in traffic originating from an Endpoint. */
export type TrafficMessage<Payload = unknown, To = Endpoint | null> = Readonly<{
  /** Destination Endpoint, or `null` when its identity is outside this boundary. */
  to: To

  /** Single value supplied by the publisher. */
  payload: Payload
}>

/** Applies destination metadata to every observed ordinary event. */
export type TrafficEvents<Events extends object, To = Endpoint | null> = {
  readonly [Event in keyof Events]: TrafficMessage<Events[Event], To>
}

type TrafficFallback<Fallback, To> = [Fallback] extends [never]
  ? never
  : TrafficMessage<Fallback, To>

/** One question sent by this Endpoint to a Server Endpoint. */
export type AskMessage<Payload = unknown, To = ServerEndpoint | null> = Readonly<{
  /** Destination Server Endpoint, or `null` when its identity is outside this boundary. */
  to: To

  /** Single question value supplied by the asker. */
  payload: Payload
}>

/** One observed question sent by this Endpoint. */
export type AskCapture<Payload = unknown, To = ServerEndpoint | null> = Readonly<{
  /** Event addressed by the question. */
  event: string

  /** Correlation identity shared with the eventual answer. */
  questionId: string

  /** Question destination and payload. */
  message: AskMessage<Payload, To>
}>

/** A callback subscribed to questions sent by this Endpoint. */
export type AskSubscriber<Payload = unknown, To = ServerEndpoint | null> = (capture: AskCapture<Payload, To>) => unknown

/** Every ordinary publication observable in traffic from one Endpoint. */
export type TrafficCapture<Events extends object = {}, To = Endpoint | null, Fallback = unknown> =
  Captures<TrafficEvents<Events, To>, TrafficFallback<Fallback, To>>

/** Directed communication originating from one Endpoint. */
export interface EndpointTraffic<
  Events extends object = {},
  To = Endpoint | null,
  AskTo = ServerEndpoint | null,
  Fallback = unknown
> extends Subscribable<TrafficEvents<Events, To>, TrafficFallback<Fallback, To>> {
  /** Subscribes to questions originating from this Endpoint. */
  subscribeAsks<Payload = unknown>(subscriber: AskSubscriber<Payload, AskTo>): Cleanup

  /** Iterates questions originating from this Endpoint. */
  asks<Payload = unknown>(options?: EventOptions): AsyncIterableIterator<AskCapture<Payload, AskTo>>
}

/** Lifecycle transitions observed at one Endpoint address. */
export type EndpointLifecycleEvents = {
  /** A fresh Endpoint incarnation became live. */
  start: undefined

  /** The live Endpoint incarnation ended. */
  stop: undefined
}

/** Start and stop events observed at one Endpoint address. */
export interface EndpointLifecycle extends Subscribable<EndpointLifecycleEvents, never> {}

/** The shared base of a Process's Server Endpoint and Client Endpoint. */
export class Endpoint<Events extends object = {}, Fallback = unknown> {
  protected constructor() {}
}

/** An Endpoint address that can also be followed as a destinationless source. */
export interface Endpoint<Events extends object = {}, Fallback = unknown>
  extends Publishable, Subscribable<Events, Fallback> {
  /** Directed communication originating from this Endpoint. */
  readonly traffic: EndpointTraffic<Events, Endpoint | null, ServerEndpoint | null, Fallback>

  /** Start and stop transitions of this permanent Endpoint handle. */
  readonly lifecycle: EndpointLifecycle

  /** Returns the Process that owns this Endpoint. */
  process(): Promise<Process>

  /** Returns whether this Endpoint currently has a live incarnation. */
  exists(): Promise<boolean>

  /**
   * Waits until this Endpoint can be used.
   *
   * A Client Endpoint is ready when it has a live incarnation. A Server Endpoint additionally
   * has to announce readiness. Temporary absence remains waitable while the
   * owning Process exists. The SDK uses its ten-second deadline unless one is
   * supplied.
   */
  waitReady(timeout?: number): Promise<void>

  /**
   * Starts a fresh incarnation without waiting for Server Endpoint readiness.
   *
   * Rejects when the Process is gone or inaccessible, the Program did not
   * declare this endpoint kind, the Endpoint is already starting or live, or
   * creation fails.
   */
  start(): Promise<void>

  /**
   * Stops the current incarnation and destroys its boundary-owned resources.
   *
   * Rejects when the Process is gone or inaccessible, the Endpoint is already
   * stopping or absent, this is the Process's final live Endpoint, or stopping
   * fails. Stopping never exits the Process implicitly.
   */
  stop(): Promise<void>

  /** Returns whether the current Endpoint incarnation is a service. */
  isService(): Promise<boolean>

}
