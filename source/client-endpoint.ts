import { Endpoint, type EndpointTraffic } from "./endpoint.js"
import type { ClientLaunch } from "./launch.js"
import type { Window } from "./window.js"
import type { ClientMemory } from "./client-memory.js"

/** Directed communication originating from one Client Endpoint. */
export interface ClientTraffic<Events extends object = {}, Fallback = unknown> extends EndpointTraffic<Events, Fallback> {}

/** The Client Endpoint of a Process. */
export abstract class ClientEndpoint<Events extends object = {}, Fallback = unknown> extends Endpoint<Events, Fallback> {
  protected constructor() {
    super()
  }
  /** Directed communication originating from this Client Endpoint. */
  public abstract override readonly traffic: ClientTraffic<Events, Fallback>

  /** Presentation capability permanently owned by this Client Endpoint handle. */
  public abstract readonly window: Window

  /** Shared memory of the current Client run. */
  public abstract readonly memory: ClientMemory

  /** Ensures a Client execution context is running, using these overrides only when one must be created. */
  public abstract override start(launch?: ClientLaunch): Promise<void>

}
