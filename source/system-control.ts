import type { Launch, Position, Size } from "./launch.js"

export type SystemControlCapabilityName = "program" | "process" | "endpoint" | "window"
export type SystemControlOperationMode = "read" | "write" | "request" | "wait"
export type SystemControlEndpoint = "server" | "client"

export type SystemControlRequest =
  | Readonly<{ capability: "program", operation: "list", input: ProgramListInput }>
  | Readonly<{ capability: "program", operation: "inspect", input: ProgramInput }>
  | Readonly<{ capability: "program", operation: "agent", input: ProgramInput }>
  | Readonly<{ capability: "program", operation: "wait", input: ProgramWaitInput }>
  | Readonly<{ capability: "process", operation: "list", input: ProcessListInput }>
  | Readonly<{ capability: "process", operation: "inspect", input: ProcessInput }>
  | Readonly<{ capability: "process", operation: "exit", input: ProcessInput }>
  | Readonly<{ capability: "process", operation: "create", input: ProcessCreateInput }>
  | Readonly<{ capability: "process", operation: "findOrCreate", input: ProcessFindOrCreateInput }>
  | Readonly<{ capability: "process", operation: "wait", input: ProcessWaitInput }>
  | Readonly<{ capability: "endpoint", operation: "inspect", input: EndpointInput }>
  | Readonly<{ capability: "endpoint", operation: "start", input: EndpointInput }>
  | Readonly<{ capability: "endpoint", operation: "stop", input: EndpointInput }>
  | Readonly<{ capability: "endpoint", operation: "waitReady", input: EndpointWaitReadyInput }>
  | Readonly<{ capability: "endpoint", operation: "ask", input: EndpointAskInput }>
  | Readonly<{ capability: "endpoint", operation: "publish", input: EndpointPublishInput }>
  | Readonly<{ capability: "endpoint", operation: "wait", input: EndpointWaitInput }>
  | Readonly<{ capability: "window", operation: "inspect", input: WindowInput }>
  | Readonly<{ capability: "window", operation: "raise", input: WindowInput }>
  | Readonly<{ capability: "window", operation: "move", input: WindowInput & { position: Position } }>
  | Readonly<{ capability: "window", operation: "resize", input: WindowInput & { size: Size } }>
  | Readonly<{ capability: "window", operation: "setGeometry", input: WindowInput & { position: Position, size: Size } }>
  | Readonly<{ capability: "window", operation: "minimize", input: WindowInput & { minimized?: boolean } }>
  | Readonly<{ capability: "window", operation: "changeTitle", input: WindowInput & { title: string } }>
  | Readonly<{ capability: "window", operation: "wait", input: WindowWaitInput }>

export interface ProgramListInput {
  installedOnly?: boolean
  search?: string
  limit?: number
}

export interface ProgramInput { program: string }

export interface ProgramWaitInput {
  event: "create" | "forget" | "install" | "uninstall"
  program?: string
  timeout?: number
}

export interface ProcessListInput {
  program?: string
  search?: string
  limit?: number
}

export interface ProcessInput {
  process: string
  program?: string
}

export interface ProcessCreateInput {
  program: string
  launch?: Launch
}

export interface ProcessFindOrCreateInput {
  program: string
  launch: Launch & Readonly<{ name: string }>
}

export interface ProcessWaitInput {
  event: "endpointStart" | "endpointStop" | "create" | "exit"
  process?: string
  program?: string
  timeout?: number
}

export interface EndpointInput extends ProcessInput {
  endpoint: SystemControlEndpoint
}

export interface EndpointWaitReadyInput extends ProcessInput {
  endpoint: "server"
  timeout?: number
}

export interface EndpointAskInput extends ProcessInput {
  endpoint: "server"
  event: string
  payload?: unknown
  timeout?: number
}

export interface EndpointPublishInput extends EndpointInput {
  event: string
  payload?: unknown
}

export interface EndpointWaitInput extends EndpointInput {
  event: string
  timeout?: number
}

export interface WindowInput extends ProcessInput {}

export interface WindowWaitInput extends WindowInput {
  event: "move" | "resize" | "geometry" | "minimize" | "changeTitle" | "front"
  timeout?: number
}

export interface SystemControlClient {
  execute(request: SystemControlRequest, signal?: AbortSignal): Promise<unknown>
}

/** One capability's operation inputs, adapted to the common agent-tool shape. */
export type SystemControlToolInput<Capability extends SystemControlCapabilityName> =
  SystemControlRequest extends infer Request
    ? Request extends Readonly<{ capability: Capability, operation: infer Operation extends string, input: infer Input }>
      ? Input & Readonly<{ action: Operation }>
      : never
    : never

export type SystemControlSchema = Readonly<{
  type?: string | readonly string[]
  description?: string
  properties?: Readonly<Record<string, SystemControlSchema>>
  required?: readonly string[]
  additionalProperties?: boolean | SystemControlSchema
  items?: SystemControlSchema
  enum?: readonly unknown[]
  const?: unknown
  oneOf?: readonly SystemControlSchema[]
  minimum?: number
  maximum?: number
  minLength?: number
  default?: unknown
}>

export type SystemControlOperation = Readonly<{
  description: string
  mode: SystemControlOperationMode
  input: SystemControlSchema
  output: SystemControlSchema
  examples: readonly Readonly<Record<string, unknown>>[]
}>

export type SystemControlCapability = Readonly<{
  description: string
  guidance: readonly string[]
  operations: Readonly<Record<string, SystemControlOperation>>
}>

const text = (description: string): SystemControlSchema => schema({ type: "string", minLength: 1, description })
const integer = (description: string, minimum = 1, maximum?: number): SystemControlSchema => schema({
  type: "integer",
  minimum,
  ...(maximum === undefined ? {} : { maximum }),
  description
})
const boolean = (description: string, defaultValue?: boolean): SystemControlSchema => schema({
  type: "boolean",
  ...(defaultValue === undefined ? {} : { default: defaultValue }),
  description
})
const enumeration = (values: readonly string[], description: string): SystemControlSchema => schema({ type: "string", enum: values, description })
const object = (
  properties: Readonly<Record<string, SystemControlSchema>>,
  required: readonly string[] = []
): SystemControlSchema => schema({ type: "object", properties, required, additionalProperties: false })
const any: SystemControlSchema = schema({})

const program = text("Program identity.")
const process = text("Runtime Process identity, or Program-local Process name when program is supplied.")
const timeout = integer("Maximum wait in milliseconds. Defaults to 10000.")
const endpoint = enumeration(["server", "client"], "Endpoint kind.")
const server = schema({ type: "string", const: "server", description: "The Server Endpoint." })
const event = text("Event name.")
const search = text("Case-insensitive search text.")
const limit = integer("Maximum returned items. Defaults to 30 and never exceeds 100.", 1, 100)
const value: SystemControlSchema = schema({
  oneOf: [{ type: "number" }, { type: "string", minLength: 1 }],
  description: "Absolute pixels as a number, or a workspace-relative expression such as 50% or 1/2."
})
const position = object({ x: value, y: value }, ["x", "y"])
const size = object({ width: value, height: value }, ["width", "height"])
const processCoordinates = { process, program }
const endpointCoordinates = { ...processCoordinates, endpoint }
const clientLaunch = object({
  title: { type: "string" },
  size,
  position,
  layer: enumeration(["window", "under", "over"], "Window layer."),
  location: { type: "string" },
  minimize: { type: "boolean" }
})
const launch = object({
  name: text("Stable Program-local Process name."),
  server: { type: "boolean" },
  client: { oneOf: [{ type: "boolean" }, clientLaunch] },
  options: { type: "object", additionalProperties: { type: "string" } }
})

const programSummary = object({
  identity: { type: "string" },
  name: { type: "string" },
  version: { type: ["string", "null"] },
  description: { type: ["string", "null"] },
  installed: { type: "boolean" },
  hasAgent: { type: "boolean" },
  server: { type: ["object", "null"] },
  client: { type: ["object", "null"] }
})
const processSummary = object({
  identity: { type: "string" },
  name: { type: ["string", "null"] },
  program: { type: "string" },
  startedAt: { type: "string" },
  server: { type: "object" },
  client: { type: "object" }
})
const endpointSummary = object({
  process: { type: "string" },
  program: { type: "string" },
  endpoint: enumeration(["server", "client"], "Endpoint kind."),
  declared: { type: "boolean" },
  running: { type: "boolean" }
})
const windowSummary = object({
  process: { type: "string" },
  title: { type: "string" },
  position,
  size,
  minimized: { type: "boolean" },
  front: { type: "boolean" },
  layer: { type: "string" },
  location: { type: "string" }
})
const page = (items: SystemControlSchema): SystemControlSchema => object({
  data: { type: "array", items },
  total: { type: "integer" },
  truncated: { type: "boolean" }
})
const waited = object({ scope: { type: "string" }, event: { type: "string" }, payload: any })

function operation(
  mode: SystemControlOperationMode,
  description: string,
  input: SystemControlSchema,
  output: SystemControlSchema,
  examples: readonly Readonly<Record<string, unknown>>[]
): SystemControlOperation {
  return Object.freeze({ mode, description, input: schema(input), output: schema(output), examples: Object.freeze(examples) })
}

function schema(value: SystemControlSchema): SystemControlSchema {
  if (value.properties) {
    for (const child of Object.values(value.properties)) schema(child)
    Object.freeze(value.properties)
  }
  if (typeof value.additionalProperties === "object") schema(value.additionalProperties)
  if (value.items) schema(value.items)
  if (value.oneOf) {
    for (const child of value.oneOf) schema(child)
    Object.freeze(value.oneOf)
  }
  if (value.required) Object.freeze(value.required)
  if (value.enum) Object.freeze(value.enum)
  return Object.freeze(value)
}

/**
 * Authoritative, transport-neutral System-control vocabulary.
 *
 * System Core owns its behavior. Server SDK handles, local CLI commands, and
 * agent tools derive their public language and documentation from this catalog.
 */
export const systemControl = Object.freeze({
  program: Object.freeze({
    description: "Discover PhreshOS Programs and their Program-specific agent documentation.",
    guidance: Object.freeze([
      "Inspect a Program before operating it. When hasAgent is true, read agent documentation before choosing launches, events, payloads, or cleanup.",
      "Program agent documentation contains only Program-owned policy. Generic Process and Endpoint mechanics remain in this System contract.",
      "An omitted Endpoint selection in a Process launch may inherit the Program default; omission is not equivalent to false."
    ]),
    operations: Object.freeze({
      list: operation("read", "List Programs with bounded filtering.", object({
        installedOnly: boolean("Return only installed Programs.", true), search, limit
      }), page(programSummary), [{}]),
      inspect: operation("read", "Read one Program declaration and installed state.", object({ program }, ["program"]), programSummary, [{ program: "theme" }]),
      agent: operation("read", "Read the Program's own agent operating policy. Fails when none is declared.", object({ program }, ["program"]), object({ program: { type: "string" }, content: { type: "string" } }), [{ program: "flambo" }]),
      wait: operation("wait", "Wait for one Program registry event, optionally scoped to one Program for forget or uninstall.", object({
        event: enumeration(["create", "forget", "install", "uninstall"], "Program lifecycle event."), program, timeout
      }, ["event"]), waited, [{ event: "install", timeout: 30000 }])
    })
  }),
  process: Object.freeze({
    description: "Discover and control live executions of Programs.",
    guidance: Object.freeze([
      "A Process may contain a Server Endpoint, a Client Endpoint, or both; its Program defines the valid topology.",
      "Before create, findOrCreate, or exit, inspect the Program and read its agent documentation when available.",
      "Use explicit server and client selections whenever topology matters. A Server-only launch sets server true and client false; a Client-only launch sets server false and selects client.",
      "findOrCreate requires a stable name. An existing Process with a different resolved launch is an error and is never silently reshaped."
    ]),
    operations: Object.freeze({
      list: operation("read", "List live Processes with bounded filtering.", object({ program, search, limit }), page(processSummary), [{}]),
      inspect: operation("read", "Read one live Process and its Endpoint state.", object(processCoordinates, ["process"]), processSummary, [{ process: "process-identity" }]),
      create: operation("write", "Create a Process. Omitted Endpoint selections inherit Program defaults.", object({ program, launch }, ["program"]), processSummary, [{ program: "theme" }]),
      findOrCreate: operation("write", "Atomically find the named Process or create it with the same resolved launch.", object({ program, launch }, ["program", "launch"]), processSummary, [{ program: "lemo", launch: { name: "lemo", server: true, client: false } }]),
      exit: operation("write", "Exit one Process and all of its live Endpoints.", object(processCoordinates, ["process"]), processSummary, [{ process: "process-identity" }]),
      wait: operation("wait", "Wait for one Process lifecycle event at Host, Program, or Process scope. An individual Process does not emit create.", object({
        event: enumeration(["endpointStart", "endpointStop", "create", "exit"], "Process lifecycle event."),
        process,
        program,
        timeout
      }, ["event"]), waited, [{ event: "create", program: "theme" }])
    })
  }),
  endpoint: Object.freeze({
    description: "Inspect, control, and communicate with Server and Client Endpoints of live Processes.",
    guidance: Object.freeze([
      "Inspect the owning Program and read its agent documentation before using Program-specific events or lifecycle policy.",
      "Program documentation defines event names, payloads, results, and operating modes; this generic contract does not.",
      "An ask payload passes through unchanged. A successful response means only what the Program contract says it means.",
      "When a Program request changes authoritative state, its answer may be only an acknowledgment; observe the Program's documented publication for the resulting state."
    ]),
    operations: Object.freeze({
      inspect: operation("read", "Read whether one Endpoint is declared and running.", object(endpointCoordinates, ["process", "endpoint"]), endpointSummary, [{ process: "process-identity", endpoint: "server" }]),
      start: operation("write", "Start a fresh Endpoint incarnation without implicitly changing the other Endpoint.", object(endpointCoordinates, ["process", "endpoint"]), endpointSummary, [{ process: "process-identity", endpoint: "client" }]),
      stop: operation("write", "Stop one Endpoint. The final live Endpoint cannot be stopped; exit the Process instead.", object(endpointCoordinates, ["process", "endpoint"]), endpointSummary, [{ process: "process-identity", endpoint: "client" }]),
      waitReady: operation("wait", "Wait until the current or next Server incarnation reports readiness.", object({ ...processCoordinates, endpoint: server, timeout }, ["process", "endpoint"]), endpointSummary, [{ process: "process-identity", endpoint: "server", timeout: 30000 }]),
      ask: operation("request", "Ask a Server event and return its answer. Read Program agent documentation first for event and payload policy.", object({ ...processCoordinates, endpoint: server, event, payload: any, timeout }, ["process", "endpoint", "event"]), any, [{ process: "process-identity", endpoint: "server", event: "metrics" }]),
      publish: operation("write", "Publish one event to a live Server or Client Endpoint without waiting for an answer.", object({ ...endpointCoordinates, event, payload: any }, ["process", "endpoint", "event"]), endpointSummary, [{ process: "process-identity", endpoint: "client", event: "refresh" }]),
      wait: operation("wait", "Wait for the next destinationless event emitted by one live Endpoint.", object({ ...endpointCoordinates, event, timeout }, ["process", "endpoint", "event"]), waited, [{ process: "process-identity", endpoint: "server", event: "change" }])
    })
  }),
  window: Object.freeze({
    description: "Inspect and control the authoritative Window of a live Client Endpoint.",
    guidance: Object.freeze([
      "Discover the Window through its Process; there is intentionally no Window list operation.",
      "Geometry numbers are absolute pixels. Use strings such as 50%, 1/2, or 50% - 8 for workspace-relative geometry.",
      "setGeometry changes position and size atomically.",
      "Window state is authoritative System state. Local Surface presentation is not part of this capability."
    ]),
    operations: Object.freeze({
      inspect: operation("read", "Read the complete current Window state.", object(processCoordinates, ["process"]), windowSummary, [{ process: "process-identity" }]),
      move: operation("write", "Change Window position.", object({ ...processCoordinates, position }, ["process", "position"]), windowSummary, [{ process: "process-identity", position: { x: 0, y: 0 } }]),
      resize: operation("write", "Change Window size.", object({ ...processCoordinates, size }, ["process", "size"]), windowSummary, [{ process: "process-identity", size: { width: "50%", height: "100%" } }]),
      setGeometry: operation("write", "Atomically change Window position and size.", object({ ...processCoordinates, position, size }, ["process", "position", "size"]), windowSummary, [{ process: "process-identity", position: { x: 0, y: 0 }, size: { width: "50%", height: "100%" } }]),
      minimize: operation("write", "Set Window visibility without changing its order.", object({ ...processCoordinates, minimized: boolean("Whether the Window is minimized.", true) }, ["process"]), windowSummary, [{ process: "process-identity", minimized: true }]),
      changeTitle: operation("write", "Change the human-readable Window title.", object({ ...processCoordinates, title: { type: "string" } }, ["process", "title"]), windowSummary, [{ process: "process-identity", title: "Browser" }]),
      raise: operation("write", "Raise the Window within its own layer without changing visibility or keyboard focus.", object(processCoordinates, ["process"]), windowSummary, [{ process: "process-identity" }]),
      wait: operation("wait", "Wait for one authoritative Window change.", object({
        ...processCoordinates,
        event: enumeration(["move", "resize", "geometry", "minimize", "changeTitle", "front"], "Window event."),
        timeout
      }, ["process", "event"]), waited, [{ process: "process-identity", event: "geometry" }])
    })
  })
}) satisfies Readonly<Record<SystemControlCapabilityName, SystemControlCapability>>

/** Derives one agent-tool schema without redefining any operation input. */
export function systemControlToolSchema(capability: SystemControlCapabilityName): SystemControlSchema {
  const operations = systemControl[capability].operations
  return schema({
    oneOf: Object.entries(operations).map(([name, definition]) => ({
      ...definition.input,
      properties: Object.freeze({ action: Object.freeze({ type: "string", const: name }), ...definition.input.properties }),
      required: Object.freeze(["action", ...(definition.input.required ?? [])])
    }))
  })
}

export function systemControlOperation(capability: string, operationName: string): SystemControlOperation | null {
  if (!Object.hasOwn(systemControl, capability)) return null
  const operations = systemControl[capability as SystemControlCapabilityName].operations as Readonly<Record<string, SystemControlOperation>>
  return Object.hasOwn(operations, operationName) ? operations[operationName]! : null
}

/** Semantic constraints that JSON Schema cannot express without obscuring the operation shape. */
export function systemControlInputIssue(capability: string, operation: string, input: unknown): string | null {
  if (operation !== "wait" || typeof input !== "object" || input === null) return null
  const request = input as Record<string, unknown>
  if (capability === "program" && request.program && request.event !== "forget" && request.event !== "uninstall") {
    return "An individual Program emits only forget and uninstall"
  }
  if (capability === "process" && request.process && request.event === "create") {
    return "An individual Process does not emit create"
  }
  return null
}
