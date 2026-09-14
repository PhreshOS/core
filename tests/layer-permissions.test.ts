import { expect, expectTypeOf, test } from "vitest"
import { isLayer, parseLaunch, parseClientPermissionDeclarations, parsePermission, parsePermissions, type ClientPermissionDeclarations, type PermissionValue } from "../source/main.js"

test("wallpaper has a separate permission and is a valid Client layer", () => {
  expect(isLayer("wallpaper")).toBe(true)
  expect(parseLaunch({ client: { layer: "wallpaper", minimize: true } })).toEqual({
    client: { layer: "wallpaper", minimize: true }
  })
  expect(parseClientPermissionDeclarations({ wallpaper: true })).toEqual({ wallpaper: true })
  expect(parsePermission("wallpaper", [])).toEqual([])
  expect(parsePermission("wallpaper", false)).toBe(false)
  expectTypeOf<PermissionValue<"wallpaper">>().toEqualTypeOf<never>()
  expect(() => parsePermission("layers", ["wallpaper"])).toThrow()
  expect(() => parsePermission("wallpaper", ["wallpaper"])).toThrow()
})

test("layer permissions share the declaration and stored permission contracts", () => {
  expectTypeOf<PermissionValue<"layers">>().toEqualTypeOf<"under" | "over">()
  const declaration: ClientPermissionDeclarations = { layers: ["under", "over"] }
  expect(parseClientPermissionDeclarations(declaration)).toEqual(declaration)
  expect(parseClientPermissionDeclarations({ layers: true })).toEqual({ layers: true })
  expect(parseClientPermissionDeclarations({ layers: [] })).toEqual({ layers: [] })
  expect(parsePermission("layers", ["over", "under", "over"])).toEqual(["over", "under"])
  expect(parsePermissions({ layers: false })).toEqual({ layers: false })
  expect(parsePermissions({ layers: null })).toEqual({ layers: null })
  for (const value of [false, null, ["window"], ["unknown"]]) {
    expect(() => parseClientPermissionDeclarations({ layers: value })).toThrow()
  }
  // @ts-expect-error Declarations accept true or a list, not stored denials.
  const denied: ClientPermissionDeclarations = { layers: false }
  // @ts-expect-error Standard windows are outside the permission's value domain.
  const standard: ClientPermissionDeclarations = { layers: ["window"] }
  void denied
  void standard
})
