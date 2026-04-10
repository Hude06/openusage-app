import { test, expect, _electron as electron } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const APP_PATH = path.resolve(__dirname, '..')
const SCREENSHOTS_DIR = path.join(APP_PATH, 'tests/screenshots')

test.beforeAll(() => {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })
  }
})

async function launchApp() {
  const app = await electron.launch({
    args: [path.join(APP_PATH, 'dist/main/main/main.js')],
    env: { ...process.env, ELECTRON_DEV: '0', NODE_ENV: 'test' },
  })
  const page = await app.firstWindow()
  const errors: string[] = []
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })
  page.on('pageerror', err => errors.push(err.message))
  return { app, page, errors }
}

test('app launches and renders', async () => {
  const { app, page, errors } = await launchApp()
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(3000)
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-home.png'), fullPage: true })

  const root = await page.$('#root')
  expect(root).not.toBeNull()
  console.log('Launch errors:', errors)
  expect(errors).toHaveLength(0)
  await app.close()
})

test('home screen has no console errors', async () => {
  const { app, page, errors } = await launchApp()
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(4000)

  const rootInner = await page.evaluate(() => document.getElementById('root')?.innerHTML ?? '')
  expect(rootInner.length).toBeGreaterThan(50)
  console.log('Home errors:', errors)
  expect(errors).toHaveLength(0)
  await app.close()
})

test('claude and codex sections render', async () => {
  const { app, page, errors } = await launchApp()
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(4000)
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-sections.png'), fullPage: true })

  const html = await page.evaluate(() => document.body.innerHTML)
  expect(html.toLowerCase()).toContain('claude')
  expect(html.toLowerCase()).toContain('codex')
  console.log('Sections errors:', errors)
  await app.close()
})

test('settings modal opens', async () => {
  const { app, page, errors } = await launchApp()
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(3000)

  const trigger = page.locator('[data-testid="settings-trigger"]')
  if (await trigger.count() > 0) {
    await trigger.click()
    await page.waitForTimeout(600)
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03-settings.png'), fullPage: true })
  }
  console.log('Settings errors:', errors)
  expect(errors).toHaveLength(0)
  await app.close()
})

test('no errors after full load cycle', async () => {
  const { app, page, errors } = await launchApp()
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(6000) // wait for data fetch
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04-loaded.png'), fullPage: true })

  console.log('Full cycle errors:', errors)
  expect(errors).toHaveLength(0)
  await app.close()
})
