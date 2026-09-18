import { z } from "zod"
import { layers } from "../launch.js"
import type { JsonValue } from "../content.js"
import type { EndpointLifecycleEvents } from "../endpoint.js"
import type { ProcessEvents } from "../process.js"
import type { ProgramEvents } from "../program.js"
import type { SystemProcessEvents, SystemProgramEvents } from "../system.js"
import type { WindowEvents } from "../window.js"

const jsonValue: z.ZodType<JsonValue> = z.lazy(() => z.union([
  z.null(),
  z.boolean(),
  z.number(),
  z.string(),
  z.array(jsonValue),
  z.record(z.string(), jsonValue)
]))

const metric = z.union([
  z.number().describe("Pixels"),
  z.string().describe("Workspace-relative expression")
])

const position = z.looseObject({
  x: metric.describe("Horizontal position"),
  y: metric.describe("Vertical position")
}).describe("Window position")

const size = z.looseObject({
  width: metric.describe("Window width"),
  height: metric.describe("Window height")
}).describe("Window size")

const serverLaunch = z.looseObject({
  service: z.boolean().optional().describe("Whether the Server Endpoint is addressable as a Service")
}).describe("Server Endpoint launch settings")

const clientLaunch = z.looseObject({
  service: z.boolean().optional().describe("Whether the Client Endpoint is addressable as a Service"),
  title: z.string().optional().describe("Initial Window title"),
  header: z.boolean().optional().describe("Whether the standard Window header is shown"),
  size: size.optional().describe("Initial Window size"),
  position: position.optional().describe("Initial Window position"),
  layer: z.enum(layers).optional().describe("Desktop Window layer"),
  minimize: z.boolean().optional().describe("Whether the Window starts minimized"),
  maximize: z.boolean().optional().describe("Whether the Window starts maximized")
}).describe("Client Endpoint launch settings")

const launch = z.looseObject({
  name: z.string().optional().describe("Program-local Process name"),
  replace: z.boolean().optional().describe("Whether an existing named Process is replaced"),
  server: z.union([z.boolean(), serverLaunch]).optional().describe("Server Endpoint selection and settings"),
  client: z.union([z.boolean(), clientLaunch]).optional().describe("Client Endpoint selection and settings"),
  options: z.record(z.string(), z.string()).optional().describe("Immutable Process options")
}).describe("Process launch")

const namedLaunch = launch.extend({
  name: z.string().min(1).describe("Program-local Process name")
})

const endpointIdentity = {
  program: z.string().optional().describe("Owning Program identity when resolving a Process name"),
  process: z.string().describe("Process identity or Program-local name"),
  endpoint: z.enum(["server", "client"]).describe("Endpoint kind")
} as const

const windowIdentity = {
  program: endpointIdentity.program,
  process: endpointIdentity.process
} as const

const endpointState = z.looseObject({
  declared: z.boolean().describe("Whether the Program declares this Endpoint"),
  running: z.boolean().describe("Whether the Endpoint currently exists"),
  service: z.boolean().describe("Whether the Endpoint incarnation is a Service")
})

const programResult = z.looseObject({
  identity: z.string().describe("Stable Program identity"),
  assetId: z.string().describe("Public Program asset identity"),
  name: z.string().describe("Human-readable Program name"),
  version: z.string().nullable().describe("Declared Program version"),
  description: z.string().nullable().describe("Declared Program description"),
  installed: z.boolean().describe("Whether production files are installed"),
  hasAgent: z.boolean().describe("Whether the Program provides agent documentation"),
  server: z.looseObject({
    start: z.boolean(),
    service: z.boolean()
  }).nullable().describe("Resolved Server Endpoint declaration"),
  client: z.looseObject({
    start: z.boolean(),
    service: z.boolean(),
    title: z.string().nullable(),
    header: z.boolean().nullable(),
    size: size.nullable(),
    position: position.nullable(),
    layer: z.enum(layers).nullable(),
    minimize: z.boolean().nullable(),
    maximize: z.boolean().nullable()
  }).nullable().describe("Resolved Client Endpoint declaration")
}).describe("Program state")

const logRow = z.record(z.string(), jsonValue).describe("One row returned by the logs query")

const processResult = z.looseObject({
  identity: z.string().describe("Unique Process identity"),
  name: z.string().nullable().describe("Program-local Process name"),
  program: z.string().describe("Owning Program identity"),
  startedAt: z.string().describe("ISO start time"),
  server: endpointState.describe("Server Endpoint state"),
  client: endpointState.describe("Client Endpoint state")
}).describe("Process state")

const endpointResult = z.looseObject({
  process: z.string().describe("Owning Process identity"),
  program: z.string().describe("Owning Program identity"),
  endpoint: z.enum(["server", "client"]).describe("Endpoint kind"),
  declared: z.boolean().describe("Whether the Program declares this Endpoint"),
  running: z.boolean().describe("Whether the Endpoint currently exists"),
  service: z.boolean().describe("Whether the Endpoint incarnation is a Service")
}).describe("Endpoint state")

const windowResult = z.looseObject({
  process: z.string().describe("Owning Process identity"),
  title: z.string().describe("Window title"),
  header: z.boolean().describe("Whether the Desktop-owned Window header is shown"),
  position,
  size,
  minimized: z.boolean().describe("Whether the Window is minimized"),
  maximized: z.boolean().describe("Whether the Window is maximized"),
  front: z.boolean().describe("Whether the Window is frontmost in its layer"),
  layer: z.enum(layers).describe("Window layer")
}).describe("Window state")

const programRegistryEvents = {
  create: "create", forget: "forget", install: "install", uninstall: "uninstall"
} as const satisfies { [Event in keyof SystemProgramEvents]: Event }
const individualProgramEvents = {
  processCreate: "processCreate", processExit: "processExit", forget: "forget", uninstall: "uninstall"
} as const satisfies { [Event in keyof ProgramEvents]: Event }
const systemProcessEvents = {
  create: "create", exit: "exit"
} as const satisfies { [Event in keyof SystemProcessEvents]: Event }
const individualProcessEvents = {
  exit: "exit"
} as const satisfies { [Event in keyof ProcessEvents]: Event }
const endpointLifecycleEvents = {
  start: "start", stop: "stop"
} as const satisfies { [Event in keyof EndpointLifecycleEvents]: Event }
const windowEvents = {
  move: "move", resize: "resize", geometry: "geometry", minimize: "minimize",
  maximize: "maximize", changeTitle: "changeTitle", changeHeader: "changeHeader", front: "front"
} as const satisfies { [Event in keyof WindowEvents]: Event }

const programWaitRequest = request("program", "wait", {
  program: z.string().optional().describe("Program identity; omission observes the System Program registry"),
  event: z.enum([...new Set([
    ...Object.values(programRegistryEvents), ...Object.values(individualProgramEvents)
  ])]).describe("Lifecycle event"),
  timeout: z.number().positive().optional().describe("Maximum wait in milliseconds")
}).superRefine((value, context) => {
  if (value.program && (value.event === "create" || value.event === "install")) {
    context.addIssue({ code: "custom", message: `An individual Program does not emit ${value.event}` })
  }
  if (!value.program && (value.event === "processCreate" || value.event === "processExit")) {
    context.addIssue({ code: "custom", message: `${value.event} belongs to an individual Program` })
  }
})

const processWaitRequest = request("process", "wait", {
  program: z.string().optional().describe("Program identity; omission observes the System Process registry"),
  process: z.string().optional().describe("Process identity or Program-local name"),
  event: z.enum([...new Set([
    ...Object.values(systemProcessEvents), ...Object.values(individualProcessEvents)
  ])]).describe("Lifecycle event"),
  timeout: z.number().positive().optional().describe("Maximum wait in milliseconds")
}).superRefine((value, context) => {
  if (value.process && value.event === "create") {
    context.addIssue({ code: "custom", message: "An individual Process does not emit create" })
  }
})

const lifecycleResult = z.looseObject({
  scope: z.enum(["system", "program", "process", "endpoint", "window"]),
  program: z.string().optional(),
  process: z.string().optional(),
  endpoint: z.enum(["server", "client"]).optional(),
  event: z.string(),
  payload: jsonValue
}).describe("One observed lifecycle event")

const operationSummary = z.looseObject({
  domain: z.string().describe("Operation domain"),
  operation: z.string().describe("Operation name"),
  description: z.string().describe("Operation meaning")
})

const operationDescription = operationSummary.extend({
  request: jsonValue.describe("JSON Schema for the request"),
  result: jsonValue.describe("JSON Schema for the successful result")
})

function request<Domain extends string, Operation extends string, Shape extends z.ZodRawShape>(
  domain: Domain,
  operation: Operation,
  shape: Shape = {} as Shape
) {
  return z.looseObject({
    $domain: z.literal(domain),
    $operation: z.literal(operation),
    ...shape
  })
}

function defineOperation<
  Domain extends string,
  Operation extends string,
  Request extends z.ZodType,
  Result extends z.ZodType
>(domain: Domain, operation: Operation, description: string, input: Request, result: Result) {
  return Object.freeze({ domain, operation, description, request: input.describe(description), result })
}

const executeOperations = Object.freeze([
  defineOperation("operation", "list", "List the operations available through Execute.", request("operation", "list", {
    domain: z.string().optional().describe("Optional domain filter")
  }), z.array(operationSummary)),
  defineOperation("operation", "describe", "Describe one Execute operation and its JSON contracts.", request("operation", "describe", {
    domain: z.string().describe("Operation domain"),
    operation: z.string().describe("Operation name")
  }), operationDescription.nullable()),

  defineOperation("program", "list", "List Programs visible to the current System connection.", request("program", "list", {
    installedOnly: z.boolean().optional().describe("Return only installed Programs")
  }), z.array(programResult)),
  defineOperation("program", "find", "Find one visible Program by identity.", request("program", "find", {
    identity: z.string().describe("Program identity")
  }), programResult.nullable()),
  defineOperation("program", "agent", "Read one Program's agent documentation.", request("program", "agent", {
    identity: z.string().describe("Program identity")
  }), z.looseObject({ program: z.string(), content: z.string().nullable() })),
  defineOperation("program", "getLaunch", "Read the Process launch saved for one Program icon.", request("program", "getLaunch", {
    identity: z.string().describe("Program identity")
  }), launch.nullable()),
  defineOperation("program", "setLaunch", "Replace the Process launch saved for one Program icon.", request("program", "setLaunch", {
    identity: z.string().describe("Program identity"),
    launch: launch.describe("Saved Process launch")
  }), launch),
  defineOperation("program", "logs", "Query one Program's captured Endpoint logs.", request("program", "logs", {
    identity: z.string().describe("Program identity"),
    statement: z.string().min(1).describe("Table: logs. Columns: createdAt, process, source, kind, content."),
    values: z.array(jsonValue).optional().describe("Bound statement values")
  }), z.array(logRow)),
  defineOperation("program", "wait", "Wait for one Program lifecycle event.", programWaitRequest, lifecycleResult),

  defineOperation("process", "list", "List live Processes visible to the current System connection.", request("process", "list", {
    program: z.string().optional().describe("Restrict the list to one Program")
  }), z.array(processResult)),
  defineOperation("process", "find", "Find one live Process by identity or Program-local name.", request("process", "find", {
    program: z.string().optional().describe("Owning Program identity when resolving a Process name"),
    process: z.string().describe("Process identity or Program-local name")
  }), processResult.nullable()),
  defineOperation("process", "create", "Create one Process from a Program.", request("process", "create", {
    program: z.string().describe("Owning Program identity"),
    launch: launch.optional().describe("Process launch")
  }), processResult),
  defineOperation("process", "findOrCreate", "Find the named Process or create it atomically.", request("process", "findOrCreate", {
    program: z.string().describe("Owning Program identity"),
    launch: namedLaunch.describe("Named Process launch")
  }), processResult),
  defineOperation("process", "exit", "Exit one Process and all of its live Endpoints.", request("process", "exit", windowIdentity), processResult),
  defineOperation("process", "wait", "Wait for one Process lifecycle event.", processWaitRequest, lifecycleResult),

  defineOperation("endpoint", "inspect", "Read one Endpoint's current state.", request("endpoint", "inspect", endpointIdentity), endpointResult),
  defineOperation("endpoint", "start", "Ensure one Endpoint has a live incarnation.", z.union([
    request("endpoint", "start", {
      program: endpointIdentity.program,
      process: endpointIdentity.process,
      endpoint: z.literal("server"),
      launch: serverLaunch.optional().describe("Server Endpoint launch settings")
    }),
    request("endpoint", "start", {
      program: endpointIdentity.program,
      process: endpointIdentity.process,
      endpoint: z.literal("client"),
      launch: clientLaunch.optional().describe("Client Endpoint launch settings")
    })
  ]), endpointResult),
  defineOperation("endpoint", "stop", "Ensure one Endpoint has no live incarnation.", request("endpoint", "stop", endpointIdentity), endpointResult),
  defineOperation("endpoint", "waitReady", "Wait until one Endpoint is ready for use.", request("endpoint", "waitReady", {
    ...endpointIdentity,
    timeout: z.number().positive().optional().describe("Maximum wait in milliseconds")
  }), endpointResult),
  defineOperation("endpoint", "ask", "Ask a Server Endpoint event and return its answer.", request("endpoint", "ask", {
    ...endpointIdentity,
    event: z.string().min(1).describe("Event name"),
    input: jsonValue.optional().describe("Event input"),
    timeout: z.number().positive().optional().describe("Maximum wait in milliseconds")
  }), jsonValue),
  defineOperation("endpoint", "publish", "Publish one event without waiting for an answer.", request("endpoint", "publish", {
    ...endpointIdentity,
    event: z.string().min(1).describe("Event name"),
    input: jsonValue.optional().describe("Event input")
  }), endpointResult),
  defineOperation("endpoint", "wait", "Wait for one publication emitted by an Endpoint.", request("endpoint", "wait", {
    ...endpointIdentity,
    event: z.string().min(1).describe("Event name"),
    timeout: z.number().positive().optional().describe("Maximum wait in milliseconds")
  }), lifecycleResult),
  defineOperation("endpoint", "waitLifecycle", "Wait for one Endpoint incarnation transition.", request("endpoint", "waitLifecycle", {
    ...endpointIdentity,
    event: z.enum(Object.values(endpointLifecycleEvents)).describe("Lifecycle event"),
    timeout: z.number().positive().optional().describe("Maximum wait in milliseconds")
  }), lifecycleResult),

  defineOperation("window", "inspect", "Read one authoritative Window's current state.", request("window", "inspect", windowIdentity), windowResult),
  defineOperation("window", "move", "Change one Window's stored position.", request("window", "move", {
    ...windowIdentity,
    position
  }), windowResult),
  defineOperation("window", "resize", "Change one Window's stored size.", request("window", "resize", {
    ...windowIdentity,
    size
  }), windowResult),
  defineOperation("window", "setGeometry", "Change one Window's position and size atomically.", request("window", "setGeometry", {
    ...windowIdentity,
    position,
    size
  }), windowResult),
  defineOperation("window", "minimize", "Change whether one Window is minimized.", request("window", "minimize", {
    ...windowIdentity,
    minimized: z.boolean().optional().describe("Whether the Window is minimized; defaults to true")
  }), windowResult),
  defineOperation("window", "maximize", "Change whether one Window is maximized.", request("window", "maximize", {
    ...windowIdentity,
    maximized: z.boolean().optional().describe("Whether the Window is maximized; defaults to true")
  }), windowResult),
  defineOperation("window", "changeTitle", "Change one Window's human-readable title.", request("window", "changeTitle", {
    ...windowIdentity,
    title: z.string().describe("New Window title")
  }), windowResult),
  defineOperation("window", "changeHeader", "Change whether one Window shows its Desktop-owned header.", request("window", "changeHeader", {
    ...windowIdentity,
    header: z.boolean().describe("Whether the Window header is shown")
  }), windowResult),
  defineOperation("window", "raise", "Raise one Window within its own layer.", request("window", "raise", windowIdentity), windowResult),
  defineOperation("window", "wait", "Wait for one authoritative Window state change.", request("window", "wait", {
    ...windowIdentity,
    event: z.enum(Object.values(windowEvents)).describe("Window event"),
    timeout: z.number().positive().optional().describe("Maximum wait in milliseconds")
  }), lifecycleResult)
] as const)

type ExecuteOperation = (typeof executeOperations)[number]

export type ExecuteRequest = z.output<ExecuteOperation["request"]>

type OperationKey<Request extends ExecuteRequest> = Request extends ExecuteRequest
  ? `${Request["$domain"]}.${Request["$operation"]}`
  : never

/** Every operation identity in the authoritative Execute catalog. */
export type ExecuteOperationKey = OperationKey<ExecuteRequest>

/** Authoritative runtime schema for every Execute request. */
export const executeRequestSchema: z.ZodType<ExecuteRequest> = z.union(
  executeOperations.map(operation => operation.request) as unknown as readonly [z.ZodType<ExecuteRequest>, z.ZodType<ExecuteRequest>, ...z.ZodType<ExecuteRequest>[]]
)

type OperationFor<Request extends ExecuteRequest> = Extract<ExecuteOperation, {
  domain: Request["$domain"]
  operation: Request["$operation"]
}>

export type ExecuteResult<Request extends ExecuteRequest> = z.output<OperationFor<Request>["result"]>

export type ExecuteOperationSummary = z.output<typeof operationSummary>
export type ExecuteOperationDescription = z.output<typeof operationDescription>

/** Validate an untrusted JSON value against the authoritative Execute request catalog. */
export function parseExecuteRequest(value: unknown): ExecuteRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("An Execute request must be an object")

  const candidate = value as Record<string, unknown>
  const operation = findExecuteOperation(candidate.$domain, candidate.$operation)

  if (!operation) throw new Error(`Unknown Execute operation ${JSON.stringify([candidate.$domain, candidate.$operation])}`)

  return operation.request.parse(value) as ExecuteRequest
}

/** Return the local description of one Execute operation. */
export function describeExecuteOperation(domain: unknown, operation: unknown): ExecuteOperationDescription | null {
  const definition = findExecuteOperation(domain, operation)
  if (!definition) return null

  return Object.freeze({
    domain: definition.domain,
    operation: definition.operation,
    description: definition.description,
    request: z.toJSONSchema(definition.request) as JsonValue,
    result: z.toJSONSchema(definition.result) as JsonValue
  })
}

/** Return the local Execute operation catalog without contacting a System. */
export function listExecuteOperations(domain?: string): ExecuteOperationSummary[] {
  return executeOperations
    .filter(operation => domain === undefined || operation.domain === domain)
    .map(operation => Object.freeze({
      domain: operation.domain,
      operation: operation.operation,
      description: operation.description
    }))
}

export function executeOperationDefinition(request: ExecuteRequest) {
  const operation = findExecuteOperation(request.$domain, request.$operation)
  if (!operation) throw new Error(`Unknown Execute operation ${JSON.stringify([request.$domain, request.$operation])}`)
  return operation
}

function findExecuteOperation(domain: unknown, operation: unknown): ExecuteOperation | undefined {
  return executeOperations.find(candidate => candidate.domain === domain && candidate.operation === operation)
}
