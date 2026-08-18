# Contributing

Core owns the environment-neutral vocabulary shared across PhreshOS. A change
belongs here only when Client, Server, CLI, system, or interface implementations
need the same contract without importing one another's mechanisms.

## Development

Install the pinned toolchain and verify the complete repository:

```sh
bun install --frozen-lockfile
bun run verify
```

`verify` type-checks source and tests, runs the test suite, rebuilds the package,
packs the actual publication artifact, installs that artifact in a temporary
consumer, and checks both its runtime and TypeScript entry points.

Keep implementations out of contracts. Core may define stable runtime identity,
validation, derivation, and shared data shapes, but transport, storage, rendering,
and environment-specific authority remain with the repositories that implement
them.

Changes should include focused tests for new runtime behavior and must preserve
the built-only package boundary. Do not import repository source paths from a
consumer.

## Pull requests

Explain the shared need the change serves, update public documentation when the
contract changes, and keep each pull request focused on one coherent change.
