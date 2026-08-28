import type { Endpoint } from "./endpoint.js"
import type { Publishable } from "./publishable.js"
import type { Captures, Subscribable } from "./subscribable.js"

/** One application value arriving through the current Endpoint's Channel. */
export type ChannelMessage<Payload = unknown, From = Endpoint | null> = Readonly<{
  /** Endpoint that sent the message, or `null` when its identity is outside this boundary. */
  from: From

  /** Single value supplied by the publisher. */
  payload: Payload
}>

/** Applies the sender envelope to every application event accepted here. */
export type ChannelEvents<Events extends object, From = Endpoint | null> = {
  readonly [Event in keyof Events]: ChannelMessage<Events[Event], From>
}

type ChannelFallback<Events extends object, From> = keyof Events extends never
  ? ChannelMessage<unknown, From>
  : never

/** Every application event observable through a Channel. */
export type ChannelCapture<Events extends object = {}, From = Endpoint | null> =
  Captures<ChannelEvents<Events, From>, ChannelFallback<Events, From>>

/** Addressed input and destinationless output for the executing Endpoint. */
export interface Channel<Events extends object = {}, From = Endpoint | null>
  extends Subscribable<ChannelEvents<Events, From>, ChannelFallback<Events, From>>, Publishable {
  /** Exposes this executing Channel under one public service name. */
  enableService(name: string): Promise<void>

  /** Stops exposing this executing Channel as a service. */
  disableService(): Promise<void>
}
