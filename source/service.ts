import type { Askable } from "./askable.js"
import type { Publishable } from "./publishable.js"
import type { ProgramIconSize } from "./program.js"
import { subscribableDefinition, type Subscribable, type SubscribableDefinition } from "./subscribable.js"
import { isProgramIdentity } from "./program-identity.js"

/** Endpoint kind addressed by a Service. */
export type ServiceEndpoint = "server" | "client"

/** Stable symbolic address of one discoverable Endpoint. */
export type ServiceAddress<Endpoint extends ServiceEndpoint = ServiceEndpoint> = Readonly<{
  /** Stable identity of the Program that owns the named Process. */
  program: string

  /** Program-local Process name, which acts as the Service name. */
  process: string

  /** Endpoint kind exposed through this Service address. */
  endpoint: Endpoint
}>

/** Repeating availability transitions of one stable Service address. */
export type ServiceLifecycleEvents = {
  /** A ready Endpoint became available in Service mode at this address. */
  available: undefined

  /** The Endpoint at this address ceased to be an available Service. */
  unavailable: undefined
}

/** Availability lifecycle of one stable Service address. */
export interface ServiceLifecycle extends Subscribable<ServiceLifecycleEvents, never> {}

/** Live Program presentation metadata exposed through an available Service. */
export type ServiceProgramMetadata = Readonly<{
  name: string
  version: string
}>

/** Stable communication handle for one Service address. */
export abstract class Service<Events extends object = {}, Fallback = unknown>
  implements Publishable, Subscribable<Events, Fallback> {
  protected constructor() {}

  public declare readonly [subscribableDefinition]?: SubscribableDefinition<Events, Fallback>

  public abstract readonly publish: Publishable["publish"]
  public abstract readonly subscribe: Subscribable<Events, Fallback>["subscribe"]
  public abstract readonly wait: Subscribable<Events, Fallback>["wait"]
  public abstract readonly events: Subscribable<Events, Fallback>["events"]

  /** Repeating availability transitions at this stable address. */
  public abstract readonly lifecycle: ServiceLifecycle

  /** Returns the immutable symbolic address represented by this handle. */
  public abstract address(): ServiceAddress

  /** Returns whether a ready Endpoint is currently available as this Service. */
  public abstract available(): Promise<boolean>

  /** Reads Program metadata from the currently available Service provider. */
  public abstract programMetadata(): Promise<ServiceProgramMetadata>

  /** Reads one PNG Program icon from the currently available Service provider. */
  public abstract programIcon(size?: ProgramIconSize): Promise<Blob>

  /**
   * Waits until a ready Endpoint is available in Service mode at this address.
   * The SDK uses its ten-second deadline unless one is supplied.
   */
  public abstract waitReady(timeout?: number): Promise<void>
}

/** Stable handle for one Server Service address. */
export abstract class ServerService<Events extends object = {}, Fallback = unknown>
  extends Service<Events, Fallback> {
  protected constructor() {
    super()
  }

  public abstract override address(): ServiceAddress<"server">
  public abstract ask<Answer = unknown>(event: string): Promise<Answer>
  public abstract ask<Answer = unknown, Payload = unknown>(event: string, payload: Payload): Promise<Answer>
  public abstract timeout(milliseconds: number): ReturnType<Askable["timeout"]>
}

/** Stable handle for one Client Service address. */
export abstract class ClientService<Events extends object = {}, Fallback = unknown>
  extends Service<Events, Fallback> {
  protected constructor() {
    super()
  }

  public abstract override address(): ServiceAddress<"client">
}

/** Returns whether a boundary value is a complete Service address. */
export function isServiceAddress(value: unknown): value is ServiceAddress {
  if (typeof value !== "object" || value === null) return false

  const candidate = value as Partial<ServiceAddress>

  return isProgramIdentity(candidate.program)
    && typeof candidate.process === "string"
    && candidate.process.trim().length > 0
    && (candidate.endpoint === "server" || candidate.endpoint === "client")
}
