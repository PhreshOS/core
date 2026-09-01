import type {
  Client,
  Context,
  Endpoint,
  Process,
  Program,
  Server,
  Service,
  ServerService,
  SystemClientEntity,
  SystemEndpointEntity,
  System,
  SystemProcessEntity,
  SystemProgramEntity,
  SystemServerEntity
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

  // @ts-expect-error A closed event contract rejects undeclared subscriptions.
  endpoint.subscribe("unknown", () => undefined)

  // @ts-expect-error A closed event contract rejects undeclared waits.
  await endpoint.waitFor("unknown")

  // @ts-expect-error A closed event contract rejects undeclared streams.
  endpoint.events("unknown")
}

void declaredEventNames

function undeclaredHandleEvents(endpoint: Endpoint, service: Service) {
  // @ts-expect-error An Endpoint with no event declaration exposes no event names.
  endpoint.subscribe("unknown", () => undefined)

  // @ts-expect-error An Endpoint with no event declaration exposes no event names.
  endpoint.waitFor("unknown")

  // @ts-expect-error An Endpoint with no event declaration exposes no event names.
  endpoint.events("unknown")

  // @ts-expect-error Undeclared Endpoint traffic exposes no ordinary event names.
  endpoint.traffic.subscribe("unknown", () => undefined)

  // @ts-expect-error Undeclared Endpoint traffic exposes no ordinary event names.
  endpoint.traffic.waitFor("unknown")

  // @ts-expect-error Undeclared Endpoint traffic exposes no ordinary event names.
  endpoint.traffic.events("unknown")

  // @ts-expect-error A Service with no event declaration exposes no event names.
  service.subscribe("unknown", () => undefined)

  // @ts-expect-error A Service with no event declaration exposes no event names.
  service.waitFor("unknown")

  // @ts-expect-error A Service with no event declaration exposes no event names.
  service.events("unknown")
}

void undeclaredHandleEvents

async function openContextEvents(context: Context) {
  context.subscribe("application-event", message => void message.payload)
  await context.waitFor("application-event")
  context.events("application-event")
}

void openContextEvents

function explicitlyOpenService(service: Service<{ changed: number }, unknown>) {
  service.subscribe("changed", message => message.toFixed(0))
  service.subscribe("application-event", message => void message)
  service.waitFor("application-event")
  service.events("application-event")
}

void explicitlyOpenService

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

function eventContracts(process: Process, server: Server, service: ServerService<{ change: number }>) {
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

async function generatorContracts(process: Process, server: Server) {
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
  program: SystemProgramEntity,
  process: SystemProcessEntity,
  endpoint: SystemEndpointEntity,
  server: SystemServerEntity,
  client: SystemClientEntity
) {
  const canonicalProgram: Program = program
  const canonicalProcess: Process = process
  const canonicalEndpoint: Endpoint = endpoint
  const canonicalServer: Server = server
  const canonicalClient: Client = client

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
