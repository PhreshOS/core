import { Endpoint, type EndpointTraffic } from "./endpoint.js"
import type { ClientLaunch } from "./launch.js"
import type { ServerEndpoint } from "./server-endpoint.js"
import type { Window } from "./window.js"

/** Directed communication originating from one Client Endpoint. */
export interface ClientTraffic<
  Events extends object = {},
  To = Endpoint | null,
  AskTo = ServerEndpoint | null,
  Fallback = unknown
> extends EndpointTraffic<Events, To, AskTo, Fallback> {}

/** The Client Endpoint of a Process. */
export abstract class ClientEndpoint<Events extends object = {}, Fallback = unknown> extends Endpoint<Events, Fallback> {
  protected constructor() {
    super()
  }
  /** Directed communication originating from this Client Endpoint. */
  public abstract override readonly traffic: ClientTraffic<Events, Endpoint | null, ServerEndpoint | null, Fallback>

  /** Presentation capability permanently owned by this Client Endpoint handle. */
  public abstract readonly window: Window

  /** Starts a fresh Client Endpoint and Window using optional Process-local overrides. */
  public abstract override start(launch?: ClientLaunch): Promise<void>

}
