import { describe, expect, it } from "vitest"
import { parseProgramDefinition } from "../source/main.js"

describe("Program definition", function () {
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

  it("rejects stale, incomplete, and contradictory definitions", function () {
    expect(() => parseProgramDefinition({ identity: "example", storage: "/tmp/example" })).toThrow("Server, a Client, or both")
    expect(() => parseProgramDefinition({ identity: "example", storage: "/tmp/example", client: { location: "/client", permissions: { files: true } } })).toThrow("permission")
    expect(() => parseProgramDefinition({ identity: "example", storage: "/tmp/example", client: { location: "/client", legacy: true } })).toThrow("unknown field")
    expect(() => parseProgramDefinition({ identity: "example", storage: "/tmp/example", server: { location: "/server", startCommand: "node main.js", entryFile: "main.js" } })).toThrow("exactly one")
  })
})
