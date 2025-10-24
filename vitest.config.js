import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/unit/*.test.{ts,cjs,mjs,js}'],
    coverage: {
      reportsDirectory: 'coverage',
      include: ['src'],
      provider: 'v8',
      reporter: ['text', 'lcov'],
    },
  },
})
