"use client"

import { useState, useCallback } from "react"
import { toast } from "sonner"

/**
 * Wraps any async form action with safe `isSubmitting` lifecycle management.
 *
 * - `isSubmitting` is set to `true` before the action runs.
 * - If the action throws, a toast.error is shown automatically.
 * - `isSubmitting` is reset to `false` in a `finally` block — **guaranteed**.
 *
 * Usage:
 * ```ts
 * const { isSubmitting, execute } = useSubmit()
 *
 * const handleSubmit = (e) => {
 *   e.preventDefault()
 *   execute(async () => {
 *     await someAsyncWork()
 *   })
 * }
 * ```
 */
export function useSubmit() {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const execute = useCallback(async (action: () => Promise<void>) => {
    try {
      setIsSubmitting(true)
      await action()
    } catch (thrown: unknown) {
      // Normalise to a standard Error — Supabase returns plain objects,
      // not Error subclasses, so `thrown?.message` can be unreliable
      // if the caller forgot to wrap with `new Error(...)`.
      const err = thrown instanceof Error
        ? thrown
        : new Error(
            (thrown as any)?.message ||
            (typeof thrown === "string" ? thrown : "Something went wrong")
          )
      console.error("Submit failed:", thrown)
      toast.error(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  return { isSubmitting, execute }
}
