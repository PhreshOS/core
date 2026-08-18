# `@phreshos/core`

Environment-neutral contracts and domain objects for PhreshOS Programs. Core
is the common language used by the Client, Server, React, CLI, and system
repositories; it contains no transport, persistence, or interface
implementation.

## Install

```sh
bun add @phreshos/core
```

Import only through the package's public root:

```ts
import { defineConfig, type Program } from "@phreshos/core"
```

The published package contains built JavaScript and declaration files. Its
TypeScript source is repository material, not a runtime dependency or public
import path.

## Package status

This package is one component of a larger architecture under active testing.
The `0.x` line may change as its contracts and integrations are verified.

`@phreshos/core` is not intended to be used on its own. It defines the shared
contracts consumed by the environment SDKs and does not provide a runtime
implementation by itself.

## Permission names

Core owns the finite system-wide permission registry. `permissionNames` is its
runtime value, `PermissionName` is the corresponding SDK type, and
`isPermissionName()` validates values arriving from untyped boundaries. Client
and Server SDK permission methods accept only this type; Programs cannot create
private permission strings that the system does not understand.

The current registry contains `pointer`. Persistent snapshots use
`PermissionDecisions`, a partial map because an absent permission has no stored
decision.

## Theme lifecycle

Core defines both `ThemeProperties` and the read-only `Theme` contract without
knowing how any interface renders them. `snapshot()` is an explicit asynchronous
read of one complete immutable value. Theme extends the ordinary `Subscribable`
capability with a `change` event; it has no dedicated subscription shape.

Theme properties are concrete default values. Spacing, corner radius, and glass
material properties each have system-owned customization bounds. Core defines
one fixed numeric scale around any explicit number and one fixed color scale
around any explicit CSS color; it does not decide which value an interface
chooses to derive. Background, foreground, and accent are independent non-empty
CSS colors. Their standards are `#edf8fc`, `#183447`, and `#4c9cff`: the
established pale surface, primary ink, and original system blue. Core stores
only those source colors, never their nearby treatments. Glass opacity cannot
exceed `0.3`.
`standardTheme` is the one complete initial value shared by every environment;
the running system remains the authority for its current value.
`createThemeSnapshot()` is the single helper used by environment adapters to
copy and freeze a complete replacement at the contract boundary.

Derived variants are calculations, not persisted Theme state. `numericScale()`
produces `xsmall`, `small`, `medium`, `large`, and `xlarge`, preserving the
supplied value exactly at `medium`. `color()` produces `subtle`, `soft`, `base`,
`strong`, and `intense`, preserving the supplied color exactly at `base`.

`subscribe("change", listener)` passes only complete replacements published
after that registration exists. It never supplies an initial snapshot and never
replays a change published earlier. Programs request the current snapshot when
they need one. `WritableTheme` adds asynchronous authority to replace the value;
a read-only environment exposes `Theme`, while an authorized environment may
expose `WritableTheme` without changing the shared lifecycle.

`Colorable`, `Sizable`, `Shapeable`, `Variantable`, and `Elevatable` are
independent element capabilities whose concrete value vocabularies will be
defined separately. An element composes only the capabilities it supports.

These contracts contain no React types, component names, or runtime Theme
authority. Environment and interface SDKs build those concerns on top of the
same neutral lifecycle and derivations.

`Subscribable` is the independent receiving capability. It provides the
contracts for `subscribe()`, `waitFor()`, `events()`, and `observe()`.
`Publishable` independently provides `publish()`. `Askable` extends
`Publishable` with `ask()`, because every target that can be asked can also be
published to. Both operations accept one payload, which is `undefined` when it
is omitted. A type may implement or compose only the capabilities it needs;
being able to publish does not imply being able to subscribe.

Finite asynchronous operations use a ten-second SDK deadline by default.
`Askable.timeout()` creates an immutable deadline view for `ask()` only;
`waitFor()` and `waitReady()` accept a deadline directly. `events()` is a
long-lived iterator with a bounded queue rather than a timed request. An ask's
single deadline covers both waiting for its current Server incarnation to
become ready and waiting for the eventual answer.

Every persistent registration returns its only cleanup function:

```ts
const stop = target.subscribe("event", handler)
stop()
```

There are no separate `unsubscribe()` or `unobserve()` methods and no
one-time subscription operation. Observation APIs such as `observeAsks()` and
`observeAnswers()` follow the same returned-cleanup rule.

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
annotation may narrow that message, but an incompatible replacement is a type
error. `observe()` receives a `Capture` containing only the facts guaranteed by
every Subscribable: `event` and `message`. It makes no assumption about a
sender or destination.

An unparameterized Endpoint, Channel, or traffic surface accepts
application-defined event names with an `unknown` payload. Supplying an event
map narrows both the names and their payloads; names outside that map are then
rejected.

`events()` applies the same message inference and narrowing rules and exposes a
named event as an `AsyncIterableIterator`.

`Endpoint` is the shared base of Server and Client. It is both an address and a
source: `endpoint.publish()` sends directly to it, while
`endpoint.subscribe()` and `endpoint.observe()` follow destinationless events
emitted by it. Server additionally composes `Askable`.

The contextual `Channel` is the executing Endpoint's inward boundary.
Subscriptions receive events explicitly addressed to it, with a
`ChannelMessage` containing the otherwise unknown sender. `channel.publish()`
emits outward from that executing Endpoint without naming a destination.

Directed inspection remains deliberately separate as `endpoint.traffic`. The
Endpoint handle already identifies the source, so ordinary traffic messages
contain only the destination and payload. Channel emissions never enter this
surface. Every traffic surface exposes
`observeAsks()` because either Endpoint kind may originate a question. A
Server's traffic additionally exposes `observeAnswers()`, because only a Server
can originate an answer. These captures include their event, correlation ID,
destination, and question payload or answer `Outcome`.

Every Endpoint exposes `exists()`, `start()`, and `stop()`. Endpoint lifecycle
is observed through `endpointStart` and `endpointStop` at Process, Program, and
Server Host scope. A start delivers the permanent `Server | Client` handle. A
stop delivers the same permanent handle directly. Every scope receives the
same canonical Endpoint instance, so it can be compared by identity. Neither
lifecycle event wraps the Endpoint or carries process-exit details. Endpoint
subscriptions themselves carry only application events emitted by that Endpoint.

`Server` and `Client` are public, logic-free Endpoint specializations. Server
adds request-response `ask()` and answer traffic observation. Client owns two
permanent synchronous capability objects: `traffic` for communication and
`window` for presentation. Accessing either object performs no operation and
receives no data; their methods and subscriptions are the explicit operations.

Program and Process complete the ownership hierarchy. `Program`, `Process`,
`Endpoint`, `Server`, and `Client` are real runtime classes for identity and
`instanceof`. Their capability properties are interfaces: in particular,
`client.traffic` and `client.window` have no runtime class identity of their
own. Core domain constructors are protected: environment SDKs supply the
authoritative handles backed by their boundaries while reusing these exact
Core constructors.
Core also owns the common launch, geometry, lifecycle-message, ChannelMessage,
ChannelCapture, TrafficMessage, and TrafficCapture types used by both
environments.

Window placement has two deliberately separate contracts. Authoring `Layer`
contains only `under`, `window`, and `over`, so Program declarations and Client
launch overrides cannot request system-owned placement. Runtime `WindowLayer`
adds `wallpaper`; `window.layer()` can therefore report the truth for a
wallpaper Window without making that layer constructible by Program code.
Window has no identity or lifecycle apart from its Client. Its stable capability
addresses the Client's current live presentation state and rejects reads or
mutations while that Client is absent.

Core also defines the independent environment-neutral `FileWallpaper` and
`DesktopWallpaper` contracts. The desktop additionally accepts a Program and
the deliberately narrow `WallpaperLaunch` containing only `name`, `server`,
the Client's initial `location`, and immutable Process `options`. The contracts
describe capability and data shape only. They contain no persistence, upload,
Process creation, or rendering implementation.

Window geometry has one public grammar. A `Value` is either a finite pixel
number or a linear relative expression such as `"1/2"`, `"50% + 10"`, or
`"30% + 20 * 2"`. `isRelativeValue()` validates that grammar and
`parseRelativeValue()` reduces it to one relative coefficient and one pixel
offset. The CLI, runtime validation, and desktop layout all consume this Core
definition rather than maintaining separate parsers.

Process parentage belongs to `Process`, not to contextual SDK state.
Each live Process retains only a handle to its immediate parent.
`process.parent()` returns `null` when no accessible parent handle exists. It
does not preserve historical lineage: calling it through an exited Process
handle, or after the retained parent has disappeared, rejects because the
represented Process does not exist. `current.parent()` flattens this operation
contextually but does not own the relationship.

Client traversal is structurally confined to its current Program. A
cross-Program parent handle is never supplied to the client, so traversal stops
at `null`. A fabricated or otherwise unauthorized Process handle is
indistinguishable from a nonexistent Process and every operation through it
rejects accordingly.

## Program configuration

Core is also the single source of truth for the authoring contract consumed by
the CLI. `defineConfig()` provides contextual typing for `phresh.config.ts` and
returns the description unchanged:

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

The declaration must contain a Server, a Client, or both. Development settings
remain authoring metadata; the CLI derives the appropriate runtime description
for each mode. The optional `icon` names one PNG source; packaging and
installation normalize it to `icon.png`, while hosting derives the system's
fixed presentation sizes.

Every Program also exposes its guaranteed icon without revealing hosting or
filesystem details:

```ts
const icon = await program.icon()          // medium PNG Blob
const large = await program.icon("large")  // small, medium, or large
```

The method always returns an `image/png` `Blob`. When no icon was authored,
the system returns its default through the same operation.

## Program-owned resources

Every Program exposes the same storage contracts in both environments:
filesystem-like `data` and `cache`, a key-value `store`, read-only SQL `logs`,
and a writable SQLite `database`. The Server SDK refines its filesystem areas
with `path()` and safe `resolve()` access; these host filesystem paths are
structurally absent from the Client SDK.

## License

Licensed under the [MIT License](LICENSE). Copyright 2026 Zohayr SLILEH.
