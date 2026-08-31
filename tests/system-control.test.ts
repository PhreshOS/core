import { describe, expect, it } from "vitest"
import {
  systemControl,
  systemControlInputIssue,
  systemControlOperation,
  systemControlToolSchema,
  type SystemControlToolInput
} from "../source/main.js"

describe("System control", function () {
  it("owns one complete, immutable, hierarchical vocabulary", function () {
    expect(Object.keys(systemControl)).toEqual(["program", "process", "endpoint", "window"])
    expect(systemControlOperation("endpoint", "ask")).toBe(systemControl.endpoint.operations.ask)
    expect(systemControlOperation("endpoint", "waitLifecycle")).toBe(systemControl.endpoint.operations.waitLifecycle)
    expect(systemControlOperation("endpoint", "missing")).toBeNull()

    for (const [capability, definition] of Object.entries(systemControl)) {
      const tool = systemControlToolSchema(capability as keyof typeof systemControl)

      expect(tool.oneOf).toHaveLength(Object.values(definition.operations).reduce(
        (count, operation) => count + (operation.input.oneOf?.length ?? 1),
        0
      ))
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

    const starts = endpoint.oneOf?.filter(branch => branch.properties?.action?.const === "start")
    const serverStart = starts?.find(branch => branch.properties?.endpoint?.const === "server")
    const clientStart = starts?.find(branch => branch.properties?.endpoint?.const === "client")

    expect(Object.keys(serverStart?.properties?.launch?.properties ?? {})).toEqual(["service"])
    expect(clientStart?.properties?.launch?.properties?.title?.type).toBe("string")
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
