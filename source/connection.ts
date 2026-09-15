import type { Session } from "./session.js"
import { subscribableDefinition, type Subscribable, type SubscribableDefinition } from "./subscribable.js"

/** Observable lifecycle changes belonging to one live browser connection. */
export type ConnectionEvents = {
  /** The Session attached to this Connection changed. */
  sessionChange: Session | null

  /** The Client or network ended the underlying connection. */
  disconnect: undefined
}

/** One live browser connection to the System. */
export abstract class Connection implements Subscribable<ConnectionEvents, never> {
  protected constructor() {}

  public declare readonly [subscribableDefinition]?: SubscribableDefinition<ConnectionEvents, never>

  public abstract readonly subscribe: Subscribable<ConnectionEvents, never>["subscribe"]
  public abstract readonly wait: Subscribable<ConnectionEvents, never>["wait"]
  public abstract readonly events: Subscribable<ConnectionEvents, never>["events"]

  /** Stable, non-secret identity of this Connection. */
  public abstract readonly identity: string

  /** Returns whether the underlying connection still exists. */
  public abstract connected(): Promise<boolean>

  /** Returns the Session currently attached to this Connection. */
  public abstract session(): Promise<Session | null>

  /** Creates and attaches a new Session. Rejects when already signed in. */
  public abstract signIn(): Promise<Session>
}
