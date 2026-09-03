# `@phreshos/core`

The environment-neutral contracts and domain objects shared across PhreshOS.

[Documentation](https://docs.phreshos.com/sdks/core) ·
[Runtime model](https://docs.phreshos.com/runtime) ·
[Source](https://github.com/PhreshOS/core)

## Role

Core is the single source of truth for the System, Program, Process, Endpoint,
Service, Context, Desktop, Window, communication, storage, Appearance, and
permission contracts. It also provides the runtime classes whose references are
preserved by the environment SDKs.

Core contains no transport, persistence, command-line, or visual
implementation. Those implementations consume its contracts without redefining
them.

## Installation

| Package manager | Command |
| --- | --- |
| npm | `npm install @phreshos/core` |
| pnpm | `pnpm add @phreshos/core` |
| Bun | `bun add @phreshos/core` |
| Yarn | `yarn add @phreshos/core` |

```ts
import {
  ClientEndpoint,
  defineConfig,
  Process,
  Program,
  ServerEndpoint,
} from "@phreshos/core"
```

See [Program configuration](https://docs.phreshos.com/sdks/core#program-configuration)
for the configuration contract and
[Runtime](https://docs.phreshos.com/runtime) for the shared domain model.

## Development

```sh
bun install --frozen-lockfile
bun run verify
```

`verify` checks the contracts and completions, runs the tests, builds the
package, and validates the published artifact.

## Related repositories

- [`@phreshos/client`](https://github.com/PhreshOS/client),
  [`@phreshos/server`](https://github.com/PhreshOS/server), and
  [`@phreshos/node`](https://github.com/PhreshOS/node) implement the shared
  contracts at their respective boundaries.
- [`@phreshos/react`](https://github.com/PhreshOS/react) adapts live Core
  contracts to React.
- [PhreshOS System](https://github.com/PhreshOS/system) owns the authoritative
  runtime implementation.
- [PhreshOS Documentation](https://github.com/PhreshOS/docs) owns the canonical
  public explanation of these contracts.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the repository workflow and
[SECURITY.md](SECURITY.md) for private vulnerability reporting.

## License

Licensed under the [MIT License](LICENSE). Copyright © 2026 Zohayr SLILEH.
