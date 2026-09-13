import { layers, type ClientLaunch, type Launch, type ServerLaunch } from "./launch.js"
import { isRelativeValue } from "./value.js"

/** Validate one Process launch without resolving Program or Desktop defaults. */
export function parseLaunch(value: unknown): Launch {
  const source = exact(value, ["name", "options", "server", "client"], "Launch")
  const result: { -readonly [Key in keyof Launch]: Launch[Key] } = {}

  if (source.name !== undefined) {
    if (typeof source.name !== "string" || !source.name.trim()) throw new Error("A Process name must be non-empty text")
    result.name = source.name
  }
  if (source.options !== undefined) {
    const options = object(source.options, "Launch options")
    result.options = Object.freeze(Object.fromEntries(Object.entries(options).map(([key, value]) => {
      if (typeof value !== "string") throw new Error("Launch options must be text values")
      return [key, value]
    })))
  }
  if (source.server !== undefined) result.server = typeof source.server === "boolean" ? source.server : server(source.server)
  if (source.client !== undefined) result.client = typeof source.client === "boolean" ? source.client : client(source.client)
  return Object.freeze(result)
}

function server(value: unknown): ServerLaunch {
  const source = exact(value, ["service"], "Server launch")
  return Object.freeze(source.service === undefined ? {} : { service: boolean(source.service, "service") })
}

function client(value: unknown): ClientLaunch {
  const source = exact(value, ["service", "title", "size", "position", "layer", "minimize", "maximize"], "Client launch")
  const result: { -readonly [Key in keyof ClientLaunch]: ClientLaunch[Key] } = {}
  for (const key of ["service", "minimize", "maximize"] as const) {
    if (source[key] !== undefined) result[key] = boolean(source[key], key)
  }
  if (source.title !== undefined) {
    if (typeof source.title !== "string") throw new Error("A Window title must be text")
    result.title = source.title
  }
  if (source.layer !== undefined) {
    if (source.layer !== "window" && source.layer !== "under" && source.layer !== "over") throw new Error(`A Window layer must be one of ${layers.join(", ")}`)
    result.layer = source.layer
  }
  if (source.size !== undefined) {
    const size = exact(source.size, ["width", "height"], "Window size")
    if (!isRelativeValue(size.width) || !isRelativeValue(size.height)) throw new Error("A Window size must contain finite pixels or relative expressions")
    result.size = Object.freeze({ width: size.width, height: size.height })
  }
  if (source.position !== undefined) {
    const position = exact(source.position, ["x", "y"], "Window position")
    if (!isRelativeValue(position.x) || !isRelativeValue(position.y)) throw new Error("A Window position must contain finite pixels or relative expressions")
    result.position = Object.freeze({ x: position.x, y: position.y })
  }
  return Object.freeze(result)
}

function boolean(value: unknown, name: string): boolean {
  if (typeof value !== "boolean") throw new Error(`A launch's ${name} must be true or false`)
  return value
}

function object(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${name} must be an object`)
  return value as Record<string, unknown>
}

function exact(value: unknown, keys: readonly string[], name: string) {
  const source = object(value, name)
  const unknown = Object.keys(source).find(key => !keys.includes(key))
  if (unknown) throw new Error(`${name} contains the unknown field "${unknown}"`)
  return source
}
