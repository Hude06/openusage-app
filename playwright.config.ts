import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: 'tests/results.json' }]],
  use: {
    headless: false,
  },
})
