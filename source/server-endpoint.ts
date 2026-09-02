import type { Askable } from "./askable.js"
import { Endpoint, type EndpointTraffic } from "./endpoint.js"
import type { ServerLaunch } from "./launch.js"
import type { Outcome } from "./outcome.js"
import type { Cleanup, EventOptions } from "./subscribable.js"

/** One answer sent by this Server Endpoint to the Endpoint that asked. */
export type AnswerMessage<Result = unknown, To = Endpoint | null> = Readonly<{
  /** Destination Endpoint, or `null` when its identity is outside this boundary. */
  to: To

  /** Transport-neutral success or failure returned by the answerer. */
  outcome: Outcome<Result>
}>

/** One observed answer sent by this Server Endpoint. */
export type AnswerCapture<Result = unknown, To = Endpoint | null> = Readonly<{
  /** Event originally addressed by the question. */
  event: string

  /** Correlation identity shared with the original question. */
  questionId: string

  /** Answer destination and outcome. */
  message: AnswerMessage<Result, To>
}>

/** A callback subscribed to answers sent by this Server Endpoint. */
export type AnswerSubscriber<Result = unknown, To = Endpoint | null> = (capture: AnswerCapture<Result, To>) => unknown

/** Directed communication originating from one Server Endpoint, including its answers. */
export interface ServerTraffic<
  Events extends object = {},
  To = Endpoint | null,
  AskTo = ServerEndpoint | null,
  Fallback = unknown
> extends EndpointTraffic<Events, To, AskTo, Fallback> {
  /** Subscribes to answers originating from this Server Endpoint. */
  subscribeAnswers<Result = unknown>(subscriber: AnswerSubscriber<Result, To>): Cleanup

  /** Iterates answers originating from this Server Endpoint. */
  answers<Result = unknown>(options?: EventOptions): AsyncIterableIterator<AnswerCapture<Result, To>>
}

/** The Server Endpoint of a Process. */
export class ServerEndpoint<Events extends object = {}, Fallback = unknown> extends Endpoint<Events, Fallback> {
  protected constructor() {
    super()
  }
}

export interface ServerEndpoint<Events extends object = {}, Fallback = unknown> extends Askable {
  /** Directed communication originating from this Server Endpoint. */
  readonly traffic: ServerTraffic<Events, Endpoint | null, ServerEndpoint | null, Fallback>

  /** Starts a fresh Server Endpoint incarnation using optional Process-local settings. */
  start(launch?: ServerLaunch): Promise<void>

}
