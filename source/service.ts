import type { Askable } from "./askable.js"
import type { EndpointLifecycle } from "./endpoint.js"
import type { Publishable } from "./publishable.js"
import { subscribableDefinition, type Subscribable, type SubscribableDefinition } from "./subscribable.js"

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
export abstract class Service<Events extends object = {}, Fallback = unknown>
  implements Publishable, Subscribable<Events, Fallback> {
  protected constructor() {}

  public declare readonly [subscribableDefinition]?: SubscribableDefinition<Events, Fallback>

  public abstract readonly publish: Publishable["publish"]
  public abstract readonly subscribe: Subscribable<Events, Fallback>["subscribe"]
  public abstract readonly wait: Subscribable<Events, Fallback>["wait"]
  public abstract readonly events: Subscribable<Events, Fallback>["events"]

  /** Start and stop transitions of the addressed Endpoint. */
  public abstract readonly lifecycle: EndpointLifecycle

  /** Returns whether the addressed Endpoint currently has a live incarnation. */
  public abstract exists(): Promise<boolean>

  /**
   * Waits until the addressed Endpoint service can be used.
   *
   * A Client service is ready when its Client incarnation exists. A Server
   * service additionally has to announce readiness. The SDK uses its
   * ten-second deadline unless one is supplied.
   */
  public abstract waitReady(timeout?: number): Promise<void>
}

/** Stable handle for one Server-provided service. */
export abstract class ServerService<Events extends object = {}, Fallback = unknown>
  extends Service<Events, Fallback> {
  protected constructor() {
    super()
  }

  public abstract ask<Answer = unknown>(event: string): Promise<Answer>
  public abstract ask<Answer = unknown, Payload = unknown>(event: string, payload: Payload): Promise<Answer>
  public abstract timeout(milliseconds: number): ReturnType<Askable["timeout"]>
}

/** Stable handle for one Client-provided service. */
export abstract class ClientService<Events extends object = {}, Fallback = unknown>
  extends Service<Events, Fallback> {
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
