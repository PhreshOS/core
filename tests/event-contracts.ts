import type {
  ClientEndpoint,
  ClientContext,
  Context,
  Endpoint,
  Process,
  Program,
  ServerEndpoint,
  Service,
  ServerService,
  System,
} from "../source/main.js"

type DeclaredEvents = {
  changed: { value: number }
  closed: undefined
}

async function declaredEventNames(endpoint: Endpoint<DeclaredEvents>) {
  endpoint.subscribe("changed", message => {
    const value: number = message.value
    void value
  })

  const changed = await endpoint.waitFor("changed")
  const value: number = changed.value
  void value

  for await (const message of endpoint.events("changed")) {
    const streamed: number = message.value
    void streamed
  }

  endpoint.traffic.subscribe("changed", message => {
    const observed: number = message.payload.value
    void observed
  })

  endpoint.subscribe("unknown", message => void message)
  const unknownMessage: unknown = await endpoint.waitFor("unknown")
  void unknownMessage
  endpoint.events("unknown")
}

void declaredEventNames

function openHandleEvents(endpoint: Endpoint, service: Service) {
  endpoint.subscribe("unknown", message => void message)
  endpoint.waitFor("unknown")
  endpoint.events("unknown")

  endpoint.traffic.subscribe("unknown", message => void message.payload)
  endpoint.traffic.waitFor("unknown")
  endpoint.traffic.events("unknown")

  service.subscribe("unknown", message => void message)
  service.waitFor("unknown")
  service.events("unknown")
}

void openHandleEvents

function explicitlyClosedHandles(endpoint: Endpoint<{}, never>, service: Service<{}, never>) {
  // @ts-expect-error An explicitly closed Endpoint rejects undeclared events.
  endpoint.subscribe("unknown", () => undefined)

  // @ts-expect-error An explicitly closed Endpoint rejects undeclared events.
  endpoint.waitFor("unknown")

  // @ts-expect-error An explicitly closed Service rejects undeclared events.
  service.events("unknown")
}

void explicitlyClosedHandles

async function openContextEvents(context: Context) {
  context.subscribe("application-event", message => void message.payload)
  await context.waitFor("application-event")
  context.events("application-event")
}

void openContextEvents

function clientContextContract(context: ClientContext) {
  const authoritative = context.window
  authoritative.subscribe("move", position => void position.x)
  authoritative.position()
  const local = context.localWindow
  local.addSurface()
  local.transaction({ duration: 120 }).setGeometry({ position: { x: 0, y: 0 }, size: { width: 800, height: 600 } })
  context.permissions.get("all")
  context.permissions.request("all", [])
  context.permissions.timeout(120_000).request("all")
  context.permissions.request("services", ["flambo"])
  context.permissions.request("programs")
  context.permissions.request("appearance")
  context.permissions.request("desktopPreferences", [])

  // @ts-expect-error Value-less permissions do not accept Program identities.
  context.permissions.request("appearance", ["flambo"])

  // @ts-expect-error Permission names are closed by the Core catalog.
  context.permissions.get("files")

  // @ts-expect-error A value-less permission accepts no string values.
  context.permissions.request("all", ["read"])
}

void clientContextContract

function explicitlyOpenService(service: Service<{ changed: number }, unknown>) {
  service.subscribe("changed", message => message.toFixed(0))
  service.subscribe("application-event", message => void message)
  service.waitFor("application-event")
  service.events("application-event")
}

void explicitlyOpenService

function explicitlyOpenEndpoint(endpoint: Endpoint<{ changed: number }, unknown>) {
  endpoint.subscribe("changed", message => message.toFixed(0))
  endpoint.subscribe("application-event", message => void message)
  endpoint.waitFor("application-event")
  endpoint.events("application-event")
  endpoint.traffic.subscribe("application-event", message => void message.payload)
}

void explicitlyOpenEndpoint

function explicitlyOpenSystemService(system: System) {
  const service = system.service<{ changed: number }, unknown>({
    program: "application",
    process: "main",
    endpoint: "server"
  })

  service.subscribe("changed", message => message.toFixed(0))
  service.subscribe("application-event", message => void message)
}

void explicitlyOpenSystemService

function eventContracts(process: Process, server: ServerEndpoint, service: ServerService<{ change: number }>) {
  const stop = process.subscribe(capture => {
    const code: number | null = capture.message.code
    void code
  })

  server.lifecycle.subscribe("start", message => {
    const empty: undefined = message
    void empty
  })

  server.traffic.subscribeAsks(capture => void capture.questionId)
  server.traffic.subscribeAnswers(capture => void capture.message.outcome)

  service.subscribe("change", value => value.toFixed(0))
  service.lifecycle.subscribe("start", value => void value)
  service.ask("value")
  service.publish("refresh")

  stop()
}

async function generatorContracts(process: Process, server: ServerEndpoint) {
  for await (const capture of process.events()) {
    if (capture.event === "exit") {
      const status: "exited" | "signaled" = capture.message.status
      void status
    }
  }

  for await (const capture of server.traffic.asks()) void capture.questionId
  for await (const capture of server.traffic.answers()) void capture.message.outcome
}

void eventContracts
void generatorContracts

function systemHandlesRemainCanonical(
  program: Program,
  process: Process,
  endpoint: Endpoint,
  server: ServerEndpoint,
  client: ClientEndpoint
) {
  const canonicalProgram: Program = program
  const canonicalProcess: Process = process
  const canonicalEndpoint: Endpoint = endpoint
  const canonicalServer: ServerEndpoint = server
  const canonicalClient: ClientEndpoint = client

  program.permissions.get("all")
  program.permissions.get("services")
  program.permissions.all()
  program.permissions.set("all", true)
  program.permissions.set("services", ["flambo"])
  program.permissions.set("programs", true)
  program.permissions.set("appearance", [])
  program.permissions.set("desktopPreferences", true)

  // @ts-expect-error Program-scoped permission values are Program identities.
  program.permissions.set("services", [42])

  // @ts-expect-error Value-less permissions do not accept Program identities.
  program.permissions.set("desktopPreferences", ["settings"])
  program.permissions.delete("all")

  // @ts-expect-error Program permission names are closed by the Core catalog.
  program.permissions.delete("files")

  // @ts-expect-error Assignment values belong to the selected permission.
  program.permissions.set("all", ["read"])
  program.data.text("state.json")
  program.store.get("state")
  program.logs.query("select 1")
  program.database.query("select 1")
  program.icon()
  process.parent()
  process.option("mode")
  server.traffic.subscribeAsks(() => undefined)
  server.traffic.subscribeAnswers(() => undefined)
  client.traffic.subscribeAsks(() => undefined)

  void [canonicalProgram, canonicalProcess, canonicalEndpoint, canonicalServer, canonicalClient]
}

void systemHandlesRemainCanonical
