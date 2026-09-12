import { describe, expect, it } from "vitest"
import {
  appearanceLimits,
  createAppearanceSnapshot,
  defaultAppearance,
  type ThemedValue
} from "../source/main.js"

describe("Appearance", function () {
  it("keeps complete default light and dark values", function () {
    expect(defaultAppearance.colors.light.background).toBe("#ffffff")
    expect(defaultAppearance.colors.dark.background).toBe("#121a21")
    expect(defaultAppearance.colors.light.foreground).toBe("#183447")
    expect(defaultAppearance.colors.dark.foreground).toBe("#edf8fc")
    expect(defaultAppearance.colors.light.primary).toBe("#4c9cff")
    expect(defaultAppearance.colors.dark.primary).toBe("#4c9cff")
    expect(defaultAppearance.spacing).toBe(12)
    expect(defaultAppearance.transaction).toEqual({ duration: 120, easing: "ease-out" })
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
      const appearance = createAppearanceSnapshot({
        ...defaultAppearance,
        colors: {
          light: { ...defaultAppearance.colors.light, [role]: value.light },
          dark: { ...defaultAppearance.colors.dark, [role]: value.dark }
        }
      })

      expect({ light: appearance.colors.light[role], dark: appearance.colors.dark[role] }).toEqual(value)
      expect(Object.isFrozen(appearance.colors.light)).toBe(true)
      expect(Object.isFrozen(appearance.colors.dark)).toBe(true)
      value.light = "red"
      expect(appearance.colors.light[role]).toBe("oklch(60% 0.2 260)")
    }
  )

  it("exposes only the current palette names", function () {
    expect(defaultAppearance.colors.light).not.toHaveProperty("accent")

    if (false) {
      // @ts-expect-error The retired color name is not part of Appearance.
      void defaultAppearance.colors.light.accent
    }
  })

  it("requires both Theme branches in every ThemedValue", function () {
    const spacing: ThemedValue<number> = { light: 12, dark: 14 }

    if (false) {
      // @ts-expect-error A ThemedValue never has an implicit branch.
      void ({ light: 12 } satisfies ThemedValue<number>)
    }

    expect(spacing).toEqual({ light: 12, dark: 14 })
  })

  it("creates deeply immutable snapshots", function () {
    const appearance = createAppearanceSnapshot({
      ...defaultAppearance,
      colors: {
        light: { ...defaultAppearance.colors.light, background: "canvas" },
        dark: { ...defaultAppearance.colors.dark, background: "black" }
      }
    })

    expect(appearance.colors.light.background).toBe("canvas")
    expect(appearance.colors.dark.background).toBe("black")
    expect(Object.isFrozen(appearance)).toBe(true)
    expect(Object.isFrozen(appearance.colors)).toBe(true)
    expect(Object.isFrozen(appearance.colors.light)).toBe(true)
    expect(Object.isFrozen(appearance.transaction)).toBe(true)
    expect(Object.isFrozen(appearance.material.light)).toBe(true)
  })

  it("publishes the complete bounded material ranges", function () {
    expect(appearanceLimits.transaction.duration).toEqual({ minimum: 0, maximum: 60_000 })
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
