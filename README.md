# `@phreshos/core`

Environment-neutral contracts and domain objects for PhreshOS Programs. Core
is the common language shared by the Client, Server, React, CLI, and system
repositories; it contains no transport, persistence, or interface
implementation of its own.

## Installation

```sh
bun add @phreshos/core
```

Import exclusively through the package's public root:

```ts
import { defineConfig, type Program } from "@phreshos/core"
```

The package exposes built JavaScript and declaration files as its only public
code. Its TypeScript source is repository material, not a runtime dependency
or a public import path.

## Package status

This package is one component of a larger architecture currently under active
testing. The `0.x` line may change as its contracts and integrations are
verified.

`@phreshos/core` is not intended to be used on its own. It defines the shared
contracts consumed by the environment SDKs, but does not provide a runtime
implementation by itself.

## Mental model

Programs use Core directly for `defineConfig()` and shared types. At runtime,
the Client and Server SDKs provide the real `Program`, `Process`, `Server`, and
`Client` handles backed by their environment boundaries. Core gives those
environments one vocabulary and stable runtime identity without implementing
their transport, storage, authority, or presentation.

## Uploads

`SystemUploads` describes one flat, System-owned public upload collection.
`write()` creates an opaque generated file key. `stream()`, `bytes()`,
`text()`, `json()`, and `stat()` accept exactly that one key—never filesystem
paths or path segments. The contract deliberately exposes no listing, deletion,
or clearing operation.

## System lifecycle

The shared `System` contract separates runtime identity from authoring modes.
`forceCreateProgram()` validates a concrete description, forgets any current
runtime Program with that identity, and creates one new uninstalled Program
without deleting installed files or storage. Development and production are
composed by environment SDKs rather than encoded as System operations.

`program.process.run(launch, { signal })` creates one Process whose lifetime is
owned by its asynchronous iterator. It yields ordered `started`, `output`, and
`exited` events; cancellation or early iterator return exits the Process.
`program.process.create()` remains the independent alternative. A Client
location may be a filesystem path or HTTP(S) URL at runtime; installation may
reject a URL because there are no Client files to install.

## Permission names

Core owns the finite, system-wide permission registry. `permissionNames` is
its runtime value, `PermissionName` is the corresponding SDK type, and
`isPermissionName()` validates values arriving from untyped boundaries. Client
and Server SDK permission methods accept only this type, so Programs cannot
create private permission strings that the system does not understand.

The current registry contains `pointer`. Persistent snapshots use
`PermissionDecisions`, a partial map, since an absent permission simply has no
stored decision.

## Appearance and Desktop preferences

`Appearance` is the complete unresolved visual state owned by the System.
Every property is a `ThemedValue`: shared properties contain only `light`, while
properties that support an independent dark value contain required `light` and
`dark` branches of the same value type. Core's concrete `Appearance` contract
therefore decides where a dark branch is legal; `undefined` is never state.

`standardAppearance` is the complete reusable default and
`appearanceLimits` contains the accepted numeric bounds. The authoritative
System validates and persists these values. SDKs carry the complete contract
without maintaining shadow schemas. `AppearanceSource` exposes explicit
snapshots and live-only `change` events; `WritableAppearance` adds replacement
authority for Server environments.

`DesktopPreferences` is local to one Desktop. Its snapshot always contains the
effective `theme` and `animations` values. Updates may use `"default"` to
resume following the native environment. Appearance remains unresolved until
a consumer has the effective Theme and needs one particular value. React UI
owns that resolution and any semantic levels derived from concrete Appearance
values.

`Colorable`, `Sizable`, `Shapeable`, `Variantable`, and `Elevatable` are
independent element capabilities whose concrete value vocabularies are defined
separately. An element composes only the capabilities it actually supports.

These contracts contain no React types, component names, presentation levels,
or mutable implementation. Environment and interface SDKs implement the
neutral Appearance and Desktop-preferences contracts in their own domains.

## Messaging primitives

`Subscribable` is the independent receiving capability, providing the
contracts for `subscribe()`, `waitFor()`, and `events()`.
`Publishable` independently provides `publish()`. `Askable` extends
`Publishable` with `ask()`, since every target that can be asked can also be
published to. Both operations accept a single payload, which is `undefined`
when omitted. A type may implement or compose only the capabilities it needs —
the ability to publish does not imply the ability to subscribe.

The contracts specify a ten-second default SDK deadline for finite asynchronous
operations. `Askable.timeout()` creates an immutable deadline view scoped to
`ask()`; `waitFor()` and `waitReady()` accept a deadline directly. `events()`
is specified as a long-lived iterator with a queue capacity of `64` by default,
while `Infinity` removes that bound. A single ask deadline covers both waiting
for its current Server incarnation to become ready and waiting for the eventual
answer. Environment SDKs implement these guarantees.

Every persistent registration returns its own cleanup function:

```ts
const stop = target.subscribe("event", handler)
stop()
```

There is no separate `unsubscribe()` method and no one-time subscription
operation. Question and answer subscriptions follow the same returned-cleanup
convention.

```ts
import type { Subscribable } from "@phreshos/core"

type Events = {
  exit: {
    status: string
    code: number
  }
}

declare const target: Subscribable<Events>

target.subscribe("exit", message => {
  message.status
  message.code
})

target.subscribe(capture => {
  if (capture.event === "exit") capture.message.code
})
```

Known messages are inferred from the target. An explicit generic or callback
annotation may narrow that message further, but an incompatible replacement is
a type error. Calling `subscribe()` with only a callback follows every event
and receives a correlated `Capture` containing `event` and `message`.

An unparameterized Endpoint, Context, Service, or traffic surface accepts
application-defined event names with an `unknown` payload. Supplying an event
map narrows both the names and their payloads, and names outside that map are
then rejected. `events("name")` iterates one named event, while `events()`
iterates every event as the same correlated captures supplied to an all-event
subscription.

## Endpoints, Context, and traffic

`Endpoint` is the shared base of `Server` and `Client`. It functions as both
an address and a source: `endpoint.publish()` sends directly to it, while
`endpoint.subscribe()` follows destinationless events emitted by it. `Server`
additionally composes `Askable`.

The environment SDK's `context` is the executing Endpoint's inward boundary.
Subscriptions receive events explicitly addressed to it, delivered as a
`ContextMessage` containing the sender as `Endpoint | null`. `null` means the
request came from a trusted boundary outside Program Endpoints, such as the
owner-local System gateway; no fake Endpoint is invented. `context.publish()`
emits outward from that executing Endpoint without naming a destination.

Directed inspection remains deliberately separate, exposed as
`endpoint.traffic`. Because the Endpoint handle already identifies the source,
ordinary traffic messages contain only the destination and payload; Context
emissions never enter this surface. Every traffic surface exposes
`subscribeAsks()` and `asks()`, since either Endpoint kind may originate a
question. A Server's traffic additionally exposes `subscribeAnswers()` and
`answers()`, since only a Server can originate an answer. These captures
include their event, correlation ID, destination, and question payload or
answer `Outcome`.

Every Endpoint exposes `exists()`, `start()`, and `stop()`. Endpoint lifecycle
is available directly through `endpoint.lifecycle` as `start` and `stop`.
Broader Process, Program, and Server Host scopes retain `endpointStart` and
`endpointStop`, whose payload is the same canonical `Server | Client` handle.
Neither lifecycle surface carries process-exit details, and Endpoint root
subscriptions remain exclusively application events emitted by that Endpoint.

`Server` and `Client` are public, logic-free Endpoint specializations. Server
adds request-response `ask()` and answer-traffic inspection. Client owns two
permanent, synchronous capability objects: `traffic` for communication and
`window` for presentation. Accessing either object performs no operation and
receives no data — their methods and subscriptions are the explicit
operations.

## Ownership hierarchy

`Program` and `Process` complete the ownership hierarchy. `Program`,
`Process`, `Endpoint`, `Server`, and `Client` are real runtime classes,
usable for identity and `instanceof` checks. Their capability properties are
interfaces: `client.traffic` and `client.window`, in particular, have no
runtime class identity of their own. Core domain constructors are protected —
environment SDKs supply the authoritative handles backed by their respective
boundaries while reusing these exact Core constructors.

Core also owns the common launch, geometry, lifecycle-message, `ContextMessage`,
`ContextCapture`, `TrafficMessage`, and `TrafficCapture` types used by both
environments.

`ProgramCommandChunk` is the shared shape of one ordered lifecycle-command
output value. It preserves whether the text came from `stdout` or `stderr`;
environment SDKs decide which Program handles may initiate installation or
uninstallation.

## Window placement

Window placement uses `under`, `window`, and `over` everywhere. Wallpaper is
Desktop appearance, not a Program Window layer. `Window` has no identity or
lifecycle apart from its Client; its stable capability addresses the Client's current, live
presentation state and rejects reads or mutations while that Client is
absent.

`LaunchClient.title` supplies a dynamic initial title when starting a declared
Client. The system resolves it with the remaining launch shape before the
Client is announced, so the first rendered Window already has its final title.
Omission uses the Program declaration; `window.changeTitle()` remains the live
operation after startup. Window operations are never queued while the Client
is absent.

## Local representation

`Window` is the authoritative, subscribable presentation state shared through
the system. `LocalWindow` describes one Client Window's physical representation
on the current desktop. Its reads and commands are deliberately eventless and
never change or publish authoritative state. Client SDKs may attach this
capability to their Window handles; Server SDKs must not. A desktop projects
authoritative changes onto an ordinary `window` layer, while `under` and `over`
representations receive their initial truth and control their local projection
thereafter.

The host-rendered Surface belonging to one live `under` or `over`
representation exposes only presence. `set(transition)` makes it visible and
`remove(transition)` removes it after the requested exit. Programs cannot
configure its material, opacity, or radius.

Both operations require a `VisibilityTransition`. It has the same timing
grammar as a local geometry `Transaction`: a duration in milliseconds, an
easing, or both. `{}` and `{ wait: true }` are not transitions. `wait: true`
makes the command settle when the visual transition finishes, while omission
or `false` settles when the desktop accepts it.

## Window geometry

Window geometry follows one public grammar. A `Value` is either a finite
pixel number or a linear relative expression such as `"1/2"`, `"50% + 10"`, or
`"30% + 20 * 2"`. `isRelativeValue()` validates that grammar, and
`parseRelativeValue()` reduces it to a single relative coefficient and pixel
offset. The CLI, runtime validation, and desktop layout all consume this one
Core definition rather than maintaining separate parsers.

`move()` and `resize()` change one dimension of authoritative geometry.
`setGeometry({ position, size })` validates and commits both dimensions as one
operation, then emits one `geometry` event. Compound interactions such as
resizing from a top or left edge and snapping must use this atomic form so a
remote representation never observes a new position with the previous size.
`move` and `resize` subscribers are also notified after the complete geometry
has committed; those component notifications never represent partial
authoritative state.

## Process parentage

Programs own creation through `program.process`. `create()` always requests a
new Process. `findOrCreate()` requires a Program-local name and atomically
converges equivalent concurrent launches on one Process. If that name already
belongs to a Process created with a different normalized launch, the operation
rejects rather than mutating or replacing it. The authority compares immutable
launch intent, never later endpoint or Window state.

Process parentage belongs to `Process`, not to contextual SDK state. Each
live Process retains only a handle to its immediate parent. `process.parent()`
returns `null` when no accessible parent handle exists, and does not preserve
historical lineage: calling it through an exited Process handle, or after the
retained parent has disappeared, rejects outright, since the represented
Process no longer exists. `context.parent()` flattens this operation
contextually but does not itself own the relationship.

Client traversal is structurally confined to its current Program. A
cross-Program parent handle is never supplied to the Client, so traversal
stops at `null`. A fabricated or otherwise unauthorized Process handle is
indistinguishable from a nonexistent Process, and every operation performed
through it rejects accordingly.

## Program configuration

Core is also the single source of truth for the authoring contract consumed
by the CLI. `defineConfig()` provides contextual typing for
`phresh.config.ts` and returns the description unchanged:

```ts
import { defineConfig } from "@phreshos/core"

export default defineConfig({
  identity: "my-program",
  icon: "./icon.png",
  agent: "./agent.md",
  categories: ["Development"],
  keywords: ["example"],
  website: "https://example.com/my-program",
  server: {
    location: "./dist/server",
    installCommand: "npm install --omit=dev",
    uninstallCommand: "npm run clean:external",
    startCommand: "node main.js",
    development: {
      startCommand: "node --watch --import tsx source/server/main.ts"
    }
  },
  client: {
    location: "./dist/client",
    development: {
      url: "http://localhost:5173/",
      startCommand: "npm run dev"
    }
  }
})
```

The declaration must include a Server, a Client, or both. Development
settings remain authoring metadata; the CLI derives the appropriate runtime
description for each mode. A Server selects exactly one execution mode:
`startCommand` starts an isolated operating-system process tree, while
`entryFile` loads a JavaScript module as a Worker owned by the System. The
same exclusive choice applies to `server.development`, which may deliberately
select a different mode from production. Worker modules resolve their own
resources through module URLs or SDK storage; they do not receive an
independent process working directory and are not a security boundary.

The optional `icon` field names a single PNG
source — packaging and installation normalize it to `icon.png`, while hosting
derives the system's fixed presentation sizes.

The optional root `categories`, `keywords`, and `website` fields describe a
published Program without introducing a second metadata object. They do not
affect execution. A Server may declare matching lifecycle commands:
`installCommand` prepares external resources and `uninstallCommand` removes
them before the installed Server directory is deleted.

The optional top-level `agent` field names one Markdown document containing
Program-specific knowledge an agent cannot discover from the shared PhreshOS
contracts. Packaging installs it canonically as `agent.md`.
`program.hasAgent` reports its availability without loading it, and
`await program.agent()` reads it. The document remains independent of any one
agent implementation and does not explain generic Process, Endpoint, or tool
mechanics.

Services are independent runtime bindings. A running Endpoint may explicitly
expose itself with `context.enableService(name)` without declaring or
shipping documentation through the Program contract.
Application events are subscribed to directly on the stable Service handle;
a Server Service can also be published to or asked directly.
`service.lifecycle` is the separate subscribable namespace for `enable` and
`disable`, while `enabled()` and `waitReady()` remain root Service operations.

Every Program also exposes its guaranteed icon without revealing hosting or
filesystem details:

```ts
const icon = await program.icon()          // medium PNG Blob
const large = await program.icon("large")  // small, medium, or large
```

This method always returns an `image/png` `Blob`. When no icon has been
authored, the system returns its default through the same operation.

## Program-owned resources

Every Program exposes the same storage contracts in both environments:
filesystem-like `data` and `cache`, a key-value `store`, read-only SQL `logs`,
and a writable SQLite `database`. Both filesystem properties implement the
general `Storage` contract. Every operation remains inside its configured
directory; `clear()` empties that directory, while `clear(...path)` empties and
preserves one contained directory. File reads, writes, and deletion require at
least one path segment; root metadata, listing, and clearing accept no path.
The Server SDK refines `Storage` with
`path()` and safe `resolve()` access; these host filesystem paths are
structurally absent from the Client SDK.

## License

Licensed under the [MIT License](LICENSE). Copyright © 2026 Zohayr SLILEH.
