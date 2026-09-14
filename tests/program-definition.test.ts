import { describe, expect, expectTypeOf, it } from "vitest"
import { parseProgramDefinition, type Config, type Launch, type ProgramDefinition } from "../source/main.js"

describe("Program definition", function () {
  it("shares launch and startup contracts with authoring configuration", () => {
    expectTypeOf<Config["launch"]>().toEqualTypeOf<true | Launch | undefined>()
    expectTypeOf<Config["launch"]>().toEqualTypeOf<ProgramDefinition["launch"]>()
    expectTypeOf<Config["startup"]>().toEqualTypeOf<ProgramDefinition["startup"]>()
    expectTypeOf<ProgramDefinition["startup"]>().toEqualTypeOf<true | Launch | undefined>()
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

  it("preserves icon launch intent", () => {
    const base = { identity: "example", storage: "/tmp/example", client: { location: "/client" } }
    for (const launch of [undefined, true, {}, { options: { document: "welcome.txt" } }]) {
      const parsed = parseProgramDefinition({ ...base, launch })
      expect(parsed.launch).toEqual(launch)
    }
    for (const launch of [false, null, "true", [], { options: { count: 1 } }]) {
      expect(() => parseProgramDefinition({ ...base, launch })).toThrow()
    }
  })

  it("preserves startup selection and its launch options", function () {
    const base = { identity: "example", storage: "/tmp/example", client: { location: "/client" } }
    for (const startup of [undefined, true, {}, { options: { document: "welcome.txt" }, client: { minimize: true } }]) {
      const parsed = parseProgramDefinition({ ...base, startup })
      expect(parsed.startup).toEqual(startup)
    }
    for (const startup of [false, null, "true", [], { options: { count: 1 } }, { client: { location: "/legacy" } }, { client: { size: { width: Infinity, height: 10 } } }]) {
      expect(() => parseProgramDefinition({ ...base, startup })).toThrow()
    }
  })

  it("rejects stale, incomplete, and contradictory definitions", function () {
    expect(() => parseProgramDefinition({ identity: "example", storage: "/tmp/example" })).toThrow("Server, a Client, or both")
    expect(() => parseProgramDefinition({ identity: "example", storage: "/tmp/example", client: { location: "/client", permissions: { files: true } } })).toThrow("permission")
    expect(() => parseProgramDefinition({ identity: "example", storage: "/tmp/example", client: { location: "/client", legacy: true } })).toThrow("unknown field")
    expect(() => parseProgramDefinition({ identity: "example", storage: "/tmp/example", server: { location: "/server", startCommand: "node main.js", entryFile: "main.js" } })).toThrow("exactly one")
  })
})
