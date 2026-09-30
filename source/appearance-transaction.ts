/**
 * A spring instead of a curve: it settles on its target the way a body on a spring does, within
 * the transaction's duration. `bounce` from 0 (it arrives without passing its target) to below 1
 * (it overshoots and swings back); `velocity` is how fast it is already going when it starts, in
 * lengths of its own journey per second, so a motion that interrupts another carries on from it.
 */
export type SpringEasing = Readonly<{
  spring: Readonly<{ bounce: number, velocity?: number }>
}>

/** Stable timing curves accepted by Appearance transactions. */
export type Easing =
  | "linear"
  | "ease"
  | "ease-in"
  | "ease-out"
  | "ease-in-out"
  | readonly [number, number, number, number]
  | SpringEasing

/** Complete timing for one change in visual Appearance. */
export type AppearanceTransaction = Readonly<{
  duration: number
  easing: Easing
}>

/** Explicit timing selected for a presentation operation. */
export type PresentationTransaction = number | AppearanceTransaction

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
export function progressAt(transaction: AppearanceTransaction, time: number): number {
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
