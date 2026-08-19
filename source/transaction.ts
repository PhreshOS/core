/** Stable timing curves accepted by local visual transactions. */
export type Easing =
  | "linear"
  | "ease"
  | "ease-in"
  | "ease-out"
  | "ease-in-out"
  | readonly [number, number, number, number]

type TransactionOptions = Readonly<{
  /** Wait for the visual transition to finish instead of only accepting it. */
  wait?: boolean
}>

/**
 * An explicit visual transaction. At least one motion value is required, so
 * an empty object cannot silently replace a layer's default behavior.
 */
export type Transaction = TransactionOptions & (
  | Readonly<{ duration: number, easing?: Easing }>
  | Readonly<{ duration?: number, easing: Easing }>
)
