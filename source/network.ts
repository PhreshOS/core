/** A canonical destination scope used by the System network permission. */
export type NetworkScope = string

type NetworkProtocol = "http:" | "https:" | "ws:" | "wss:"

type ParsedNetworkScope = Readonly<{
  protocol: NetworkProtocol
  hostname: string
  port: string | "*"
  path: NetworkPath
}>

type NetworkPath =
  | Readonly<{ kind: "any" }>
  | Readonly<{ kind: "exact", value: string }>
  | Readonly<{ kind: "prefix", value: string }>

/** Validate and canonicalize one System network destination scope. */
export function parseNetworkScope(value: unknown): NetworkScope {
  return formatNetworkScope(readNetworkScope(value))
}

/** Whether every destination represented by the requested scope belongs to the grant. */
export function networkScopeCovers(grant: NetworkScope, requested: NetworkScope): boolean {
  const outer = readNetworkScope(grant)
  const inner = readNetworkScope(requested)

  return outer.protocol === inner.protocol
    && hostnameCovers(outer.hostname, inner.hostname)
    && (outer.port === "*" || outer.port === inner.port)
    && pathCovers(outer.path, inner.path)
}

function readNetworkScope(value: unknown): ParsedNetworkScope {
  if (typeof value !== "string" || value.length === 0 || value !== value.trim()) {
    throw new Error("A network scope must be a non-empty string without surrounding whitespace")
  }

  const match = /^([a-z][a-z\d+.-]*:)\/\/([^/?#]+)([^?#]*)(?:[?#].*)?$/i.exec(value)

  if (!match) throw new Error(`Invalid network scope "${value}"`)

  const protocol = match[1]?.toLowerCase()

  if (protocol !== "http:" && protocol !== "https:" && protocol !== "ws:" && protocol !== "wss:") {
    throw new Error(`Network scope "${value}" has an unsupported protocol`)
  }

  const authority = readAuthority(match[2]!, protocol)

  return Object.freeze({
    protocol,
    hostname: authority.hostname,
    port: authority.port,
    path: readPath(match[3]!, protocol)
  })
}

function readAuthority(authority: string, protocol: NetworkProtocol) {
  if (authority.includes("@")) throw new Error("A network scope cannot contain credentials")

  let hostname = authority
  let port: string | "*" = ""

  if (authority.startsWith("[")) {
    const end = authority.indexOf("]")

    if (end < 0) throw new Error("A network scope contains an invalid IPv6 host")

    hostname = authority.slice(0, end + 1)
    const remainder = authority.slice(end + 1)

    if (remainder) {
      if (!remainder.startsWith(":")) throw new Error("A network scope contains an invalid authority")
      port = remainder.slice(1)
    }
  } else {
    const separator = authority.lastIndexOf(":")

    if (separator >= 0) {
      hostname = authority.slice(0, separator)
      port = authority.slice(separator + 1)
    }
  }

  if (!hostname || (!port && authority.endsWith(":"))) throw new Error("A network scope contains an invalid authority")
  if (port !== "" && port !== "*" && (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65_535)) {
    throw new Error("A network scope contains an invalid port")
  }

  const wildcard = hostname === "*" || (hostname.startsWith("*.") && !hostname.slice(2).includes("*"))

  if (hostname.includes("*") && !wildcard) throw new Error("A network hostname wildcard must replace a complete leading label")

  const candidate = hostname === "*" ? "scope.invalid" : wildcard ? hostname.slice(2) : hostname
  const validated = new URL(`${protocol}//${candidate}${port && port !== "*" ? `:${port}` : ""}`)

  if (!validated.hostname) throw new Error("A network scope needs a hostname")

  const canonicalHostname = hostname === "*"
    ? "*"
    : wildcard
      ? `*.${validated.hostname}`
      : validated.hostname

  return Object.freeze({
    hostname: canonicalHostname,
    port: port === "*" ? "*" : validated.port
  })
}

function readPath(pathname: string, protocol: NetworkProtocol): NetworkPath {
  if (!pathname) return Object.freeze({ kind: "any" })

  const prefix = pathname.endsWith("/**")

  if (pathname.includes("*") && !prefix) throw new Error("A network path wildcard must be the final /** segment")
  if (prefix && pathname.slice(0, -3).includes("*")) throw new Error("A network path contains more than one wildcard")

  const raw = prefix ? pathname.slice(0, -3) || "/" : pathname
  const canonical = new URL(`${protocol}//scope.invalid${raw}`).pathname

  if (prefix && canonical === "/") return Object.freeze({ kind: "any" })

  return Object.freeze({ kind: prefix ? "prefix" : "exact", value: canonical })
}

function formatNetworkScope(scope: ParsedNetworkScope) {
  const authority = `${scope.hostname}${scope.port ? `:${scope.port}` : ""}`
  const path = scope.path.kind === "any"
    ? ""
    : scope.path.kind === "prefix"
      ? `${scope.path.value}/**`
      : scope.path.value

  return `${scope.protocol}//${authority}${path}`
}

function hostnameCovers(grant: string, requested: string) {
  if (grant === "*") return true
  if (requested === "*") return false

  if (!grant.startsWith("*.")) return grant === requested

  const suffix = grant.slice(2)
  const requestedWildcard = requested.startsWith("*.")
  const requestedSuffix = requestedWildcard ? requested.slice(2) : requested

  if (requestedWildcard) return requestedSuffix === suffix || requestedSuffix.endsWith(`.${suffix}`)

  return requestedSuffix !== suffix && requestedSuffix.endsWith(`.${suffix}`)
}

function pathCovers(grant: NetworkPath, requested: NetworkPath) {
  if (grant.kind === "any") return true
  if (requested.kind === "any") return false
  if (grant.kind === "exact") return requested.kind === "exact" && grant.value === requested.value

  return requested.value === grant.value || requested.value.startsWith(`${grant.value}/`)
}
