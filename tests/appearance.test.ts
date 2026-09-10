import { describe, expect, it } from "vitest"
import {
  appearanceLimits,
  createAppearanceSnapshot,
  defaultAppearance,
  type ThemedValue
} from "../source/main.js"

describe("Appearance", function () {
  it("keeps complete default light and dark values", function () {
    expect(defaultAppearance.background).toEqual({ light: "#ffffff", dark: "#121a21" })
    expect(defaultAppearance.foreground).toEqual({ light: "#183447", dark: "#edf8fc" })
    expect(defaultAppearance.primary).toEqual({ light: "#4c9cff", dark: "#4c9cff" })
    expect(defaultAppearance.spacing).toEqual({ light: 12 })
    expect(defaultAppearance.desktopWallpaper).toEqual({ light: null, dark: null })
    expect(defaultAppearance.material.light.grain).toBe(0)
  })

  it("uses material defaults with independent light and dark opacity", function () {
    expect(defaultAppearance.material.light).toEqual({
      grain: 0,
      grainAmount: 0,
      backdrop: 12,
      opacity: 0.2,
      distortion: 0,
      saturation: 1
    })
    expect(defaultAppearance.material.dark).toEqual({ ...defaultAppearance.material.light, opacity: 0.35 })
  })

  it("owns independent, immutable shadow values", function () {
    const shadow = { x: 0, y: 8, blur: 24, spread: 0, opacity: 0.16 }
    expect(defaultAppearance.shadow).toEqual({ light: shadow, dark: shadow })
    const input = { ...shadow, y: 12 }
    const snapshot = createAppearanceSnapshot({ ...defaultAppearance, shadow: { light: input, dark: shadow } })
    input.y = 20
    expect(snapshot.shadow.light.y).toBe(12)
    expect(Object.isFrozen(snapshot.shadow)).toBe(true)
    expect(Object.isFrozen(snapshot.shadow.light)).toBe(true)
    expect(Object.isFrozen(snapshot.shadow.dark)).toBe(true)
    expect(snapshot.material).toEqual(defaultAppearance.material)
  })

  it.each(["background", "foreground", "primary", "secondary", "success", "warning", "danger", "info"] as const)(
    "preserves independent immutable %s branches",
    function (role) {
      const value = { light: "oklch(60% 0.2 260)", dark: "var(--custom-color)" }
      const appearance = createAppearanceSnapshot({ ...defaultAppearance, [role]: value })

      expect(appearance[role]).toEqual(value)
      expect(Object.isFrozen(appearance[role])).toBe(true)
      value.light = "red"
      expect(appearance[role].light).toBe("oklch(60% 0.2 260)")
    }
  )

  it("exposes only the current palette names", function () {
    expect(defaultAppearance).not.toHaveProperty("accent")

    if (false) {
      // @ts-expect-error The retired color name is not part of Appearance.
      void defaultAppearance.accent
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
      ...defaultAppearance,
      background: { light: "canvas", dark: "black" }
    })

    expect(appearance.background).toEqual({ light: "canvas", dark: "black" })
    expect(Object.isFrozen(appearance)).toBe(true)
    expect(Object.isFrozen(appearance.background)).toBe(true)
    expect(Object.isFrozen(appearance.material.light)).toBe(true)
  })

  it("publishes the complete bounded material ranges", function () {
    expect(appearanceLimits.material).toEqual({
      grain: { minimum: 0, maximum: 1 },
      grainAmount: { minimum: 0, maximum: 1 },
      backdrop: { minimum: 0, maximum: 24 },
      opacity: { minimum: 0, maximum: 1 },
      distortion: { minimum: 0, maximum: 140 },
      saturation: { minimum: 1, maximum: 2.6 }
    })
  })
})
