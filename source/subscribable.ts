/** The unconstrained message received by a general Subscribable. */
export type Message = unknown

/** The message observed for one event on a Subscribable. */
export type Capture<Event extends string = string, Received = Message> = Readonly<{
  /** Name under which the message was published. */
  event: Event

  /** Message delivered by the observed target. */
  message: Received
}>

/** The string event names declared by an event map. */
export type EventName<Events extends object> = Extract<keyof Events, string>

/** The message declared for one event name. */
export type EventMessage<Events extends object, Fallback, Event extends string> = Event extends EventName<Events> ? Events[Event] : Fallback

/** The correlated union observed across every event declared by a target. */
export type Captures<Events extends object, Fallback = never> = {
  [Event in EventName<Events>]: Capture<Event, Events[Event]>
}[EventName<Events>] | ([Fallback] extends [never] ? never : Capture<string, Fallback>)

/** A callback for one subscribed message. Its return value is not communication. */
export type EventSubscriber<Message> = (message: Message) => unknown

/** A callback subscribed across every event on one target. */
export type CaptureSubscriber<Events extends object, Fallback = never> = (capture: Captures<Events, Fallback>) => unknown

/** Removes exactly one persistent registration. Safe to call more than once. */
export type Cleanup = () => void

// Carries a Subscribable's declared types through higher-order adapters. The
// symbol is deliberately private and has no runtime representation.
declare const definition: unique symbol

type Definition<Events extends object, Fallback> = Readonly<{
  events: Events
  fallback: Fallback
}>

/** Extracts the declared event map from a Subscribable type. */
export type SubscribableEvents<Target> = Target extends {
  readonly [definition]?: Definition<infer Events, unknown>
} ? Events : never

/** Extracts the fallback message from a Subscribable type. */
export type SubscribableFallback<Target> = Target extends {
  readonly [definition]?: Definition<object, infer Fallback>
} ? Fallback : never

/** Options controlling one asynchronous event iterator. */
export type EventOptions = Readonly<{
  /** Maximum queued messages. Defaults to `64`; `Infinity` removes the bound. */
  capacity?: number

  /** Aborts iteration and removes its temporary boundary registration. */
  signal?: AbortSignal
}>

// Preserves declared string literals in editor completion while still
// accepting application-defined event names.
type OpenEvent = string & {}

type AvailableEvent<Events extends object, Fallback> = EventName<Events> | ([Fallback] extends [never] ? never : OpenEvent)

// An explicit `<string>` must never be mistaken for a narrowed message type.
// Inferred literals still select the event-aware overload, while the separate
// non-generic overload below accepts genuinely dynamic event names.
type InferredEvent<Event extends string> = string extends Event ? never : Event

type CompatibleEvent<Events extends object, Fallback, Narrowed> = {
  [Event in EventName<Events>]: Narrowed extends Events[Event] ? Event : never
}[EventName<Events>] | ([Fallback] extends [never] ? never : Narrowed extends Fallback ? OpenEvent : never)

interface Subscribe<Events extends object, Fallback> {
  /** Registers one persistent subscription across every event and returns its cleanup. */
  (subscriber: CaptureSubscriber<Events, Fallback>): Cleanup

  /** Registers one persistent named-event subscription and returns its cleanup. */
  <Event extends AvailableEvent<Events, Fallback>>(event: InferredEvent<Event>, subscriber: EventSubscriber<EventMessage<Events, Fallback, Event>>): Cleanup

  /** Registers one persistent named-event subscription and returns its cleanup. */
  <Narrowed>(event: CompatibleEvent<Events, Fallback, Narrowed>, subscriber: EventSubscriber<Narrowed>): Cleanup

  /** Registers one persistent named-event subscription and returns its cleanup. */
  (event: [Fallback] extends [never] ? never : OpenEvent, subscriber: EventSubscriber<Fallback>): Cleanup
}

interface WaitFor<Events extends object, Fallback> {
  /** Waits for the next matching message. */
  <Narrowed>(event: CompatibleEvent<Events, Fallback, Narrowed>, timeout?: number): Promise<Narrowed>

  /** Waits for the next matching message. */
  <Event extends AvailableEvent<Events, Fallback>>(event: InferredEvent<Event>, timeout?: number): Promise<EventMessage<Events, Fallback, Event>>

  /** Waits for the next matching message. */
  (event: [Fallback] extends [never] ? never : OpenEvent, timeout?: number): Promise<Fallback>
}

interface EventStream<Events extends object, Fallback> {
  /** Iterates matching messages until closed, aborted, or impossible. */
  <Narrowed>(event: CompatibleEvent<Events, Fallback, Narrowed>, options?: EventOptions): AsyncIterableIterator<Narrowed>

  /** Iterates matching messages until closed, aborted, or impossible. */
  <Event extends AvailableEvent<Events, Fallback>>(event: InferredEvent<Event>, options?: EventOptions): AsyncIterableIterator<EventMessage<Events, Fallback, Event>>

  /** Iterates matching messages until closed, aborted, or impossible. */
  (event: [Fallback] extends [never] ? never : OpenEvent, options?: EventOptions): AsyncIterableIterator<Fallback>

  /** Iterates every event as a correlated capture until closed, aborted, or impossible. */
  (options?: EventOptions): AsyncIterableIterator<Captures<Events, Fallback>>
}

/**
 * The common receiving capability supplied by environment SDKs.
 *
 * Persistent registrations return their sole cleanup function. A registration
 * may remain active across temporary endpoint absence and is removed only by
 * that cleanup or by destruction of its owning boundary.
 *
 * `waitFor()` uses the SDK's ten-second deadline unless one is supplied.
 * `events()` is long-lived instead: it ends when iteration is closed, its
 * signal aborts, or the boundary proves that future delivery is impossible.
 */
export interface Subscribable<Events extends object = {}, Fallback = unknown> {
  /** @internal Preserves this contract's declared types for SDK adapters. */
  readonly [definition]?: Definition<Events, Fallback>

  /** Registers one persistent subscription for a named event or every event. */
  subscribe: Subscribe<Events, Fallback>

  /** Waits for the next matching message. */
  waitFor: WaitFor<Events, Fallback>

  /** Iterates one named event or every event until closed, aborted, or impossible. */
  events: EventStream<Events, Fallback>
}
