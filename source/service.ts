import type { Askable } from "./askable.js"
import type { Subscribable } from "./subscribable.js"

/** Stable public coordinates of one explicitly named Endpoint service. */
export type ServiceKey = Readonly<{
  /** Stable identity of the Program that owns the providing Endpoint. */
  program: string

  /** Endpoint kind deliberately exposed by the service author. */
  endpoint: "server" | "client"

  /** Program-authored service identity. */
  name: string
}>

/** Lifecycle transitions of one exact service identity. */
export type ServiceLifecycleEvents = {
  /** A live Endpoint began providing this service. */
  enable: undefined

  /** The providing Endpoint stopped exposing this service. */
  disable: undefined
}

/** Application events emitted by one service. */
export interface ServiceChannel<Events extends object = {}>
  extends Subscribable<Events, keyof Events extends never ? unknown : never> {}

/** Communication surface of a service provided by a Server Endpoint. */
export interface ServerServiceChannel<Events extends object = {}>
  extends ServiceChannel<Events>, Askable {}

/** Communication surface of a service provided by a Client Endpoint. */
export interface ClientServiceChannel<Events extends object = {}>
  extends ServiceChannel<Events> {}

/** Stable lifecycle handle for one exact public service identity. */
export class Service<Channel extends object = ServiceChannel> {
  protected constructor() {}
}

export interface Service<Channel extends object = ServiceChannel>
  extends Subscribable<ServiceLifecycleEvents, never> {
  /** Program-authored service identity. */
  readonly name: string

  /** Application communication, separate from service lifecycle. */
  readonly channel: Channel

  /** Reads whether a live Endpoint currently provides this service. */
  enabled(): Promise<boolean>

  /** Waits until a live Endpoint provides this service. */
  waitReady(timeout?: number): Promise<void>
}

/** Stable handle for one Server-provided service. */
export class ServerService<Events extends object = {}>
  extends Service<ServerServiceChannel<Events>> {
  protected constructor() {
    super()
  }
}

export interface ServerService<Events extends object = {}> {
  readonly channel: ServerServiceChannel<Events>
}

/** Stable handle for one Client-provided service. */
export class ClientService<Events extends object = {}>
  extends Service<ClientServiceChannel<Events>> {
  protected constructor() {
    super()
  }
}

export interface ClientService<Events extends object = {}> {
  readonly channel: ClientServiceChannel<Events>
}

/** Returns whether a boundary value is a complete service key. */
export function isServiceKey(value: unknown): value is ServiceKey {
  if (typeof value !== "object" || value === null) return false

  const candidate = value as Partial<ServiceKey>

  return typeof candidate.program === "string"
    && candidate.program.length > 0
    && (candidate.endpoint === "server" || candidate.endpoint === "client")
    && typeof candidate.name === "string"
    && candidate.name.length > 0
}
