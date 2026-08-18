import type { EventMessage, EventName } from "./subscribable.js"

// Preserves declared string literals in editor completion while still
// accepting application-defined event names.
type OpenEvent = string & {}

type AvailableEvent<Events extends object, Fallback> = EventName<Events> | ([Fallback] extends [never] ? never : OpenEvent)

type CompatibleEvent<Events extends object, Fallback, Payload> = {
  [Event in EventName<Events>]: Payload extends Events[Event] ? Event : never
}[EventName<Events>] | ([Fallback] extends [never] ? never : Payload extends Fallback ? OpenEvent : never)

interface Publish<Events extends object, Fallback> {
  /** Publishes `undefined` to one named event on this target. */
  <Event extends CompatibleEvent<Events, Fallback, undefined>>(
    event: Event
  ): void

  /** Publishes one payload to one named event on this target. */
  <Payload, Event extends CompatibleEvent<Events, Fallback, Payload> = CompatibleEvent<Events, Fallback, Payload>>(
    event: Event,
    payload: Payload
  ): void

  /** Publishes one payload to one named event on this target. */
  <Event extends AvailableEvent<Events, Fallback>>(
    event: Event,
    payload: EventMessage<Events, Fallback, Event>
  ): void
}

/**
 * The independent capability to publish one payload to a named event.
 *
 * Publishing is synchronous and fire-and-forget. An unavailable destination
 * silently drops the publication; no delivery result is produced.
 */
export interface Publishable<Events extends object = {}, Fallback = unknown> {
  /** Publishes one payload, or `undefined` when omitted, to one named event. */
  publish: Publish<Events, Fallback>
}
