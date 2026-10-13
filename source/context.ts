import type { EndpointMetadata } from "./endpoint.js"
import type { ClientEndpoint } from "./client-endpoint.js"
import type { Presentation } from "./presentation.js"
import type { Publishable } from "./publishable.js"
import type { Process } from "./process.js"
import type { Program } from "./program.js"
import type { ServerEndpoint } from "./server-endpoint.js"
import type { Captures, Subscribable } from "./subscribable.js"
import type { ContextPermissions } from "./permissions.js"
import type { Window } from "./window.js"
import type { ClientMemory } from "./client-memory.js"
import type { OpenTarget } from "./opening.js"

/** One application value arriving through the executing Endpoint's Context. */
export type ContextMessage<Payload = unknown> = Readonly<{
  /** Who sent it, or `null` for a party outside every Program, such as a script acting for the owner. */
  from: EndpointMetadata | null

  /** Single value supplied by the publisher. */
  payload: Payload
}>

/** Applies the sender envelope to every application event accepted here. */
export type ContextEvents<Events extends object> = {
  readonly [Event in keyof Events]: ContextMessage<Events[Event]>
}

type ContextFallback = ContextMessage<unknown>

/** Every application event observable through an executing Context. */
export type ContextCapture<Events extends object = {}> =
  Captures<ContextEvents<Events>, ContextFallback>

/** Inbound communication and destinationless output of the executing Endpoint. */
export interface Context<Events extends object = {}>
  extends Subscribable<ContextEvents<Events>, ContextFallback>, Publishable {
  /** The Service name the executing Endpoint is reached by across the System, or `false` for none. */
  service(): Promise<string | false>
}

/** Shared operations belonging to one executing Program endpoint. */
export interface EndpointContext<Events extends object = {}>
  extends Context<Events> {
  readonly permissions: ContextPermissions
  process(): Promise<Process>
  name(): Promise<string | null>
  parent(): Promise<Process | null>
  program(): Promise<Program>
  /** Returns every immutable option supplied when this Process was created. */
  options<Options extends object = Readonly<Record<string, string>>>(): Promise<Readonly<Options>>
  /** Returns one immutable option supplied when this Process was created. */
  options<Option extends string = string>(name: string): Promise<Option | undefined>
  /** What this Process was started to open through `system.open()`, or `null` when it was not. */
  opened(): Promise<OpenTarget | null>
  stop(): Promise<void>
}

/** Runtime context of the currently executing Client Endpoint. */
export interface ClientContext<Events extends object = {}> extends EndpointContext<Events> {
  readonly memory: ClientMemory
  readonly server: ServerEndpoint
  readonly window: Window
  readonly presentation: Presentation
}

/** One question addressed to the executing Server Endpoint, and whether its asker still waits. */
export type QuestionMessage<Payload = unknown> = ContextMessage<Payload> & Readonly<{
  /**
   * Aborted once the asker stops waiting: its time ran out, it stopped, or it went away. An answer
   * given after that reaches no one.
   */
  signal: AbortSignal
}>

/** Handles one question addressed to the currently executing Server Endpoint. */
export type Answerer<Payload = unknown, Result = undefined> = (
  message: QuestionMessage<Payload>
) => Result | Promise<Result>

/** Runtime context of the currently executing Server Endpoint. */
export interface ServerContext<Events extends object = {}> extends EndpointContext<Events> {
  readonly client: ClientEndpoint
  answer<Payload = unknown, Result = undefined>(event: string, answerer: Answerer<Payload, Result>): () => void
}
