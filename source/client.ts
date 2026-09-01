import { Endpoint, type EndpointTraffic } from "./endpoint.js"
import type { ClientLaunch } from "./launch.js"
import type { Server } from "./server.js"
import type { Window } from "./window.js"

/** Directed communication originating from one Client. */
export interface ClientTraffic<
  Events extends object = {},
  To = Endpoint | null,
  AskTo = Server | null,
  Fallback = never
> extends EndpointTraffic<Events, To, AskTo, Fallback> {}

/** The client Endpoint of a Process. */
export class Client<Events extends object = {}, Fallback = never> extends Endpoint<Events, Fallback> {
  protected constructor() {
    super()
  }
}

export interface Client<Events extends object = {}, Fallback = never> {
  /** Directed communication originating from this Client. */
  readonly traffic: ClientTraffic<Events, Endpoint | null, Server | null, Fallback>

  /** Presentation capability permanently owned by this Client handle. */
  readonly window: Window

  /** Starts a fresh Client and Window using optional Process-local overrides. */
  start(launch?: ClientLaunch): Promise<void>

}
