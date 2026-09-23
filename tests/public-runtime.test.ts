import { describe, expect, expectTypeOf, it } from "vitest"
import {
  ClientEndpoint,
  Connection,
  ClientService,
  type ClientContext,
  type Desktop,
  type FileStat,
  type Context,
  type Launch,
  type WindowPresentation,
  type WindowPresentationState,
  type Permission,
  type PermissionName,
  type PermissionValue,
  type Process,
  type Program,
  type Storage,
  type ShellEvent,
  type ShellOptions,
  type System,
  type AppearanceTransaction,
  type WindowTransaction,
  type Upload,
  type WritableContent,
  Endpoint,
  ServerEndpoint,
  ServerService,
  Session,
  Service,
  defineConfig,
  isRelativeValue,
  isServiceAddress,
  layers,
  parsePermission,
  parsePermissions,
  parseNetworkScope,
  parseStorageScope,
  describeStorageScope,
  networkScopeCovers,
  parseRelativeValue,
  parseShellEvent,
  parseAuthenticationCredentials,
  parseAuthenticationRequirements,
  parseAuthenticationState
} from "../source/main.js"

describe("public runtime", function () {
  it("defines the current Desktop presentation beside authoritative Window state", function () {
    expectTypeOf<WindowPresentation>().toHaveProperty("setGeometry")
    expectTypeOf<WindowPresentation>().toHaveProperty("minimize")
    expectTypeOf<WindowPresentation>().toHaveProperty("follow")
    expectTypeOf<WindowPresentation>().toHaveProperty("unfollow")
    expectTypeOf<WindowPresentation>().toHaveProperty("raise")
    expectTypeOf<WindowPresentation>().toHaveProperty("transaction")
    expectTypeOf<WindowPresentation>().toHaveProperty("transactionAndWait")
    expectTypeOf<WindowPresentation>().toHaveProperty("subscribe")
    expectTypeOf<WindowPresentation>().toHaveProperty("title")
    expectTypeOf<Extract<WindowPresentationState, { layer: "window" }>>().toHaveProperty("title")
    type UnderHasTitle = "title" extends keyof Extract<WindowPresentationState, { surface: unknown }> ? true : false
    type WallpaperHasPosition = "position" extends keyof Extract<WindowPresentationState, { layer: "wallpaper" }> ? true : false
    const underHasTitle: UnderHasTitle = false
    const wallpaperHasPosition: WallpaperHasPosition = false

    const transaction: AppearanceTransaction = { duration: 180, easing: "ease-out" }
    const selected: WindowTransaction = true
    // @ts-expect-error Surface Material accepts explicit overrides or false, not a default sentinel.
    const invalidSurfaceMaterial: import("../source/main.js").WindowSurface = { material: true }
    void transaction
    void selected
    void underHasTitle
    void wallpaperHasPosition
    void invalidSurfaceMaterial

    type EmptyRejected = {} extends AppearanceTransaction ? false : true
    type FalseAccepted = false extends WindowTransaction ? true : false
    expectTypeOf<EmptyRejected>().toEqualTypeOf<true>()
    expectTypeOf<FalseAccepted>().toEqualTypeOf<true>()
  })

  it("preserves the domain class hierarchy", function () {
    expect(ClientEndpoint.prototype).toBeInstanceOf(Endpoint)
    expect(ServerEndpoint.prototype).toBeInstanceOf(Endpoint)
    expect(ClientService.prototype).toBeInstanceOf(Service)
    expect(ServerService.prototype).toBeInstanceOf(Service)
  })

  it("defines Connection and Session as canonical System domains", function () {
    expectTypeOf<System["authentication"]["connections"]>().returns.resolves.toEqualTypeOf<Connection[]>()
    expectTypeOf<System["authentication"]["sessions"]>().returns.resolves.toEqualTypeOf<Session[]>()
    expectTypeOf<System["authentication"]["connection"]>().returns.resolves.toEqualTypeOf<Connection | null>()
    expectTypeOf<System["authentication"]["session"]>().returns.resolves.toEqualTypeOf<Session | null>()
    expectTypeOf<Connection["session"]>().returns.resolves.toEqualTypeOf<Session | null>()
    expectTypeOf<Connection["signIn"]>().returns.resolves.toEqualTypeOf<Session>()
    expectTypeOf<Session["connections"]>().returns.resolves.toEqualTypeOf<Connection[]>()
    expectTypeOf<Session["signOut"]>().returns.resolves.toEqualTypeOf<void>()
  })

  it("defines public Authentication state separately from immutable requirements", function () {
    expect(parseAuthenticationCredentials({ username: "owner", password: "password", ignored: true })).toEqual({ username: "owner", password: "password" })
    expect(parseAuthenticationState({ username: "owner", ignored: true })).toEqual({ username: "owner" })
    expect(parseAuthenticationState({ username: null })).toEqual({ username: null })
    expect(parseAuthenticationRequirements({
      username: { minimumLength: 1, maximumLength: 64 },
      password: { minimumLength: 8, maximumLength: 1024 }
    })).toEqual({
      username: { minimumLength: 1, maximumLength: 64 },
      password: { minimumLength: 8, maximumLength: 1024 }
    })
  })

  it("keeps Service discovery concrete and address preparation discriminated", function () {
    expectTypeOf<System["service"]["list"]>().returns.resolves.toEqualTypeOf<(ServerService | ClientService)[]>()
    expectTypeOf<System["service"]["search"]>().returns.resolves.toEqualTypeOf<(ServerService | ClientService)[]>()

    void declareServicePreparation
  })

  it("keeps one complete Program and Process contract", function () {
    type Processes = Awaited<ReturnType<Program["processes"]>>
    type Found = Awaited<ReturnType<Program["findProcess"]>>

    expectTypeOf<Processes>().toEqualTypeOf<Process[]>()
    expectTypeOf<Found>().toEqualTypeOf<Process | null>()
    expectTypeOf<Program>().toHaveProperty("assetId")
    expectTypeOf<Program["startup"]["get"]>().returns.toEqualTypeOf<Promise<Launch | null>>()
    expectTypeOf<Program["pinned"]>().returns.toEqualTypeOf<Promise<boolean>>()
    expectTypeOf<Program["pin"]>().returns.toEqualTypeOf<Promise<void>>()
    expectTypeOf<Program["data"]>().toEqualTypeOf<Storage>()
  })

  it("defines shell execution once on the shared System contract", function () {
    type Shell = System["shell"]
    type Options = NonNullable<Parameters<Shell>[1]>
    type Event = Awaited<ReturnType<ReturnType<Shell>["next"]>>["value"]

    expectTypeOf<Options>().toEqualTypeOf<ShellOptions>()
    expectTypeOf<Event>().toEqualTypeOf<ShellEvent | void>()
    expect(parseShellEvent({ event: "output", stream: "stdout", text: "hello" })).toEqual({ event: "output", stream: "stdout", text: "hello" })
    expect(() => parseShellEvent({ event: "started", pid: 0 })).toThrow(/invalid shell event/)
  })

  it("exposes the System uploads directory through the shared contract", function () {
    expectTypeOf<System["uploads"]["path"]>().returns.toEqualTypeOf<Promise<string>>()
    expectTypeOf<System["uploads"]["stat"]>().returns.toEqualTypeOf<Promise<FileStat | null>>()
    expectTypeOf<Parameters<System["uploads"]["write"]>>().toEqualTypeOf<[value: WritableContent]>()
    expectTypeOf<Upload>().toHaveProperty("file")
    expectTypeOf<Upload>().toHaveProperty("size")
    expectTypeOf<Upload>().toHaveProperty("modifiedAt")
    expectTypeOf<Upload>().not.toHaveProperty("type")
  })

  it("shares Endpoint launch contracts across Process creation and restart", function () {
    const launch: Launch = {
      server: { service: true },
      client: { service: true }
    }
    type ClientLaunchHasService = "service" extends keyof NonNullable<Parameters<ClientEndpoint["start"]>[0]> ? true : false
    type ServerLaunchHasService = "service" extends keyof NonNullable<Parameters<ServerEndpoint["start"]>[0]> ? true : false

    expect(launch.server).toEqual({ service: true })
    expectTypeOf<ClientLaunchHasService>().toEqualTypeOf<true>()
    expectTypeOf<ServerLaunchHasService>().toEqualTypeOf<true>()
    expectTypeOf<Context>().toHaveProperty("isService")
    expectTypeOf<Endpoint>().toHaveProperty("isService")
    expectTypeOf<Endpoint>().not.toHaveProperty("service")
    expectTypeOf<Endpoint>().toHaveProperty("lifecycle")
    expectTypeOf<Endpoint>().toHaveProperty("running")
    expectTypeOf<Endpoint>().not.toHaveProperty("exists")
    expectTypeOf<Service>().toHaveProperty("lifecycle")
    expectTypeOf<Service>().toHaveProperty("available")
    expectTypeOf<Endpoint>().toHaveProperty("waitReady")
    expectTypeOf<Service>().toHaveProperty("waitReady")
    expectTypeOf<Service>().toHaveProperty("publish")
    expectTypeOf<ClientService>().toHaveProperty("waitReady")
    expectTypeOf<ServerService>().toHaveProperty("waitReady")
    expectTypeOf<Service>().not.toHaveProperty("channel")

    const launchCannotSupplyPermissions: Launch = {
      client: {
        // @ts-expect-error Process launches cannot override Program permissions.
        permissions: { all: true }
      }
    }
    void launchCannotSupplyPermissions
  })

  it("keeps the finite public registries narrow", function () {
    expect(layers).toEqual(["wallpaper", "under", "window", "over", "shell"])
  })

  it("separates the Client context, Desktop, and global System contracts", function () {
    expectTypeOf<ClientContext>().toHaveProperty("window")
    expectTypeOf<ClientContext>().toHaveProperty("presentation")
    expectTypeOf<ClientContext>().toHaveProperty("server")
    expectTypeOf<ClientContext>().toHaveProperty("permissions")
    expectTypeOf<Desktop>().toHaveProperty("viewport")
    expectTypeOf<Desktop>().toHaveProperty("preferences")
    expectTypeOf<Desktop["connection"]>().returns.resolves.toEqualTypeOf<Connection>()
    expectTypeOf<Desktop>().not.toHaveProperty("pointer")
    expectTypeOf<System["network"]["fetch"]>().returns.toEqualTypeOf<Promise<Response>>()
    expectTypeOf<System["network"]["websocket"]>().returns.toEqualTypeOf<Promise<WebSocket>>()
  })

  it("keeps permission values canonical after input resolution", function () {
    expectTypeOf<PermissionName>().toEqualTypeOf<"all" | "services" | "programs" | "layers" | "network" | "storage" | "uploads" | "appearance" | "desktopPreferences" | "desktopConnection" | "authentication">()
    expectTypeOf<PermissionValue<"all">>().toEqualTypeOf<never>()
    expectTypeOf<PermissionValue<"programs">>().toEqualTypeOf<string>()
    expectTypeOf<PermissionValue<"layers">>().toEqualTypeOf<"under" | "over" | "wallpaper" | "shell">()
    expectTypeOf<PermissionValue<"network">>().toEqualTypeOf<string>()
    expectTypeOf<PermissionValue<"storage">>().toEqualTypeOf<string>()
    expectTypeOf<Permission>().toEqualTypeOf<readonly string[] | false | null>()
    expectTypeOf<ClientContext["permissions"]["request"]>().returns.toEqualTypeOf<Promise<Permission>>()
    expectTypeOf<Program>().toHaveProperty("permissions")
    expect(parsePermission("all", [])).toEqual([])
    expect(parsePermission("services", ["flambo", "terminal", "flambo"])).toEqual(["flambo", "terminal"])
    expect(parsePermission("programs", [])).toEqual([])
    expect(parsePermission("network", ["HTTPS://API.Example.com:443/v1/**", "http://localhost:*"])).toEqual([
      "https://api.example.com/v1/**",
      "http://localhost:*"
    ])
    expect(parsePermission("storage", ["delete,read:Documents/**", "Downloads/report.json"])).toEqual([
      "read,delete:Documents/**",
      "Downloads/report.json"
    ])
    expect(parsePermission("uploads", [])).toEqual([])
    expect(parsePermission("appearance", [])).toEqual([])
    expect(parsePermission("desktopPreferences", [])).toEqual([])
    expect(parsePermission("authentication", [])).toEqual([])
    expect(parsePermission("desktopConnection", [])).toEqual([])
    expect(parsePermission("all", false)).toBe(false)
    expect(parsePermission("all", null)).toBeNull()
    expect(parsePermissions({ all: null })).toEqual({ all: null })
    expect(() => parsePermission("all", true)).toThrow(/invalid "all" permission/)
    expect(() => parsePermission("programs", ["Not an identity"])).toThrow(/invalid "programs" permission/)
    expect(() => parsePermission("network", ["api.example.com"])).toThrow(/invalid "network" permission/)
    expect(() => parsePermission("files" as never, [])).toThrow(/does not know the permission/)
    expect(parsePermissions({ files: [] })).toEqual({})
  })

  it("defines operation-aware native Storage scopes", function () {
    expect(parseStorageScope("Documents/report.txt")).toBe("Documents/report.txt")
    expect(parseStorageScope("delete,read:Documents/**")).toBe("read,delete:Documents/**")
    expect(parseStorageScope("delete,write,read:/var/shared/**")).toBe("/var/shared/**")
    expect(describeStorageScope("read,delete:Documents/**")).toEqual({
      operations: ["read", "delete"],
      path: "Documents",
      recursive: true
    })
    expect(() => parseStorageScope("all:Documents")).toThrow(/bare storage path/)
    expect(() => parseStorageScope("all,read:Documents")).toThrow(/bare storage path/)
    expect(() => parseStorageScope("read:Documents/**/private")).toThrow(/final/)
  })

  it("defines deterministic hierarchical network scopes", function () {
    expect(parseNetworkScope("HTTPS://API.Example.com:443")).toBe("https://api.example.com")
    expect(parseNetworkScope("https://api.example.com/v1/../v2/**?ignored=true")).toBe("https://api.example.com/v2/**")
    expect(parseNetworkScope("http://localhost:*")).toBe("http://localhost:*")
    expect(networkScopeCovers("https://api.example.com", "https://api.example.com/v1/users")).toBe(true)
    expect(networkScopeCovers("https://*.example.com", "https://api.eu.example.com/v1")).toBe(true)
    expect(networkScopeCovers("https://*.example.com", "https://example.com/v1")).toBe(false)
    expect(networkScopeCovers("https://api.example.com/v1/**", "https://api.example.com/v1/users")).toBe(true)
    expect(networkScopeCovers("https://api.example.com/v1/**", "https://api.example.com/v10/users")).toBe(false)
    expect(networkScopeCovers("http://localhost:*", "http://localhost:5200/events")).toBe(true)
    expect(networkScopeCovers("https://api.example.com", "wss://api.example.com/socket")).toBe(false)
    expect(() => parseNetworkScope("https://exa*mple.com")).toThrow(/wildcard/)
    expect(() => parseNetworkScope("https://*.*.example.com")).toThrow(/wildcard/)
    expect(() => parseNetworkScope("https://example.com/v*/users")).toThrow(/wildcard/)
  })

  it("returns the exact authored Program configuration", function () {
    const config = {
      identity: "public-contract",
      agent: "./agent-guide.md",
      permissions: { all: true },
      client: { location: "./client" }
    } as const

    expect(defineConfig(config)).toBe(config)
    expect(config.agent).toBe("./agent-guide.md")
    expect(config.permissions.all).toBe(true)

    defineConfig({
      identity: "selected-permissions",
      permissions: {
        services: ["flambo"],
        programs: true,
        network: ["https://api.example.com/v1/**"],
        storage: ["read:Documents/**"],
        uploads: true,
        appearance: [],
        desktopPreferences: true,
        desktopConnection: true,
        authentication: true
      },
      client: { location: "./client" }
    })

    defineConfig({
      identity: "unknown-permission",
      permissions: {
        // @ts-expect-error Permission declarations accept only Core catalog names.
        files: true
      },
      client: { location: "./client" }
    })

    defineConfig({
      identity: "unknown-permission-value",
      permissions: {
        // @ts-expect-error The value-less all permission accepts no string values.
        all: ["read"]
      },
      client: { location: "./client" }
    })
  })

  it("requires exactly one Server execution declaration", function () {
    const worker = defineConfig({
      identity: "worker-contract",
      server: { location: "./server", worker: "main.js" }
    })

    expect(worker.server?.worker).toBe("main.js")

    // @ts-expect-error A Server cannot declare two execution modes.
    const both = defineConfig({ identity: "both-contract", server: { location: "./server", command: "node main.js", worker: "main.js" } })

    // @ts-expect-error A Server must declare one execution mode.
    const neither = defineConfig({ identity: "neither-contract", server: { location: "./server" } })

    void both
    void neither
  })

  it("recognizes only complete public Service addresses", function () {
    expect(isServiceAddress({ program: "counter", process: "main", endpoint: "server" })).toBe(true)
    expect(isServiceAddress({ process: "1f4b222c-25d7-4ba8-85e5-d5e59cfe0928", endpoint: "server" })).toBe(false)
    expect(isServiceAddress({ process: "main", endpoint: "server" })).toBe(false)
    expect(isServiceAddress({ program: "Not An Identity", process: "main", endpoint: "server" })).toBe(false)
    expect(isServiceAddress({ program: "counter", process: "main", endpoint: "process" })).toBe(false)
    expect(isServiceAddress({ program: "counter", process: "", endpoint: "client" })).toBe(false)
  })

  it("accepts only finite linear geometry", function () {
    expect(parseRelativeValue("50% + 20 * 2")).toEqual({ relative: 0.5, pixels: 40 })
    expect(parseRelativeValue("1/3 - 4")).toEqual({ relative: 1 / 3, pixels: -4 })
    expect(isRelativeValue(Number.POSITIVE_INFINITY)).toBe(false)
    expect(isRelativeValue("calc(100% - 4px)")).toBe(false)
  })
})

function declareServicePreparation(system: System) {
  const server: ServerService = system.service.prepare({ program: "notes", process: "main", endpoint: "server" })
  const client: ClientService = system.service.prepare({ program: "notes", process: "main", endpoint: "client" })
  void server
  void client
}
