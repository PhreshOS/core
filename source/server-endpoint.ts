import type { Askable } from "./askable.js"
import { Endpoint, type EndpointMetadata, type EndpointTraffic } from "./endpoint.js"
import type { ServerLaunch } from "./launch.js"
import type { Cleanup, EventOptions } from "./subscribable.js"

/** The result reported by an Endpoint answer. */
export type AnswerOutcome<Result = unknown> =
  | Readonly<{
    success: true
    result: Result
  }>
  | Readonly<{
    success: false
    error: string
  }>

/** One answer sent by this Server Endpoint to the Endpoint that asked. */
export type AnswerMessage<Result = unknown> = Readonly<{
  /** Who asked, or `null` for a party outside every Program. */
  to: EndpointMetadata | null

  /** Success or failure returned by the answerer. */
  outcome: AnswerOutcome<Result>
}>

/** One observed answer sent by this Server Endpoint. */
export type AnswerCapture<Result = unknown> = Readonly<{
  /** Event originally addressed by the question. */
  event: string

  /** Correlation identity shared with the original question. */
  questionId: string

  /** Answer destination and outcome. */
  message: AnswerMessage<Result>
}>

/** A callback subscribed to answers sent by this Server Endpoint. */
export type AnswerSubscriber<Result = unknown> = (capture: AnswerCapture<Result>) => unknown

/** Directed communication originating from one Server Endpoint, including its answers. */
export interface ServerTraffic<Events extends object = {}, Fallback = unknown> extends EndpointTraffic<Events, Fallback> {
  /** Subscribes to answers originating from this Server Endpoint. */
  subscribeAnswers<Result = unknown>(subscriber: AnswerSubscriber<Result>): Cleanup

  /** Iterates answers originating from this Server Endpoint. */
  answers<Result = unknown>(options?: EventOptions): AsyncIterableIterator<AnswerCapture<Result>>
}

/** The Server Endpoint of a Process. */
export abstract class ServerEndpoint<Events extends object = {}, Fallback = unknown> extends Endpoint<Events, Fallback> {
  protected constructor() {
    super()
  }
  /** Directed communication originating from this Server Endpoint. */
  public abstract override readonly traffic: ServerTraffic<Events, Fallback>

  /** Ensures a Server execution context is running, using these settings only when one must be created. */
  public abstract override start(launch?: ServerLaunch): Promise<void>

  public abstract ask<Answer = unknown>(event: string): Promise<Answer>
  public abstract ask<Answer = unknown, Payload = unknown>(event: string, payload: Payload): Promise<Answer>
  public abstract timeout(milliseconds: number): ReturnType<Askable["timeout"]>

}
