/**
 * SnowFlake end-to-end verification file
 * -------------------------------------
 * This file contains INTENTIONAL bugs so you can verify that SnowFlake's
 * repo-monitoring workflow works correctly:
 *
 *   1. Create an automation event targeting this repo
 *   2. SnowFlake fetches the latest commit, runs AI analysis
 *   3. It detects the errors below, displays them, and generates a fix patch
 *
 * Upload this file to a GitHub repo (e.g. snowflake-test), connect that repo
 * in Settings → GitHub, create an event with "Run analysis immediately" on,
 * and watch the investigation feed. Expected findings:
 *
 *   Bug A — TypeError: user is null            (products.js caller)
 *   Bug B — ReferenceError: price is not defined
 *   Bug C — NaN result in the discount helper
 */

// ── Bug A: calling .name on a null user ────────────────────────────────────
export function getDisplayName(user) {
  // Intentional bug: if `user` is null this throws "Cannot read properties
  // of null (reading 'name')".
  return `${user.name} (${user.email})`
}

// ── Bug B: using an undefined variable ────────────────────────────────────
export function checkoutTotal(cart) {
  // Intentional bug: `price` is never declared → ReferenceError.
  let total = 0
  for (const item of cart) {
    total += item.quantity * price // <-- ReferenceError: price is not defined
  }
  return total
}

// ── Bug C: silent NaN from an undefined config field ──────────────────────
export function applyDiscount(amount, discountPercent) {
  // Intentional bug: `settings.taxRate` does not exist → undefined → the
  // discount math silently produces NaN instead of throwing.
  const settings = { tax: 0.05 }
  const discount = amount * (discountPercent / 100) * settings.taxRate
  return amount - discount // NaN when taxRate is undefined
}

// ── Bug D: wrong comparison operator ──────────────────────────────────────
export function isEligible(age) {
  // Intentional bug: `=` instead of `===` — assignment always truthy.
  if (age = 18) return 'eligible'
  return 'not eligible'
}

// Self-check — run `node index.js` to see every bug fire.
import { pathToFileURL } from 'node:url'

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    getDisplayName(null) // throws → "uncaught"
  } catch (e) {
    console.error('Bug A confirmed:', e.message)
  }
  try {
    checkoutTotal([{ quantity: 2 }]) // throws → ReferenceError
  } catch (e) {
    console.error('Bug B confirmed:', e.message)
  }
  console.log('Bug C output:', applyDiscount('100', 10)) // NaN
  console.log('Bug D output:', isEligible(16)) // 'eligible' (wrong!)
}
