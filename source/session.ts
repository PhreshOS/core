import type { Connection } from "./connection.js"
import { subscribableDefinition, type Subscribable, type SubscribableDefinition } from "./subscribable.js"

/** Why one Session permanently left the System registry. */
export type SessionEndReason = "signedOut" | "expired"

/** Observable lifecycle changes belonging to one Session. */
export type SessionEvents = {
  /** One live Connection became authorized by this Session. */
  connectionAttach: Connection

  /** One live Connection ceased to be authorized by this Session. */
  connectionDetach: Connection

  /** The Session permanently ended. */
  end: Readonly<{ reason: SessionEndReason }>
}

/** One persistent authentication grant known by the System. */
export abstract class Session implements Subscribable<SessionEvents, never> {
  protected constructor() {}

  public declare readonly [subscribableDefinition]?: SubscribableDefinition<SessionEvents, never>

  public abstract readonly subscribe: Subscribable<SessionEvents, never>["subscribe"]
  public abstract readonly wait: Subscribable<SessionEvents, never>["wait"]
  public abstract readonly events: Subscribable<SessionEvents, never>["events"]

  /** Stable, non-secret identity of this Session. */
  public abstract readonly identity: string

  /** Returns whether this Session can still authorize a Connection. */
  public abstract valid(): Promise<boolean>

  /** Returns every live Connection currently attached to this Session. */
  public abstract connections(): Promise<Connection[]>

  /** Explicitly ends this Session and detaches every Connection using it. */
  public abstract signOut(): Promise<void>
}
