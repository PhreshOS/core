import { expect, expectTypeOf, test } from "vitest"
import { isLayer, parseLaunch, parseClientPermissionDeclarations, parsePermission, parsePermissions, type ClientPermissionDeclarations, type PermissionValue } from "../source/main.js"

test("all restricted Client layers belong to the layers permission", () => {
  expect(isLayer("wallpaper")).toBe(true)
  expect(isLayer("start-menu")).toBe(true)
  expect(parseLaunch({ client: { layer: "wallpaper", minimize: true } })).toEqual({
    client: { layer: "wallpaper", minimize: true }
  })
  expect(parseClientPermissionDeclarations({ layers: ["wallpaper", "start-menu"] })).toEqual({ layers: ["wallpaper", "start-menu"] })
  expect(parsePermission("layers", ["wallpaper"])).toEqual(["wallpaper"])
  expect(() => parsePermission("wallpaper" as never, [])).toThrow()
})

test("layer permissions share the declaration and stored permission contracts", () => {
  expectTypeOf<PermissionValue<"layers">>().toEqualTypeOf<"under" | "over" | "wallpaper" | "start-menu">()
  const declaration: ClientPermissionDeclarations = { layers: ["under", "over", "wallpaper", "start-menu"] }
  expect(parseClientPermissionDeclarations(declaration)).toEqual(declaration)
  expect(parseClientPermissionDeclarations({ layers: true })).toEqual({ layers: true })
  expect(parseClientPermissionDeclarations({ layers: [] })).toEqual({ layers: [] })
  expect(parsePermission("layers", ["over", "wallpaper", "start-menu", "under", "over"])).toEqual(["over", "wallpaper", "start-menu", "under"])
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
