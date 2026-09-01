# `@phreshos/core`

Environment-neutral contracts and domain objects for PhreshOS Programs.

Core defines the shared model used by the Client, Server, Node, React, CLI, and
System repositories. It contains no transport, persistence, or visual
implementation.

## Installation

| Package manager | Command |
| --- | --- |
| npm | `npm install @phreshos/core` |
| pnpm | `pnpm add @phreshos/core` |
| Bun | `bun add @phreshos/core` |
| Yarn | `yarn add @phreshos/core` |

Import through the package root:

```ts
import { defineConfig, Program, Process, Server, Client } from "@phreshos/core"
```

## Model

The Program is the domain root:

```text
Program
└── Process
    ├── Server
    └── Client
```

`Program`, `Process`, `Endpoint`, `Server`, and `Client` are shared
runtime classes. Core also owns their contracts for lifecycle, Traffic,
Services, storage, permissions, Appearance, desktop capabilities, and Windows.

Environment SDKs adapt authority and communication without redefining these
objects. Repeated lookup of one live object within an SDK context therefore
preserves its canonical handle and runtime class.

## Program configuration

Program projects use `defineConfig()` for their authoring declaration:

```ts
import { defineConfig } from "@phreshos/core"

export default defineConfig({
  identity: "my-program",
  name: "My Program",
  version: "0.1.0",
  description: "My PhreshOS Program.",
  server: {
    location: "dist/server",
    entryFile: "main.js",
  },
  client: {
    location: "dist/client",
  },
})
```

The CLI and Node SDK derive concrete development, production, installation, and
packaging definitions from this declaration.

## Development

```sh
bun install --frozen-lockfile
bun run verify
```

`verify` checks the contracts, runs the tests, builds the package, and
validates its public artifact.

See the [PhreshOS documentation](https://github.com/PhreshOS/docs) for the
complete runtime model.

## Repository boundary

This repository owns the canonical shared contracts and domain classes. Runtime
adapters, transport, persistence, presentation, and command-line behavior
belong to their respective repositories.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the repository workflow and
[SECURITY.md](SECURITY.md) for private vulnerability reporting.

## License

Licensed under the [MIT License](LICENSE). Copyright © 2026 Zohayr SLILEH.
