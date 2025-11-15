import "@testing-library/jest-dom/vitest"
import { afterEach, beforeEach, vi } from "vitest"

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
})

afterEach(() => {
  vi.useRealTimers()
})
