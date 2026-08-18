import type { Publishable } from "./publishable.js"
import type { Timeoutable } from "./timeout.js"

/** An immutable Askable view using one caller-selected deadline. */
export interface TimedAskable {
  /** Sends a question with an `undefined` payload and waits within the selected deadline. */
  ask<Answer = unknown>(event: string): Promise<Answer>

  /** Sends one question and waits within the selected deadline. */
  ask<Answer = unknown, Payload = unknown>(event: string, payload: Payload): Promise<Answer>
}

/** A publishing target that can also receive a question and return an answer. */
export interface Askable<Events extends object = {}, Fallback = unknown>
  extends Publishable<Events, Fallback>, Timeoutable<TimedAskable> {
  /**
   * Sends one question payload to this target and waits for its answer.
   *
   * The SDK uses a ten-second deadline by default. It sends the question only
   * after the current Server incarnation becomes ready. The operation rejects
   * immediately when that Server is absent, and also rejects if the incarnation
   * stops before readiness or before answering. One SDK deadline covers both
   * readiness and the answer. The boundary cannot infer whether an answerer
   * exists, so a ready unanswered question waits for that deadline.
   */
  ask<Answer = unknown>(event: string): Promise<Answer>
  ask<Answer = unknown, Payload = unknown>(event: string, payload: Payload): Promise<Answer>

  /** Returns an immutable view whose `ask()` uses this deadline in milliseconds. */
  timeout(milliseconds: number): TimedAskable
}
