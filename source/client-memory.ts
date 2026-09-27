import type { JsonValue } from "./content.js"
import type { Cleanup } from "./subscribable.js"

/** Small shared state belonging to one running Client Endpoint. */
export interface ClientMemory {
  /** Reads one value. An absent key returns `undefined`. */
  get<Value extends JsonValue = JsonValue>(key: string): Promise<Value | undefined>

  /** Writes one JSON value; the last write to this key wins. */
  set<Value extends JsonValue>(key: string, value: Value): Promise<void>

  /** Applies a pure updater atomically. The updater may run again after a concurrent write. */
  update<Value extends JsonValue>(key: string, updater: (current: Value | undefined) => Value): Promise<Value>

  /** Removes a key and reports whether it existed. */
  delete(key: string): Promise<boolean>

  /** Returns every key and value in this Client run. */
  entries(): Promise<readonly (readonly [string, JsonValue])[]>

  /** Observes the current value followed by changes to one key. */
  subscribe<Value extends JsonValue = JsonValue>(key: string, subscriber: (value: Value | undefined) => unknown): Cleanup
}
