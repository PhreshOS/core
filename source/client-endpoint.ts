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
export class ClientEndpoint<Events extends object = {}, Fallback = unknown> extends Endpoint<Events, Fallback> {
  protected constructor() {
    super()
  }
}

export interface ClientEndpoint<Events extends object = {}, Fallback = unknown> {
  /** Directed communication originating from this Client Endpoint. */
  readonly traffic: ClientTraffic<Events, Endpoint | null, ServerEndpoint | null, Fallback>

  /** Presentation capability permanently owned by this Client Endpoint handle. */
  readonly window: Window

  /** Starts a fresh Client Endpoint and Window using optional Process-local overrides. */
  start(launch?: ClientLaunch): Promise<void>

}
