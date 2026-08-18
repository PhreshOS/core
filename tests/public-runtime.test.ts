import { describe, expect, it } from "vitest"
import {
  Client,
  Endpoint,
  Server,
  defineConfig,
  isPermissionName,
  isRelativeValue,
  isScaleLevel,
  layers,
  parseRelativeValue
} from "../source/main.js"

describe("public runtime", function () {
  it("preserves the domain class hierarchy", function () {
    expect(Client.prototype).toBeInstanceOf(Endpoint)
    expect(Server.prototype).toBeInstanceOf(Endpoint)
  })

  it("keeps the finite public registries narrow", function () {
    expect(layers).toEqual(["window", "under", "over"])
    expect(isPermissionName("pointer")).toBe(true)
    expect(isPermissionName("pointerMove")).toBe(false)
    expect(isScaleLevel("medium")).toBe(true)
    expect(isScaleLevel("full")).toBe(false)
  })

  it("returns the exact authored Program description", function () {
    const config = {
      identity: "public-contract",
      client: { location: "./client" }
    } as const

    expect(defineConfig(config)).toBe(config)
  })

  it("accepts only finite linear geometry", function () {
    expect(parseRelativeValue("50% + 20 * 2")).toEqual({ relative: 0.5, pixels: 40 })
    expect(parseRelativeValue("1/3 - 4")).toEqual({ relative: 1 / 3, pixels: -4 })
    expect(isRelativeValue(Number.POSITIVE_INFINITY)).toBe(false)
    expect(isRelativeValue("calc(100% - 4px)")).toBe(false)
  })
})
