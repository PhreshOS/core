const pattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** Whether a value is a canonical Program identity. */
export function isProgramIdentity(value: unknown): value is string {
  return typeof value === "string" && pattern.test(value)
}
