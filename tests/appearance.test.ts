import { describe, expect, it } from "vitest"
import {
  appearanceLimits,
  createAppearanceSnapshot,
  standardAppearance,
  type ThemedValue
} from "../source/main.js"

describe("Appearance", function () {
  it("keeps complete standard light and dark values", function () {
    expect(standardAppearance.background).toEqual({ light: "#fffff5", dark: "#101418" })
    expect(standardAppearance.foreground).toEqual({ light: "#183447", dark: "#edf8fc" })
    expect(standardAppearance.spacing).toEqual({ light: 12 })
    expect(standardAppearance.desktopWallpaper).toEqual({ light: null, dark: null })
    expect(standardAppearance.surface.light.grain).toBe(0)
  })

  it("makes unsupported dark branches a type error", function () {
    const spacing: ThemedValue<number> = { light: 12 }

    if (false) {
      // @ts-expect-error This Appearance value has no dark branch.
      void ({ light: 12, dark: 12 } satisfies ThemedValue<number>)
    }

    expect(spacing).toEqual({ light: 12 })
  })

  it("creates deeply immutable snapshots", function () {
    const appearance = createAppearanceSnapshot({
      ...standardAppearance,
      background: { light: "canvas", dark: "black" }
    })

    expect(appearance.background).toEqual({ light: "canvas", dark: "black" })
    expect(Object.isFrozen(appearance)).toBe(true)
    expect(Object.isFrozen(appearance.background)).toBe(true)
    expect(Object.isFrozen(appearance.surface.light)).toBe(true)
  })

  it("publishes the complete bounded Surface ranges", function () {
    expect(appearanceLimits.surface).toEqual({
      grain: { minimum: 0, maximum: 1 },
      grainAmount: { minimum: 0, maximum: 1 },
      backdrop: { minimum: 0, maximum: 24 },
      opacity: { minimum: 0, maximum: 1 },
      distortion: { minimum: 0, maximum: 140 },
      waves: { minimum: 0, maximum: 40 },
      ripples: { minimum: 0, maximum: 40 },
      saturation: { minimum: 1, maximum: 2.6 },
      brightness: { minimum: 1, maximum: 1.12 }
    })
  })
})
