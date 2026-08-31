import type { Askable } from "./askable.js"
import type { EndpointLifecycle } from "./endpoint.js"
import type { Publishable } from "./publishable.js"
import type { Subscribable } from "./subscribable.js"

/** Stable public coordinates of one Endpoint service. */
export type ServiceKey = Readonly<{
  /** Program identity required when {@link process} is a Program-local name. */
  program?: string

  /** Process identity or Program-local Process name. */
  process: string

  /** Configured Endpoint kind addressed by this service. */
  endpoint: "server" | "client"
}>

/** Stable communication handle for one Endpoint service address. */
export class Service<Events extends object = {}> {
  protected constructor() {}
}

export interface Service<Events extends object = {}>
  extends Publishable, Subscribable<Events, keyof Events extends never ? unknown : never> {
  /** Start and stop transitions of the addressed Endpoint. */
  readonly lifecycle: EndpointLifecycle

  /** Returns whether the addressed Endpoint currently has a live incarnation. */
  exists(): Promise<boolean>
}

/** Stable handle for one Server-provided service. */
export class ServerService<Events extends object = {}>
  extends Service<Events> {
  protected constructor() {
    super()
  }
}

export interface ServerService<Events extends object = {}> extends Askable {
  /** Waits until the addressed Server incarnation is ready. */
  waitReady(timeout?: number): Promise<void>
}

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

  return (candidate.program === undefined || typeof candidate.program === "string" && candidate.program.length > 0)
    && typeof candidate.process === "string"
    && candidate.process.length > 0
    && (candidate.program !== undefined || processIdentity.test(candidate.process))
    && (candidate.endpoint === "server" || candidate.endpoint === "client")
}

const processIdentity = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
