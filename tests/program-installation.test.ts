import { expect, test } from "vitest"
import { parseProgramInstallOptions, parseProgramUninstallOptions } from "../source/main.js"

test("installation preserves independent launch and purge decisions", () => {
  expect(parseProgramInstallOptions({})).toEqual({})
  expect(parseProgramInstallOptions({ launch: true, purge: true })).toEqual({ launch: true, purge: true })
  const input = { launch: { name: "main", replace: true, options: { mode: "editor" } }, purge: false }
  const parsed = parseProgramInstallOptions(input)
  input.launch.options.mode = "changed"
  expect(parsed).toEqual({ launch: { name: "main", replace: true, options: { mode: "editor" } }, purge: false })
  for (const value of [true, false, null, { launch: false }, { purge: "yes" }, { extra: true }]) {
    expect(() => parseProgramInstallOptions(value)).toThrow()
  }
})

test("uninstallation accepts only purge decisions", () => {
  expect(parseProgramUninstallOptions({})).toEqual({})
  expect(parseProgramUninstallOptions({ purge: true })).toEqual({ purge: true })
  for (const value of [true, false, null, { launch: true }, { purge: "yes" }]) {
    expect(() => parseProgramUninstallOptions(value)).toThrow()
  }
})
