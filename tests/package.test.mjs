import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "vitest"

test("package contract", async () => {
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
  import { ClientEndpoint, Endpoint, ServerEndpoint, parseShellEvent, defaultAppearance } from "@phreshos/core"

  assert(ClientEndpoint.prototype instanceof Endpoint)
  assert(ServerEndpoint.prototype instanceof Endpoint)
  assert.equal(defaultAppearance.colors.light.background, "#fbf8f4")
  assert.equal(defaultAppearance.colors.light.primary, "#f5b37d")
  assert.equal("accent" in defaultAppearance, false)
  assert.deepEqual(parseShellEvent({ event: "started", pid: 42 }), { event: "started", pid: 42 })
  /** @type {import("@phreshos/core").System} */
  const system = null
  void system?.shell("printf hello")
  `
    )
    execFileSync(process.execPath, [join(consumer, "runtime.mjs")], { stdio: "inherit" })

    writeFileSync(
      join(consumer, "consumer.ts"),
      `import { defaultDesktopScale, defineConfig, desktopPreferencesLimits, isUploadFile, parseDesktopPreferencesUpdate, type Transaction, type ContextMessage, type Config, type Desktop, type DesktopPreferencesSource, type DesktopViewportSource, type FileStat, type Process, type Program, type System, type SystemUploads, type TrafficMessage, type Upload, type Window, type WindowGeometry, type Presentation, type PresentationGeometry, type PresentationTransaction, type WritableAppearance, type WritableContent, type WritableDesktopPreferencesSource, type WritableDesktopViewportSource } from "@phreshos/core"

  const config: Config = defineConfig({
    identity: "package-consumer",
    client: {
      location: "./client"
    }
  })

  declare const program: Program
  declare const process: Process
  declare const system: System
  const forcedProgram: Promise<Program> = system.program.forceCreate("./phresh.config.ts")
  // @ts-expect-error Program creation belongs to the Program capability
  system.forceCreateProgram("./phresh.config.ts")
  type WindowHasSurface = "surface" extends keyof Window ? true : false
  const windowHasSurface: WindowHasSurface = false
  const transaction: Transaction = { duration: 180, easing: "ease-out" }
  const windowTransaction: PresentationTransaction = transaction
  declare const presentation: Presentation
  const presentationLayer = presentation.layer()
  const moveGesture = presentation.beginMoveGesture({ x: 0, y: 0 })
  const geometry: WindowGeometry = {
    x: "0/1",
    y: "0/1",
    width: "1/2",
    height: "1/2"
  }
  const drawing: PresentationGeometry = { x: -360, y: -240, width: 720, height: 480 }
  const drawnSize: Promise<number> = presentation.size().then(size => size.width)
  const stopResize = presentation.subscribe("resize", size => void size.height)
  declare const window: Window
  const setGeometry: Promise<void> = window.setGeometry(geometry)
  const definition = program.definition()
  const outside: ContextMessage<string> = { from: null, payload: "owner-local" }
  const hiddenDestination: TrafficMessage<string> = { to: null, payload: "boundary-local" }
  declare const uploads: SystemUploads
  declare const desktopViewport: DesktopViewportSource
  declare const writableDesktopViewport: WritableDesktopViewportSource
  declare const desktopPreferences: DesktopPreferencesSource
  declare const writableDesktopPreferences: WritableDesktopPreferencesSource
  declare const writableAppearance: WritableAppearance
  declare const desktop: Desktop
  const written: Promise<Upload> = uploads.write("hello")
  const uploadStat: Promise<FileStat | null> = uploads.stat("00000000-0000-0000-0000-000000000000.txt")
  const writable: WritableContent = new Uint16Array([1, 2])
  const uploadsPath: Promise<string> = uploads.path()
  const read: Promise<string> = uploads.text("00000000-0000-0000-0000-000000000000.txt")
  const uploadKey: boolean = isUploadFile("00000000-0000-0000-0000-000000000000.txt")
  const viewportWidth: Promise<number> = desktopViewport.size().then(size => size.width)
  const viewportCenter: Promise<number> = desktopViewport.offset().then(offset => offset.x)
  const moveView: Promise<void> = writableDesktopViewport.move({ x: 1440, y: 0 })
  const processOptions: Readonly<Record<string, string>> = process.options
  const processMode: string | undefined = process.options["mode"]
  const processOpened: string | undefined = process.opened?.uri
  const theme = desktopPreferences.resolve().then(resolved => resolved.theme)
  const chosenTheme = desktopPreferences.snapshot().then(snapshot => snapshot.theme)
  const scale = desktopPreferences.snapshot().then(snapshot => snapshot.scale)
  const updateTheme = writableDesktopPreferences.update({ theme: "browser" })
  const updateScale = writableDesktopPreferences.update({ scale: desktopPreferencesLimits.scale.minimum })
  const resetScale = writableDesktopPreferences.update({ scale: defaultDesktopScale })
  const parsedScale = parseDesktopPreferencesUpdate({ scale: 1.25 })
  const updateAppearance = writableAppearance.update({ colors: { dark: { danger: "#ff0000" } } })
  // @ts-expect-error An Appearance update must request at least one field.
  writableAppearance.update({})
  void config
  void uploadStat
  void writable
  void program.identity
  void definition
  void forcedProgram
  void transaction
  void presentationLayer
  void moveGesture.finished
  void presentation.transactionAndWait(windowTransaction).setSurface(true)
  void presentation.setSurface(false)
  void presentation.setInteractive(false)
  void presentation.setAnchor("plane")
  void presentation.transaction(transaction).setGeometry(drawing)
  void drawnSize
  void stopResize
  void setGeometry
  void updateAppearance
  void outside
  void hiddenDestination
  void written
  void read
  void uploadKey
  void viewportWidth
  void viewportCenter
  void moveView
  void processOptions
  void processMode
  void processOpened
  void desktop.viewport
  void desktop.preferences
  void theme
  void chosenTheme
  void scale
  void updateTheme
  void updateScale
  void resetScale
  void parsedScale
  void defaultDesktopScale
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
}, 120_000)
