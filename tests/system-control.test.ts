import { describe, expect, it } from "vitest"
import {
  systemControl,
  systemControlInputIssue,
  systemControlOperation
} from "../source/main.js"

describe("System control", function () {
  it("owns one complete, immutable, hierarchical vocabulary", function () {
    expect(Object.keys(systemControl)).toEqual(["program", "process", "endpoint", "window"])
    expect(systemControlOperation("endpoint", "ask")).toBe(systemControl.endpoint.operations.ask)
    expect(systemControlOperation("endpoint", "waitLifecycle")).toBe(systemControl.endpoint.operations.waitLifecycle)
    expect(systemControlOperation("endpoint", "missing")).toBeNull()

    for (const definition of Object.values(systemControl)) {
      expect(Object.isFrozen(definition)).toBe(true)
      expect(Object.isFrozen(definition.operations)).toBe(true)
    }
  })

  it("contains no consumer-specific presentation metadata", function () {
    expect("description" in systemControl.program).toBe(false)
    expect("guidance" in systemControl.program).toBe(false)
    expect("examples" in systemControl.endpoint.operations.ask).toBe(false)
  })

  it("keeps entity-scoped wait constraints in the shared contract", function () {
    expect(systemControl.endpoint.operations.waitReady.input).toMatchObject({
      properties: { endpoint: { enum: ["server", "client"] } }
    })
    expect(systemControlInputIssue("program", "wait", { program: "theme", event: "install" })).toBe(
      "An individual Program emits only forget and uninstall"
    )
    expect(systemControlInputIssue("process", "wait", { process: "one", event: "create" })).toBe(
      "An individual Process does not emit create"
    )
    expect(systemControlInputIssue("process", "wait", { process: "one", event: "exit" })).toBeNull()
  })
})
