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

## Permission names

Core owns the finite, system-wide permission registry. `permissionNames` is
its runtime value, `PermissionName` is the corresponding SDK type, and
`isPermissionName()` validates values arriving from untyped boundaries. Client
and Server SDK permission methods accept only this type, so Programs cannot
create private permission strings that the system does not understand.

The current registry contains `pointer`. Persistent snapshots use
`PermissionDecisions`, a partial map, since an absent permission simply has no
stored decision.

## Theme lifecycle

Core defines both `ThemeProperties` and the read-only `Theme` contract without
any knowledge of how a given interface renders them. `snapshot()` is an
explicit, asynchronous read of one complete, immutable value. `Theme` extends
the ordinary `Subscribable` capability with a `change` event; it has no
dedicated subscription shape of its own.

Theme properties are expressed as concrete default values. `themeLimits`
declares the system-owned customization bounds for spacing, corner radius, and
glass-material properties; implementing authorities validate replacements
against those bounds. Core defines one fixed numeric scale around any explicit
number and one fixed color scale around any explicit CSS color — it does not
prescribe which value an interface ultimately chooses to derive. Background,
foreground, and accent are independent CSS color sources, with standard values
of `#edf8fc`, `#183447`, and `#4c9cff` — the established pale surface, primary
ink, and original system blue, respectively. Core stores only those source
colors, never their derived treatments. The declared glass-opacity range ends
at `0.3`.

`standardTheme` is the single, complete initial value shared by every
environment; the running system remains the authority for its current value.
`createThemeSnapshot()` copies and freezes a complete replacement at the
contract boundary; validation remains the implementing authority's
responsibility.

Derived variants are calculations, not persisted `Theme` state. `numericScale()`
produces `xsmall`, `small`, `medium`, `large`, and `xlarge`, preserving the
supplied value exactly at `medium`. `color()` produces `subtle`, `soft`, `base`,
`strong`, and `intense`, preserving the supplied color exactly at `base`.

`subscribe("change", listener)` delivers only complete replacements published
after that registration exists. It never supplies an initial snapshot and
never replays a change published earlier; Programs request the current
snapshot explicitly when they need one. `WritableTheme` adds asynchronous
authority to replace the value — a read-only environment exposes `Theme`,
while an authorized environment may expose `WritableTheme` without altering
the shared lifecycle.

`Colorable`, `Sizable`, `Shapeable`, `Variantable`, and `Elevatable` are
independent element capabilities whose concrete value vocabularies are defined
separately. An element composes only the capabilities it actually supports.

These contracts contain no React types, component names, or runtime `Theme`
authority. Environment and interface SDKs build those concerns on top of the
same neutral lifecycle and derivations.

## Messaging primitives

`Subscribable` is the independent receiving capability, providing the
contracts for `subscribe()`, `waitFor()`, `events()`, and `observe()`.
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

There are no separate `unsubscribe()` or `unobserve()` methods, and no
one-time subscription operation. Observation APIs such as `observeAsks()` and
`observeAnswers()` follow the same returned-cleanup convention.

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
```

Known messages are inferred from the target. An explicit generic or callback
annotation may narrow that message further, but an incompatible replacement is
a type error. `observe()` receives a `Capture` containing only the facts
guaranteed by every `Subscribable`: `event` and `message`. It makes no
assumption about a sender or destination.

An unparameterized Endpoint, Channel, or traffic surface accepts
application-defined event names with an `unknown` payload. Supplying an event
map narrows both the names and their payloads, and names outside that map are
then rejected. `events()` applies the same message inference and narrowing
rules, exposing a named event as an `AsyncIterableIterator`.

## Endpoints, Channels, and traffic

`Endpoint` is the shared base of `Server` and `Client`. It functions as both
an address and a source: `endpoint.publish()` sends directly to it, while
`endpoint.subscribe()` and `endpoint.observe()` follow destinationless events
emitted by it. `Server` additionally composes `Askable`.

The contextual `Channel` is the executing Endpoint's inward boundary.
Subscriptions receive events explicitly addressed to it, delivered as a
`ChannelMessage` containing the otherwise unknown sender. `channel.publish()`
emits outward from that executing Endpoint without naming a destination.

Directed inspection remains deliberately separate, exposed as
`endpoint.traffic`. Because the Endpoint handle already identifies the source,
ordinary traffic messages contain only the destination and payload; Channel
emissions never enter this surface. Every traffic surface exposes
`observeAsks()`, since either Endpoint kind may originate a question. A
Server's traffic additionally exposes `observeAnswers()`, since only a Server
can originate an answer. These captures include their event, correlation ID,
destination, and question payload or answer `Outcome`.

Every Endpoint exposes `exists()`, `start()`, and `stop()`. Endpoint lifecycle
is observed through `endpointStart` and `endpointStop` at Process, Program,
and Server Host scope. A start delivers the permanent `Server | Client`
handle; a stop delivers that same permanent handle directly. Every scope
receives the same canonical Endpoint instance, allowing comparison by
identity. Neither lifecycle event wraps the Endpoint or carries process-exit
details, and Endpoint subscriptions themselves carry only application events
emitted by that Endpoint.

`Server` and `Client` are public, logic-free Endpoint specializations. Server
adds request-response `ask()` and answer-traffic observation. Client owns two
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

Core also owns the common launch, geometry, lifecycle-message, `ChannelMessage`,
`ChannelCapture`, `TrafficMessage`, and `TrafficCapture` types used by both
environments.

## Window placement

Window placement is expressed through two deliberately separate contracts.
Authoring `Layer` contains only `under`, `window`, and `over`, so that
Program declarations and Client launch overrides cannot request system-owned
placement. Runtime `WindowLayer` adds `wallpaper`, allowing `window.layer()`
to report the truth for a wallpaper Window without making that layer
constructible from Program code. `Window` has no identity or lifecycle apart
from its Client; its stable capability addresses the Client's current, live
presentation state and rejects reads or mutations while that Client is
absent.

`LaunchClient.title` supplies a dynamic initial title when starting a declared
Client. The system resolves it with the remaining launch shape before the
Client is announced, so the first rendered Window already has its final title.
Omission uses the Program declaration; `window.changeTitle()` remains the live
operation after startup. Window operations are never queued while the Client
is absent.

Core also defines the independent, environment-neutral `FileWallpaper` and
`DesktopWallpaper` contracts. The desktop variant additionally accepts a
Program and the deliberately narrow `WallpaperLaunch`, containing only `name`,
`server`, the Client's initial `location`, and immutable Process `options`.
These contracts describe capability and data shape only — they contain no
persistence, upload, Process creation, or rendering implementation.

## Client Surface values

`ClientSurfaceSettings` describes optional host-rendered material requested by
one live Client representation. It is a value contract, not Window state and
not server authority. Calling the Client capability without settings creates a
sharp, fully opaque Surface. Settings may select opacity from zero to one, a
nonnegative pixel radius, a scale level, or `"full"`, and an optional
transaction containing a duration from zero through 60,000 milliseconds and a
stable named or cubic Bézier easing. Zero opacity
retains the Surface node; the Client capability's separate `remove()` command
removes it immediately. The receiving desktop validates settings and animates
from the rendered values to each new target.

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

Process parentage belongs to `Process`, not to contextual SDK state. Each
live Process retains only a handle to its immediate parent. `process.parent()`
returns `null` when no accessible parent handle exists, and does not preserve
historical lineage: calling it through an exited Process handle, or after the
retained parent has disappeared, rejects outright, since the represented
Process no longer exists. `current.parent()` flattens this operation
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
  server: {
    location: "./dist/server",
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
description for each mode. The optional `icon` field names a single PNG
source — packaging and installation normalize it to `icon.png`, while hosting
derives the system's fixed presentation sizes.

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
and a writable SQLite `database`. The Server SDK refines its filesystem areas
with `path()` and safe `resolve()` access; these host filesystem paths are
structurally absent from the Client SDK.

## License

Licensed under the [MIT License](LICENSE). Copyright © 2026 Zohayr SLILEH.
