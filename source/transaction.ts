/**
 * A spring instead of a curve: it settles on its target the way a body on a spring does, within
 * the transaction's duration. `bounce` from 0 (it arrives without passing its target) to below 1
 * (it overshoots and swings back); `velocity` is how fast it is already going when it starts, in
 * lengths of its own journey per second, so a motion that interrupts another carries on from it.
 */
export type SpringEasing = Readonly<{
  spring: Readonly<{ bounce: number, velocity?: number }>
}>

/** Stable timing curves a transaction moves on. */
export type Easing =
  | "linear"
  | "ease"
  | "ease-in"
  | "ease-out"
  | "ease-in-out"
  | readonly [number, number, number, number]
  | SpringEasing

/**
 * Complete timing for one visual change: how long it takes, and how it moves. The Appearance does
 * not hold one: it holds a tempo, and each motion is derived from the tempo and what moves.
 */
export type Transaction = Readonly<{
  duration: number
  easing: Easing
}>

/**
 * Timing chosen for a presentation operation: a number takes the motion the Desktop derives for
 * the change and makes it that many times as long, within the Appearance tempo's bounds, so it
 * still follows the person's tempo; a complete transaction is that exact motion.
 */
export type PresentationTransaction = number | Transaction

// The named easings as the curves CSS gives them.
const named: Record<Extract<Easing, string>, readonly [number, number, number, number]> = {
  linear: [0, 0, 1, 1],
  ease: [0.25, 0.1, 0.25, 1],
  "ease-in": [0.42, 0, 1, 1],
  "ease-out": [0, 0, 0.58, 1],
  "ease-in-out": [0.42, 0, 0.58, 1]
}

/**
 * How far along a transaction is `time` milliseconds after it starts: 0 where it starts, 1 where it
 * arrives, and past 1 while a bouncing spring overshoots. Whoever follows a motion another part of
 * the System chose calls this each frame, and draws exactly the same motion.
 */
export function progressAt(transaction: Transaction, time: number): number {
  if (transaction.duration <= 0 || time >= transaction.duration) return 1
  if (time <= 0) return 0
  const easing = transaction.easing
  if (typeof easing === "object" && !Array.isArray(easing)) return springAt(easing as SpringEasing, transaction.duration, time)
  const curve = typeof easing === "string" ? named[easing] : easing as readonly [number, number, number, number]
  return bezierAt(curve, time / transaction.duration)
}

/** A cubic Bézier curve as CSS computes it: find where its time equals t, and read its progress there. */
function bezierAt([x1, y1, x2, y2]: readonly [number, number, number, number], t: number) {
  const along = (a: number, b: number, s: number) => 3 * a * s * (1 - s) ** 2 + 3 * b * s * s * (1 - s) + s ** 3
  let low = 0, high = 1, s = t
  for (let i = 0; i < 28; i++) {
    s = (low + high) / 2
    if (along(x1, x2, s) < t) low = s
    else high = s
  }
  return along(y1, y2, s)
}

/**
 * A damped spring, solved in closed form, tuned so it has all but settled by the end of the
 * transaction's duration; what little is left is spread over the way, so it lands exactly on its
 * target when the time is up instead of stepping there. `bounce` lowers its damping from critical:
 * at 0 it arrives without passing its target.
 */
function springAt({ spring }: SpringEasing, duration: number, time: number) {
  const total = duration / 1000
  const omega = 6 / total
  const damping = 1 - Math.min(Math.max(spring.bounce, 0), 0.95)
  const velocity = spring.velocity ?? 0
  // How far is left at a moment, from 1 at the start, moving toward the target at `velocity`.
  const left = (seconds: number) => {
    if (damping >= 1) return Math.exp(-omega * seconds) * (1 + (omega - velocity) * seconds)
    const swing = omega * Math.sqrt(1 - damping * damping)
    return Math.exp(-damping * omega * seconds) * (Math.cos(swing * seconds) + ((damping * omega - velocity) / swing) * Math.sin(swing * seconds))
  }
  const end = left(total)
  return (1 - left(time / 1000)) / (1 - end)
}

/** A transaction's easing as a CSS timing function; a spring is sampled into a `linear()` curve. */
export function cssEasing(easing: Easing): string {
  if (typeof easing === "string") return easing
  if (Array.isArray(easing)) return `cubic-bezier(${easing.join(", ")})`
  const samples = Array.from({ length: 41 }, (_, index) => progressAt({ duration: 1000, easing }, index * 25).toFixed(4))
  return `linear(${samples.join(", ")})`
}

/**
 * Validates one complete transaction wherever it crosses a boundary: a duration in milliseconds,
 * up to a minute, and a named easing, four cubic Bézier numbers with x from 0 to 1, or a spring.
 */
export function parseTransaction(value: unknown, name = "Transaction"): Transaction {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${name} must be an object`)
  const { duration, easing } = value as { duration?: unknown, easing?: unknown }
  if (typeof duration !== "number" || !Number.isFinite(duration) || duration < 0 || duration > 60_000) {
    throw new Error(`${name} duration must be from 0 to 60000 milliseconds`)
  }
  return Object.freeze({ duration, easing: parseEasing(easing, name) })
}

function parseEasing(value: unknown, name: string): Easing {
  if (value === "linear" || value === "ease" || value === "ease-in" || value === "ease-out" || value === "ease-in-out") return value
  if (Array.isArray(value)
    && value.length === 4
    && value.every((entry, index) => typeof entry === "number" && Number.isFinite(entry) && ((index !== 0 && index !== 2) || entry >= 0 && entry <= 1))) {
    return Object.freeze([...value]) as readonly [number, number, number, number]
  }
  const spring = typeof value === "object" && value !== null && !Array.isArray(value) ? (value as { spring?: unknown }).spring : undefined
  if (typeof spring === "object" && spring !== null) {
    const { bounce, velocity } = spring as { bounce?: unknown, velocity?: unknown }
    if (typeof bounce === "number" && Number.isFinite(bounce) && bounce >= 0 && bounce < 1
      && (velocity === undefined || typeof velocity === "number" && Number.isFinite(velocity))) {
      return Object.freeze({ spring: Object.freeze(velocity === undefined ? { bounce } : { bounce, velocity }) })
    }
  }
  throw new Error(`${name} easing must be a standard easing name, four cubic Bézier numbers with x values from 0 to 1, or a spring with a bounce from 0 to below 1`)
}
