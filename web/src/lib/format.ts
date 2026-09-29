/** Fixed decimals, never rounding beyond what the source gives. */
export const fixed = (x: number, digits: number) => x.toFixed(digits)

/** 0.8826 -> "88%" (share given as a fraction). */
export const pct = (fraction: number, digits = 0) => `${(fraction * 100).toFixed(digits)}%`

export const ms = (x: number) => `${Math.round(x).toLocaleString('en-US')} ms`
