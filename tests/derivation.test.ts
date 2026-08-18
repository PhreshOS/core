import { describe, expect, it } from "vitest"
import { color, numericScale, scaleMultiplier } from "../source/main.js"

describe("visual derivation", function () {
  it("derives every numeric level around the exact medium value", function () {
    expect(numericScale(12)).toEqual({
      xsmall: 3,
      small: 6,
      medium: 12,
      large: 18,
      xlarge: 24
    })
  })

  it("derives multipliers around a neutral value of one", function () {
    expect(scaleMultiplier(1.8, "small")).toBe(1.4)
    expect(scaleMultiplier(1.8, "medium")).toBe(1.8)
  })

  it("preserves an explicit CSS color at the base level", function () {
    expect(color("rebeccapurple")).toEqual({
      subtle: "color-mix(in oklch, rebeccapurple 25%, white)",
      soft: "color-mix(in oklch, rebeccapurple 60%, white)",
      base: "rebeccapurple",
      strong: "color-mix(in oklch, rebeccapurple 82%, black)",
      intense: "color-mix(in oklch, rebeccapurple 68%, black)"
    })
  })
})
