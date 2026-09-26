import { describe, expect, it } from "vitest"
import {
  applyAppearanceUpdate,
  appearanceLimits,
  createAppearanceSnapshot,
  defaultAppearance,
  parseAppearance,
  type ThemedValue
} from "../source/main.js"

describe("Appearance", function () {
  it("keeps complete default light and dark values", function () {
    expect(defaultAppearance.colors.light).toEqual({
      background: "#fbf8f4", foreground: "#2b211a", default: "#fffdfa",
      primary: "#f5b37d", secondary: "#3f7de0", success: "#3f9a4e",
      warning: "#d99a1e", danger: "#d8483b", info: "#1b9aa6"
    })
    expect(defaultAppearance.colors.dark).toEqual({
      background: "#0a131f", foreground: "#e7edf5", default: "#15202d",
      primary: "#f5b37d", secondary: "#6ea2ff", success: "#6cc47a",
      warning: "#f0bd4f", danger: "#f07564", info: "#4cc9d3"
    })
    expect(defaultAppearance.spacing).toBe(12)
    expect(defaultAppearance.transaction).toEqual({ duration: 120, easing: "ease-out" })
    expect(defaultAppearance.taskbar).toEqual({ position: "bottom", size: 44, overlay: false })
    expect(defaultAppearance.desktopWallpaper).toEqual({ light: null, dark: null })
    expect(defaultAppearance.material.light.grain).toBe(0.04)
  })

  it("uses independent light and dark material defaults", function () {
    expect(defaultAppearance.material.light).toEqual({
      grain: 0.04,
      grainAmount: 0.95,
      backdrop: 5,
      opacity: 0.8,
      distortion: 0,
      saturation: 1.66
    })
    expect(defaultAppearance.material.dark).toEqual({
      grain: 0.03,
      grainAmount: 0.95,
      backdrop: 12,
      opacity: 0.8,
      distortion: 0,
      saturation: 1.77
    })
  })

  it("owns independent, immutable shadow values", function () {
    const light = { x: 0, y: 0, blur: 10, spread: 0, opacity: 0.07 }
    const dark = { x: 0, y: 0, blur: 12, spread: 0, opacity: 0.3 }
    expect(defaultAppearance.shadow).toEqual({ light, dark })
    const input = { ...light, y: 12 }
    const snapshot = createAppearanceSnapshot({ ...defaultAppearance, shadow: { light: input, dark } })
    input.y = 20
    expect(snapshot.shadow.light.y).toBe(12)
    expect(Object.isFrozen(snapshot.shadow)).toBe(true)
    expect(Object.isFrozen(snapshot.shadow.light)).toBe(true)
    expect(Object.isFrozen(snapshot.shadow.dark)).toBe(true)
    expect(snapshot.material).toEqual(defaultAppearance.material)
  })

  it.each(["background", "foreground", "default", "primary", "secondary", "success", "warning", "danger", "info"] as const)(
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
    expect(Object.isFrozen(appearance.taskbar)).toBe(true)
    expect(Object.isFrozen(appearance.material.light)).toBe(true)
  })

  it("validates consumed values and ignores additional properties", function () {
    expect(parseAppearance(defaultAppearance)).toEqual(defaultAppearance)
    const { default: omitted, ...withoutDefault } = defaultAppearance.colors.light
    expect(omitted).toBe("#fffdfa")
    expect(() => parseAppearance({
      ...defaultAppearance,
      colors: { ...defaultAppearance.colors, light: withoutDefault }
    })).toThrow("Appearance color default is invalid")
    expect(() => parseAppearance({ ...defaultAppearance, colors: defaultAppearance.colors.light })).toThrow("Appearance colors")
    expect(() => parseAppearance({ ...defaultAppearance, material: {
      light: { ...defaultAppearance.material.light, opacity: 2 },
      dark: defaultAppearance.material.dark
    } })).toThrow("Appearance material opacity")
    expect(() => parseAppearance({ ...defaultAppearance, taskbar: { position: "center", size: 44 } })).toThrow("Appearance taskbar position")
    expect(() => parseAppearance({ ...defaultAppearance, taskbar: { position: "bottom", size: 101 } })).toThrow("Appearance taskbar size")
    expect(() => parseAppearance({ ...defaultAppearance, taskbar: { position: "bottom", size: 44, overlay: "yes" } })).toThrow("Appearance taskbar overlay")
    expect(parseAppearance({
      ...defaultAppearance,
      extension: true,
      colors: {
        ...defaultAppearance.colors,
        light: { ...defaultAppearance.colors.light, extension: "future" }
      }
    })).toEqual(defaultAppearance)
  })

  it("recursively merges partial updates into a complete snapshot", function () {
    const appearance = applyAppearanceUpdate(defaultAppearance, {
      colors: { dark: { danger: "#aa0000" } },
      material: { light: { opacity: 0.5 } },
      transaction: { duration: 240 },
      taskbar: { position: "left" }
    })

    expect(appearance.colors.dark.danger).toBe("#aa0000")
    expect(appearance.colors.dark.primary).toBe(defaultAppearance.colors.dark.primary)
    expect(appearance.colors.light).toEqual(defaultAppearance.colors.light)
    expect(appearance.material.light.opacity).toBe(0.5)
    expect(appearance.material.light.grain).toBe(defaultAppearance.material.light.grain)
    expect(appearance.transaction).toEqual({ duration: 240, easing: "ease-out" })
    expect(appearance.taskbar).toEqual({ position: "left", size: 44, overlay: false })

    const overlay = applyAppearanceUpdate(appearance, { taskbar: { overlay: true } })
    expect(overlay.taskbar).toEqual({ position: "left", size: 44, overlay: true })
    expect(() => applyAppearanceUpdate(defaultAppearance, {})).toThrow("at least one Appearance field")
    expect(() => applyAppearanceUpdate(defaultAppearance, { material: { dark: { opacity: 2 } } })).toThrow("Appearance material opacity")
  })

  it("publishes the complete bounded material ranges", function () {
    expect(appearanceLimits.transaction.duration).toEqual({ minimum: 0, maximum: 60_000 })
    expect(appearanceLimits.taskbar.size).toEqual({ minimum: 0, maximum: 100 })
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
