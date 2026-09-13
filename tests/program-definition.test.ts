import { describe, expect, expectTypeOf, it } from "vitest"
import { parseProgramDefinition, type Config, type Launch, type ProgramDefinition } from "../source/main.js"

describe("Program definition", function () {
  it("shares startup and option contracts with authoring configuration", () => {
    expectTypeOf<Config["startup"]>().toEqualTypeOf<ProgramDefinition["startup"]>()
    expectTypeOf<Config["options"]>().toEqualTypeOf<Launch["options"]>()
    expectTypeOf<ProgramDefinition["startup"]>().toEqualTypeOf<boolean | Launch | undefined>()
  })
  it("canonicalizes the shared runtime definition", function () {
    const definition = parseProgramDefinition({
      identity: "example-program",
      storage: "/var/example",
      client: {
        location: "/opt/example/client",
        permissions: {
          network: ["https://api.example.com/**"],
          uploads: true
        }
      }
    })

    expect(definition.client?.permissions?.network).toEqual(["https://api.example.com"])
    expect(Object.isFrozen(definition)).toBe(true)
  })

  it("preserves startup selection and default launch options", function () {
    const base = { identity: "example", storage: "/tmp/example", client: { location: "/client" } }
    for (const startup of [undefined, false, true, {}, { options: { document: "welcome.txt" }, client: { minimize: true } }]) {
      const parsed = parseProgramDefinition({ ...base, startup, options: { document: "default.txt", language: "en" } })
      expect(parsed.startup).toEqual(startup)
      expect(parsed.options).toEqual({ document: "default.txt", language: "en" })
      expect(Object.isFrozen(parsed.options)).toBe(true)
    }
    for (const startup of [null, "true", [], { options: { count: 1 } }, { client: { location: "/legacy" } }, { client: { size: { width: Infinity, height: 10 } } }]) {
      expect(() => parseProgramDefinition({ ...base, startup })).toThrow()
    }
    expect(() => parseProgramDefinition({ ...base, options: { count: 1 } })).toThrow("text values")
  })

  it("rejects stale, incomplete, and contradictory definitions", function () {
    expect(() => parseProgramDefinition({ identity: "example", storage: "/tmp/example" })).toThrow("Server, a Client, or both")
    expect(() => parseProgramDefinition({ identity: "example", storage: "/tmp/example", client: { location: "/client", permissions: { files: true } } })).toThrow("permission")
    expect(() => parseProgramDefinition({ identity: "example", storage: "/tmp/example", client: { location: "/client", legacy: true } })).toThrow("unknown field")
    expect(() => parseProgramDefinition({ identity: "example", storage: "/tmp/example", server: { location: "/server", startCommand: "node main.js", entryFile: "main.js" } })).toThrow("exactly one")
  })
})
