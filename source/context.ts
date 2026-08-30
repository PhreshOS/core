import type { Endpoint } from "./endpoint.js"
import type { Publishable } from "./publishable.js"
import type { Captures, Subscribable } from "./subscribable.js"

/** One application value arriving through the executing Endpoint's Context. */
export type ContextMessage<Payload = unknown, From = Endpoint | null> = Readonly<{
  /** Endpoint that sent the message, or `null` when its identity is outside this boundary. */
  from: From

  /** Single value supplied by the publisher. */
  payload: Payload
}>

/** Applies the sender envelope to every application event accepted here. */
export type ContextEvents<Events extends object, From = Endpoint | null> = {
  readonly [Event in keyof Events]: ContextMessage<Events[Event], From>
}

type ContextFallback<Events extends object, From> = keyof Events extends never
  ? ContextMessage<unknown, From>
  : never

/** Every application event observable through an executing Context. */
export type ContextCapture<Events extends object = {}, From = Endpoint | null> =
  Captures<ContextEvents<Events, From>, ContextFallback<Events, From>>

/** Inbound communication and destinationless output of the executing Endpoint. */
export interface Context<Events extends object = {}, From = Endpoint | null>
  extends Subscribable<ContextEvents<Events, From>, ContextFallback<Events, From>>, Publishable {
  /** Exposes the executing Endpoint under one public service name. */
  enableService(name: string): Promise<void>

  /** Stops exposing the executing Endpoint as a service. */
  disableService(): Promise<void>
}
