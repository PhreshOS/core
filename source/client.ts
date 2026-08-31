import { Endpoint, type EndpointTraffic } from "./endpoint.js"
import type { ClientLaunch } from "./launch.js"
import type { Server } from "./server.js"
import type { Window } from "./window.js"

/** Directed communication originating from one Client. */
export interface ClientTraffic<
  Events extends object = {},
  To = Endpoint,
  AskTo = Server
> extends EndpointTraffic<Events, To, AskTo> {}

/** The client Endpoint of a Process. */
export class Client<Events extends object = {}> extends Endpoint<Events> {
  protected constructor() {
    super()
  }
}

export interface Client<Events extends object = {}> {
  /** Directed communication originating from this Client. */
  readonly traffic: ClientTraffic<Events>

  /** Presentation capability permanently owned by this Client handle. */
  readonly window: Window

  /** Starts a fresh Client and Window using optional Process-local overrides. */
  start(launch?: ClientLaunch): Promise<void>

}
