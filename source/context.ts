import type { Endpoint } from "./endpoint.js"
import type { ClientEndpoint } from "./client-endpoint.js"
import type { WindowPresentation } from "./window-presentation.js"
import type { Publishable } from "./publishable.js"
import type { Process } from "./process.js"
import type { Program } from "./program.js"
import type { ServerEndpoint } from "./server-endpoint.js"
import type { Captures, Subscribable } from "./subscribable.js"
import type { ProgramPermissions } from "./permissions.js"
import type { Window } from "./window.js"

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

type ContextFallback<From> = ContextMessage<unknown, From>

/** Every application event observable through an executing Context. */
export type ContextCapture<Events extends object = {}, From = Endpoint | null> =
  Captures<ContextEvents<Events, From>, ContextFallback<From>>

/** Inbound communication and destinationless output of the executing Endpoint. */
export interface Context<Events extends object = {}, From = Endpoint | null>
  extends Subscribable<ContextEvents<Events, From>, ContextFallback<From>>, Publishable {
  /** Returns whether the executing Endpoint context is a service. */
  isService(): Promise<boolean>
}

/** Shared operations belonging to one executing Program endpoint. */
export interface EndpointContext<Events extends object = {}>
  extends Context<Events, Endpoint | null> {
  readonly permissions: ProgramPermissions
  process(): Promise<Process>
  name(): Promise<string | null>
  parent(): Promise<Process | null>
  program(): Promise<Program>
  /** Returns every immutable option supplied when this Process was created. */
  options<Options extends object = Readonly<Record<string, string>>>(): Promise<Readonly<Options>>
  /** Returns one immutable option supplied when this Process was created. */
  options<Option extends string = string>(name: string): Promise<Option | undefined>
  stop(): Promise<void>
}

/** Runtime context of the currently executing Client Endpoint. */
export interface ClientContext<Events extends object = {}> extends EndpointContext<Events> {
  readonly server: ServerEndpoint
  readonly window: Window
  readonly presentation: WindowPresentation
}

/** Handles one question addressed to the currently executing Server Endpoint. */
export type Answerer<Payload = unknown, Result = undefined> = (
  message: ContextMessage<Payload, Endpoint | null>
) => Result | Promise<Result>

/** Runtime context of the currently executing Server Endpoint. */
export interface ServerContext<Events extends object = {}> extends EndpointContext<Events> {
  readonly client: ClientEndpoint
  answer<Payload = unknown, Result = undefined>(event: string, answerer: Answerer<Payload, Result>): () => void
}
