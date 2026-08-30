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

/** Lifecycle events of one stable Service handle. */
export interface ServiceLifecycle extends Subscribable<ServiceLifecycleEvents, never> {}

/** Stable lifecycle handle for one exact public service identity. */
export class Service<Events extends object = {}> {
  protected constructor() {}
}

export interface Service<Events extends object = {}>
  extends Subscribable<Events, keyof Events extends never ? unknown : never> {
  /** Program-authored service identity. */
  readonly name: string

  /** Enable and disable transitions, separate from application events. */
  readonly lifecycle: ServiceLifecycle

  /** Reads whether a live Endpoint currently provides this service. */
  enabled(): Promise<boolean>

  /** Waits until a live Endpoint provides this service. */
  waitReady(timeout?: number): Promise<void>
}

/** Stable handle for one Server-provided service. */
export class ServerService<Events extends object = {}>
  extends Service<Events> {
  protected constructor() {
    super()
  }
}

export interface ServerService<Events extends object = {}> extends Askable {}

/** Stable handle for one Client-provided service. */
export class ClientService<Events extends object = {}>
  extends Service<Events> {
  protected constructor() {
    super()
  }
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
