import type { Process, Server, ServerService } from "../source/main.js"

function eventContracts(process: Process, server: Server, service: ServerService<{ change: number }>) {
  const stop = process.subscribe(capture => {
    if (capture.event === "exit") {
      const code: number | null = capture.message.code
      void code
    } else {
      const endpoint: Server | import("../source/main.js").Client = capture.message
      void endpoint
    }
  })

  server.lifecycle.subscribe("start", message => {
    const empty: undefined = message
    void empty
  })

  server.traffic.subscribeAsks(capture => void capture.questionId)
  server.traffic.subscribeAnswers(capture => void capture.message.outcome)

  service.subscribe("change", value => value.toFixed(0))
  service.lifecycle.subscribe("enable", value => void value)
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
