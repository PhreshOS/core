import type { ClientLaunch, Launch, Position, ServerLaunch, Size } from "./launch.js"

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
  | Readonly<{ capability: "endpoint", operation: "start", input: EndpointStartInput }>
  | Readonly<{ capability: "endpoint", operation: "stop", input: EndpointInput }>
  | Readonly<{ capability: "endpoint", operation: "waitReady", input: EndpointWaitReadyInput }>
  | Readonly<{ capability: "endpoint", operation: "waitLifecycle", input: EndpointWaitLifecycleInput }>
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
  offset?: number
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
  offset?: number
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
  event: "create" | "exit"
  process?: string
  program?: string
  timeout?: number
}

export interface EndpointInput extends ProcessInput {
  endpoint: SystemControlEndpoint
}

export type EndpointStartInput =
  | (ProcessInput & Readonly<{ endpoint: "server", launch?: ServerLaunch }>)
  | (ProcessInput & Readonly<{ endpoint: "client", launch?: ClientLaunch }>)

export interface EndpointWaitReadyInput extends ProcessInput {
  endpoint: SystemControlEndpoint
  timeout?: number
}

export interface EndpointWaitLifecycleInput extends EndpointInput {
  event: "start" | "stop"
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
  mode: SystemControlOperationMode
  input: SystemControlSchema
  output: SystemControlSchema
}>

export type SystemControlCapability = Readonly<{
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
const any: SystemControlSchema = schema({
  oneOf: [
    { type: "object" },
    { type: "array", items: {} },
    { type: "string" },
    { type: "number" },
    { type: "boolean" },
    { type: "null" }
  ]
})

const program = text("Program identity.")
const process = text("Runtime Process identity, or Program-local Process name when program is supplied.")
const timeout = integer("Maximum wait in milliseconds. Defaults to 10000.")
const endpoint = enumeration(["server", "client"], "Endpoint kind.")
const server = schema({ type: "string", const: "server", description: "The Server Endpoint." })
const client = schema({ type: "string", const: "client", description: "The Client Endpoint." })
const event = text("Event name.")
const search = text("Case-insensitive search text.")
const limit = integer("Maximum returned items. Defaults to 30 and never exceeds 100.", 1, 100)
const offset = integer("Number of matching items to skip. Defaults to 0.", 0)
const value: SystemControlSchema = schema({
  oneOf: [{ type: "number" }, { type: "string", minLength: 1 }],
  description: "Absolute pixels as a number, or a workspace-relative expression such as 50% or 1/2."
})
const position = object({ x: value, y: value }, ["x", "y"])
const size = object({ width: value, height: value }, ["width", "height"])
const processCoordinates = { process, program }
const endpointCoordinates = { ...processCoordinates, endpoint }
const clientLaunch = object({
  service: { type: "boolean", description: "Make this Client incarnation addressable through system.service()." },
  title: { type: "string" },
  size,
  position,
  layer: enumeration(["window", "under", "over"], "Window layer."),
  location: { type: "string" },
  minimize: { type: "boolean" }
})
const serverLaunch = object({
  service: { type: "boolean", description: "Make this Server incarnation addressable through system.service()." }
})
const launch = object({
  name: text("Stable Program-local Process name."),
  server: { oneOf: [{ type: "boolean" }, serverLaunch] },
  client: { oneOf: [{ type: "boolean" }, clientLaunch] },
  options: { type: "object", additionalProperties: { type: "string" } }
})
const endpointStart = schema({
  oneOf: [
    object({ ...processCoordinates, endpoint: server, launch: serverLaunch }, ["process", "endpoint"]),
    object({ ...processCoordinates, endpoint: client, launch: clientLaunch }, ["process", "endpoint"])
  ]
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
  parent: { type: ["string", "null"] },
  options: { type: "object", additionalProperties: { type: "string" } },
  startedAt: { type: "string" },
  server: { type: "object" },
  client: { type: "object" }
})
const endpointSummary = object({
  process: { type: "string" },
  program: { type: "string" },
  endpoint: enumeration(["server", "client"], "Endpoint kind."),
  declared: { type: "boolean" },
  running: { type: "boolean" },
  service: { type: "boolean" }
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
  input: SystemControlSchema,
  output: SystemControlSchema
): SystemControlOperation {
  return Object.freeze({ mode, input: schema(input), output: schema(output) })
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

/** Neutral serialized operation shapes used by trusted System adapters. */
export const systemControl = Object.freeze({
  program: Object.freeze({
    operations: Object.freeze({
      list: operation("read", object({
        installedOnly: boolean("Return only installed Programs.", true), search, limit, offset
      }), page(programSummary)),
      inspect: operation("read", object({ program }, ["program"]), programSummary),
      agent: operation("read", object({ program }, ["program"]), object({ program: { type: "string" }, content: { type: "string" } })),
      wait: operation("wait", object({
        event: enumeration(["create", "forget", "install", "uninstall"], "Program lifecycle event."), program, timeout
      }, ["event"]), waited)
    })
  }),
  process: Object.freeze({
    operations: Object.freeze({
      list: operation("read", object({ program, search, limit, offset }), page(processSummary)),
      inspect: operation("read", object(processCoordinates, ["process"]), processSummary),
      create: operation("write", object({ program, launch }, ["program"]), processSummary),
      findOrCreate: operation("write", object({ program, launch }, ["program", "launch"]), processSummary),
      exit: operation("write", object(processCoordinates, ["process"]), processSummary),
      wait: operation("wait", object({
        event: enumeration(["create", "exit"], "Process lifecycle event."),
        process,
        program,
        timeout
      }, ["event"]), waited)
    })
  }),
  endpoint: Object.freeze({
    operations: Object.freeze({
      inspect: operation("read", object(endpointCoordinates, ["process", "endpoint"]), endpointSummary),
      start: operation("write", endpointStart, endpointSummary),
      stop: operation("write", object(endpointCoordinates, ["process", "endpoint"]), endpointSummary),
      waitReady: operation("wait", object({ ...endpointCoordinates, timeout }, ["process", "endpoint"]), endpointSummary),
      waitLifecycle: operation("wait", object({
        ...endpointCoordinates,
        event: enumeration(["start", "stop"], "Endpoint lifecycle event."),
        timeout
      }, ["process", "endpoint", "event"]), waited),
      ask: operation("request", object({ ...processCoordinates, endpoint: server, event, payload: any, timeout }, ["process", "endpoint", "event"]), any),
      publish: operation("write", object({ ...endpointCoordinates, event, payload: any }, ["process", "endpoint", "event"]), endpointSummary),
      wait: operation("wait", object({ ...endpointCoordinates, event, timeout }, ["process", "endpoint", "event"]), waited)
    })
  }),
  window: Object.freeze({
    operations: Object.freeze({
      inspect: operation("read", object(processCoordinates, ["process"]), windowSummary),
      move: operation("write", object({ ...processCoordinates, position }, ["process", "position"]), windowSummary),
      resize: operation("write", object({ ...processCoordinates, size }, ["process", "size"]), windowSummary),
      setGeometry: operation("write", object({ ...processCoordinates, position, size }, ["process", "position", "size"]), windowSummary),
      minimize: operation("write", object({ ...processCoordinates, minimized: boolean("Whether the Window is minimized.", true) }, ["process"]), windowSummary),
      changeTitle: operation("write", object({ ...processCoordinates, title: { type: "string" } }, ["process", "title"]), windowSummary),
      raise: operation("write", object(processCoordinates, ["process"]), windowSummary),
      wait: operation("wait", object({
        ...processCoordinates,
        event: enumeration(["move", "resize", "geometry", "minimize", "changeTitle", "front"], "Window event."),
        timeout
      }, ["process", "event"]), waited)
    })
  })
}) satisfies Readonly<Record<SystemControlCapabilityName, SystemControlCapability>>

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
