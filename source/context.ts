import type { Endpoint } from "./endpoint.js"
import type { LocalWindow } from "./local-window.js"
import type { Publishable } from "./publishable.js"
import type { Captures, Subscribable } from "./subscribable.js"
import type {
  SystemClientEntity,
  SystemProcessEntity,
  SystemProgramEntity,
  SystemServerEntity
} from "./system.js"
import type { ContextPermissions } from "./permissions.js"

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
  /** Returns whether the executing Endpoint incarnation is a service. */
  isService(): Promise<boolean>
}

/** Shared operations belonging to one executing Program endpoint. */
export interface EndpointContext<Events extends object = {}>
  extends Context<Events, Endpoint | null> {
  process(): Promise<SystemProcessEntity>
  name(): Promise<string | null>
  parent(): Promise<SystemProcessEntity | null>
  program(): Promise<SystemProgramEntity>
  option(name: string): Promise<string | undefined>
  stop(): Promise<void>
}

/** Runtime context of the currently executing Client endpoint. */
export interface ClientContext<Events extends object = {}> extends EndpointContext<Events> {
  readonly server: SystemServerEntity
  readonly localWindow: LocalWindow
  readonly permissions: ContextPermissions
}

/** Handles one question addressed to the currently executing Server. */
export type Answerer<Payload = unknown, Result = undefined> = (
  message: ContextMessage<Payload, Endpoint | null>
) => Result | Promise<Result>

/** Runtime context of the currently executing Server endpoint. */
export interface ServerContext<Events extends object = {}> extends EndpointContext<Events> {
  readonly client: SystemClientEntity
  answer<Payload = unknown, Result = undefined>(event: string, answerer: Answerer<Payload, Result>): () => void
}
