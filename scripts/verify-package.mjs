import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const temporary = mkdtempSync(join(tmpdir(), "phreshos-core-package-"))
const cache = join(temporary, "npm-cache")

try {
  const output = execFileSync(
    "npm",
    ["pack", "--json", "--ignore-scripts", "--pack-destination", temporary],
    {
      cwd: repository,
      encoding: "utf8",
      env: { ...process.env, npm_config_cache: cache }
    }
  )
  const packed = JSON.parse(output)[0]
  const paths = new Set(packed.files.map(file => file.path))

  assert(paths.has("dist/main.js"), "the package has no JavaScript entry point")
  assert(paths.has("dist/main.d.ts"), "the package has no declaration entry point")
  assert(paths.has("LICENSE"), "the package has no license")
  assert(paths.has("README.md"), "the package has no README")
  assert(paths.has("package.json"), "the package has no manifest")

  for (const path of paths) {
    assert(
      path === "LICENSE" || path === "README.md" || path === "package.json" || path.startsWith("dist/"),
      `private repository material entered the package: ${path}`
    )
  }

  const consumer = join(temporary, "consumer")
  const archive = join(temporary, packed.filename)

  mkdirSync(consumer)
  writeFileSync(
    join(consumer, "package.json"),
    JSON.stringify({ private: true, type: "module" }, null, 2)
  )
  execFileSync(
    "npm",
    ["install", "--ignore-scripts", "--no-audit", "--no-fund", "--no-package-lock", archive],
    {
      cwd: consumer,
      stdio: "inherit",
      env: { ...process.env, npm_config_cache: cache }
    }
  )

  writeFileSync(
    join(consumer, "runtime.mjs"),
    `import assert from "node:assert/strict"
import { Client, Endpoint, Server, permissionNames, standardAppearance } from "@phreshos/core"

assert(Client.prototype instanceof Endpoint)
assert(Server.prototype instanceof Endpoint)
assert.deepEqual(permissionNames, ["pointer"])
assert.equal(standardAppearance.background.light, "#fffff5")
`
  )
  execFileSync(process.execPath, [join(consumer, "runtime.mjs")], { stdio: "inherit" })

  writeFileSync(
    join(consumer, "consumer.ts"),
    `import { defineConfig, isUploadFile, type ContextMessage, type Config, type DesktopPointerSource, type DesktopPreferencesSource, type DesktopSurfaceSource, type LocalWindow, type Program, type SystemUploads, type TrafficMessage, type Transaction, type Upload, type VisibilityTransition, type Window, type WindowGeometry, type WritableDesktopPreferencesSource } from "@phreshos/core"

const config: Config = defineConfig({
  identity: "package-consumer",
  client: { location: "./client" }
})

declare const program: Program
type WindowHasSurface = "surface" extends keyof Window ? true : false
const windowHasSurface: WindowHasSurface = false
const transaction: Transaction = { duration: 180, wait: true }
const visibility: VisibilityTransition = { duration: 180, wait: true }
declare const localWindow: LocalWindow
const geometry: WindowGeometry = {
  position: { x: "0/1", y: "0/1" },
  size: { width: "1/2", height: "1/2" }
}
declare const window: Window
const setGeometry: Promise<void> = window.setGeometry(geometry)
const outside: ContextMessage<string> = { from: null, payload: "owner-local" }
const hiddenDestination: TrafficMessage<string> = { to: null, payload: "boundary-local" }
declare const uploads: SystemUploads
declare const desktopSurface: DesktopSurfaceSource
declare const desktopPointer: DesktopPointerSource
declare const desktopPreferences: DesktopPreferencesSource
declare const writableDesktopPreferences: WritableDesktopPreferencesSource
const written: Promise<Upload> = uploads.write("hello")
const read: Promise<string> = uploads.text("00000000-0000-0000-0000-000000000000.txt")
const uploadKey: boolean = isUploadFile("00000000-0000-0000-0000-000000000000.txt")
const surfaceWidth: Promise<number> = desktopSurface.snapshot().then(snapshot => snapshot.size.width)
const pointerX: Promise<number | undefined> = desktopPointer.snapshot().then(snapshot => snapshot.position?.x)
const theme = desktopPreferences.snapshot().then(snapshot => snapshot.theme)
const updateTheme = writableDesktopPreferences.update({ theme: "default" })
void config
void program.identity
void transaction
void localWindow.surface.set(visibility)
void localWindow.surface.remove(visibility)
void setGeometry
void outside
void hiddenDestination
void written
void read
void uploadKey
void surfaceWidth
void pointerX
void theme
void updateTheme
void windowHasSurface
`
  )
  writeFileSync(
    join(consumer, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          module: "NodeNext",
          moduleResolution: "NodeNext",
          noEmit: true,
          strict: true,
          target: "ESNext"
        },
        include: ["consumer.ts"]
      },
      null,
      2
    )
  )

  const typescript = resolve(repository, "node_modules/typescript/bin/tsc")
  assert(readFileSync(typescript).length > 0, "TypeScript is not installed")
  execFileSync(process.execPath, [typescript, "-p", join(consumer, "tsconfig.json")], {
    cwd: consumer,
    stdio: "inherit"
  })
} finally {
  rmSync(temporary, { recursive: true, force: true })
}
