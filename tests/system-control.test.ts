import { describe, expect, expectTypeOf, it } from "vitest"
import {
  systemControl,
  systemControlInputIssue,
  systemControlOperation,
  systemControlToolSchema,
  type SystemControlClient,
  type SystemControlToolInput
} from "../source/main.js"

describe("System control", function () {
  it("owns one complete, immutable, hierarchical vocabulary", function () {
    expect(Object.keys(systemControl)).toEqual(["program", "process", "endpoint", "window"])
    expect(systemControlOperation("endpoint", "ask")).toBe(systemControl.endpoint.operations.ask)
    expect(systemControlOperation("endpoint", "missing")).toBeNull()

    for (const [capability, definition] of Object.entries(systemControl)) {
      const tool = systemControlToolSchema(capability as keyof typeof systemControl)

      expect(tool.oneOf).toHaveLength(Object.keys(definition.operations).length)
      expect(Object.isFrozen(definition)).toBe(true)
      expect(Object.isFrozen(definition.operations)).toBe(true)
    }
  })

  it("derives agent inputs from the same request contract", function () {
    const request: SystemControlToolInput<"window"> = {
      action: "move",
      process: "window-process",
      position: { x: "50%", y: 0 }
    }

    expect(request.action).toBe("move")
    expectTypeOf<SystemControlClient["execute"]>().toBeFunction()

    const endpoint = systemControlToolSchema("endpoint")
    const ask = endpoint.oneOf?.find(branch => branch.properties?.action?.const === "ask")

    expect(ask?.properties?.payload?.oneOf?.map(branch => branch.type)).toEqual([
      "object",
      "array",
      "string",
      "number",
      "boolean",
      "null"
    ])
  })

  it("keeps entity-scoped wait constraints in the shared contract", function () {
    expect(systemControlInputIssue("program", "wait", { program: "theme", event: "install" })).toBe(
      "An individual Program emits only forget and uninstall"
    )
    expect(systemControlInputIssue("process", "wait", { process: "one", event: "create" })).toBe(
      "An individual Process does not emit create"
    )
    expect(systemControlInputIssue("process", "wait", { process: "one", event: "exit" })).toBeNull()
  })
})
