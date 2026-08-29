import type { Process } from "./process.js"
import type { Publishable } from "./publishable.js"
import type { Server } from "./server.js"
import type { Service } from "./service.js"
import type { Captures, Cleanup, Subscribable } from "./subscribable.js"

/** One application value observed in traffic originating from an Endpoint. */
export type TrafficMessage<Payload = unknown, To = Endpoint> = Readonly<{
  /** Destination Endpoint, or `null` when its identity is outside this boundary. */
  to: To

  /** Single value supplied by the publisher. */
  payload: Payload
}>

/** Applies destination metadata to every observed ordinary event. */
export type TrafficEvents<Events extends object, To = Endpoint> = {
  readonly [Event in keyof Events]: TrafficMessage<Events[Event], To>
}

type TrafficFallback<Events extends object, To> = keyof Events extends never
  ? TrafficMessage<unknown, To>
  : never

/** One question sent by this Endpoint to a Server. */
export type AskMessage<Payload = unknown, To = Server> = Readonly<{
  /** Destination Server, or `null` when its identity is outside this boundary. */
  to: To

  /** Single question value supplied by the asker. */
  payload: Payload
}>

/** One observed question sent by this Endpoint. */
export type AskCapture<Payload = unknown, To = Server> = Readonly<{
  /** Event addressed by the question. */
  event: string

  /** Correlation identity shared with the eventual answer. */
  questionId: string

  /** Question destination and payload. */
  message: AskMessage<Payload, To>
}>

/** A callback that observes questions sent by this Endpoint. */
export type AskObserver<Payload = unknown, To = Server> = (capture: AskCapture<Payload, To>) => unknown

/** Every ordinary publication observable in traffic from one Endpoint. */
export type TrafficCapture<Events extends object = {}, To = Endpoint> =
  Captures<TrafficEvents<Events, To>, TrafficFallback<Events, To>>

/** Directed communication originating from one Endpoint. */
export interface EndpointTraffic<
  Events extends object = {},
  To = Endpoint,
  AskTo = Server
> extends Subscribable<TrafficEvents<Events, To>, TrafficFallback<Events, To>> {
  /** Observes questions originating from this Endpoint. */
  observeAsks<Payload = unknown>(observer: AskObserver<Payload, AskTo>): Cleanup
}

/** The shared Process endpoint represented by Server and Client. */
export class Endpoint<Events extends object = {}> {
  protected constructor() {}
}

/** An Endpoint address that can also be followed as a destinationless source. */
export interface Endpoint<Events extends object = {}>
  extends Publishable, Subscribable<Events, keyof Events extends never ? unknown : never> {
  /** Directed communication originating from this Endpoint. */
  readonly traffic: EndpointTraffic<Events>

  /** Returns the Process that owns this Endpoint. */
  process(): Promise<Process>

  /** Returns whether this Endpoint currently has a live incarnation. */
  exists(): Promise<boolean>

  /**
   * Starts a fresh incarnation without waiting for Server readiness.
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

  /** Returns this Endpoint's current complete service handle, or `null`. */
  service(): Promise<Service | null>

}
