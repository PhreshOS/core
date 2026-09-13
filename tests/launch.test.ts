import { describe, expect, it } from "vitest"
import { parseLaunch } from "../source/main.js"

describe("Launch", () => {
  it("snapshots options and Endpoint overrides without resolving defaults", () => {
    const input = { options: { language: "en" }, client: { position: { x: "1/2", y: 10 } } }
    const launch = parseLaunch(input)
    input.options.language = "fr"
    input.client.position.y = 20
    expect(launch).toEqual({ options: { language: "en" }, client: { position: { x: "1/2", y: 10 } } })
    expect(parseLaunch({})).toEqual({})
    expect(parseLaunch({ server: false, client: true })).toEqual({ server: false, client: true })
  })

  it("rejects unknown fields and invalid supplied values", () => {
    for (const value of [null, [], true, { extra: true }, { name: "" }, { options: null }, { options: ["x"] }, { server: { service: "yes" } }, { client: { layer: "top" } }, { client: { maximize: 1 } }]) {
      expect(() => parseLaunch(value)).toThrow()
    }
  })
})
