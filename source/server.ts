import type { Askable } from "./askable.js"
import { Endpoint, type EndpointTraffic } from "./endpoint.js"
import type { Outcome } from "./outcome.js"
import type { Cleanup, EventOptions } from "./subscribable.js"
import type { ServerService } from "./service.js"

/** One answer sent by this Server to the Endpoint that asked. */
export type AnswerMessage<Result = unknown, To = Endpoint> = Readonly<{
  /** Destination Endpoint, or `null` when its identity is outside this boundary. */
  to: To

  /** Transport-neutral success or failure returned by the answerer. */
  outcome: Outcome<Result>
}>

/** One observed answer sent by this Server. */
export type AnswerCapture<Result = unknown, To = Endpoint> = Readonly<{
  /** Event originally addressed by the question. */
  event: string

  /** Correlation identity shared with the original question. */
  questionId: string

  /** Answer destination and outcome. */
  message: AnswerMessage<Result, To>
}>

/** A callback subscribed to answers sent by this Server. */
export type AnswerSubscriber<Result = unknown, To = Endpoint> = (capture: AnswerCapture<Result, To>) => unknown

/** Directed communication originating from one Server, including its answers. */
export interface ServerTraffic<
  Events extends object = {},
  To = Endpoint,
  AskTo = Server
> extends EndpointTraffic<Events, To, AskTo> {
  /** Subscribes to answers originating from this Server. */
  subscribeAnswers<Result = unknown>(subscriber: AnswerSubscriber<Result, To>): Cleanup

  /** Iterates answers originating from this Server. */
  answers<Result = unknown>(options?: EventOptions): AsyncIterableIterator<AnswerCapture<Result, To>>
}

/** The server Endpoint of a Process. */
export class Server<Events extends object = {}> extends Endpoint<Events> {
  protected constructor() {
    super()
  }
}

export interface Server<Events extends object = {}> extends Askable {
  /** Directed communication originating from this Server. */
  readonly traffic: ServerTraffic<Events>

  /**
   * Waits until a Server incarnation is ready.
   *
   * Temporary absence remains waitable when the Program declares a Server.
   * The SDK uses its ten-second deadline unless one is supplied.
   */
  waitReady(timeout?: number): Promise<void>

  /** Returns this Server's current complete service handle, or `null`. */
  service<ServiceEvents extends object = {}>(): Promise<ServerService<ServiceEvents> | null>

}
