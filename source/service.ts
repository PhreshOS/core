import type { Askable } from "./askable.js"
import type { Publishable } from "./publishable.js"
import { subscribableDefinition, type Subscribable, type SubscribableDefinition } from "./subscribable.js"

/** Endpoint kind addressed by a Service. */
export type ServiceEndpoint = "server" | "client"

const namePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * Whether a value is a Service name: lowercase letters and digits in words joined by `-`, such as
 * `file-picker-v1`. A Service name is public across the whole System, held by one Endpoint at a time.
 */
export function isServiceName(value: unknown): value is string {
  return typeof value === "string" && namePattern.test(value)
}

/**
 * What a Service handle reaches: a Service name, and the kind of Endpoint it must be, when the
 * caller needs one kind. The name alone reaches whichever Endpoint holds it.
 */
export type ServiceAddress<Endpoint extends ServiceEndpoint = ServiceEndpoint> = Readonly<{
  /** The Service name, public across the System. */
  name: string

  /** The kind of Endpoint the name must be held by; any kind when left out. */
  endpoint?: Endpoint
}>

/** Repeating availability transitions of one Service name. */
export type ServiceLifecycleEvents = {
  /** An Endpoint of the addressed kind became ready under this name. */
  available: undefined

  /** The Endpoint under this name ended, was replaced, or stopped being a Service. */
  unavailable: undefined
}

/** Availability lifecycle of one Service name. */
export interface ServiceLifecycle extends Subscribable<ServiceLifecycleEvents, never> {}

/**
 * A handle to whatever Endpoint holds a Service name now: the same handle reaches a new holder when
 * the name changes hands. Who provides it stays out of sight; the name is the contract.
 */
export abstract class Service<Events extends object = {}, Fallback = unknown>
  implements Publishable, Subscribable<Events, Fallback> {
  protected constructor() {}

  public declare readonly [subscribableDefinition]?: SubscribableDefinition<Events, Fallback>

  public abstract readonly publish: Publishable["publish"]
  public abstract readonly subscribe: Subscribable<Events, Fallback>["subscribe"]
  public abstract readonly wait: Subscribable<Events, Fallback>["wait"]
  public abstract readonly events: Subscribable<Events, Fallback>["events"]

  /** Repeating availability transitions of this name. */
  public abstract readonly lifecycle: ServiceLifecycle

  /** The address this handle reaches. */
  public abstract address(): ServiceAddress

  /** Returns whether an Endpoint of the addressed kind holds this name now. */
  public abstract available(): Promise<boolean>

  /**
   * Waits until an Endpoint of the addressed kind holds this name and is ready.
   * The SDK uses its ten-second deadline unless one is supplied.
   */
  public abstract waitReady(timeout?: number): Promise<void>
}

/** A handle to the Server Endpoint holding a Service name: the one kind that answers questions. */
export abstract class ServerService<Events extends object = {}, Fallback = unknown>
  extends Service<Events, Fallback> {
  protected constructor() {
    super()
  }

  public abstract override address(): ServiceAddress<"server"> & Readonly<{ endpoint: "server" }>
  public abstract ask<Answer = unknown>(event: string): Promise<Answer>
  public abstract ask<Answer = unknown, Payload = unknown>(event: string, payload: Payload): Promise<Answer>
  public abstract timeout(milliseconds: number): ReturnType<Askable["timeout"]>
}

/** A handle to the Client Endpoint holding a Service name. */
export abstract class ClientService<Events extends object = {}, Fallback = unknown>
  extends Service<Events, Fallback> {
  protected constructor() {
    super()
  }

  public abstract override address(): ServiceAddress<"client"> & Readonly<{ endpoint: "client" }>
}

/**
 * Reads what a definition or a Launch says of an Endpoint's Service: a Service name, under which it is
 * reached across the System, or `false` for none.
 */
export function parseServiceValue(value: unknown, what: string): string | false {
  if (value === false || isServiceName(value)) return value
  throw new Error(`${what} is a Service name, such as "file-picker-v1", or false`)
}

/** Returns whether a boundary value is a Service address. */
export function isServiceAddress(value: unknown): value is ServiceAddress {
  if (typeof value !== "object" || value === null) return false

  const candidate = value as Partial<ServiceAddress>

  return isServiceName(candidate.name)
    && (candidate.endpoint === undefined || candidate.endpoint === "server" || candidate.endpoint === "client")
}
