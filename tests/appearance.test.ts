import { describe, expect, it } from "vitest"
import {
  appearanceLimits,
  createAppearanceSnapshot,
  standardAppearance,
  type ThemedValue
} from "../source/main.js"

describe("Appearance", function () {
  it("keeps complete standard light and dark values", function () {
    expect(standardAppearance.background).toEqual({ light: "#ffffff", dark: "#121a21" })
    expect(standardAppearance.foreground).toEqual({ light: "#183447", dark: "#edf8fc" })
    expect(standardAppearance.primary).toEqual({ light: "#4c9cff", dark: "#4c9cff" })
    expect(standardAppearance.spacing).toEqual({ light: 12 })
    expect(standardAppearance.desktopWallpaper).toEqual({ light: null, dark: null })
    expect(standardAppearance.surface.light.grain).toBe(0)
  })

  it("uses frosted Surface defaults with independent light and dark opacity", function () {
    expect(standardAppearance.surface.light).toEqual({
      grain: 0,
      grainAmount: 0,
      backdrop: 12,
      opacity: 0.2,
      distortion: 0,
      waves: 0,
      ripples: 0,
      saturation: 1,
      brightness: 1
    })
    expect(standardAppearance.surface.dark).toEqual({ ...standardAppearance.surface.light, opacity: 0.35 })
  })

  it.each(["background", "foreground", "primary", "secondary", "success", "warning", "danger", "info"] as const)(
    "preserves independent immutable %s branches",
    function (role) {
      const value = { light: "oklch(60% 0.2 260)", dark: "var(--custom-color)" }
      const appearance = createAppearanceSnapshot({ ...standardAppearance, [role]: value })

      expect(appearance[role]).toEqual(value)
      expect(Object.isFrozen(appearance[role])).toBe(true)
      value.light = "red"
      expect(appearance[role].light).toBe("oklch(60% 0.2 260)")
    }
  )

  it("exposes only the current palette names", function () {
    expect(standardAppearance).not.toHaveProperty("accent")

    if (false) {
      // @ts-expect-error The retired color name is not part of Appearance.
      void standardAppearance.accent
    }
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
