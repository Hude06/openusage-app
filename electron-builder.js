/* eslint-disable @typescript-eslint/no-require-imports */
// electron-builder config. Reads Apple notarization creds from env at build time.
// Required env vars (set in .env.local, sourced by `npm run dist:signed`):
//   APPLE_ID
//   APPLE_APP_SPECIFIC_PASSWORD
//   APPLE_TEAM_ID

const teamId = process.env.APPLE_TEAM_ID

if (!teamId) {
  // eslint-disable-next-line no-console
  console.warn('[electron-builder] APPLE_TEAM_ID not set — notarization will be skipped.')
}

module.exports = {
  appId: 'com.opentokenusage.app',
  productName: 'Open Token Usage',
  protocols: [
    {
      name: 'Open Usage OAuth',
      schemes: ['openusage'],
    },
  ],
  directories: {
    output: 'release',
  },
  mac: {
    icon: 'build/icon.icns',
    category: 'public.app-category.developer-tools',
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: 'build/entitlements.mac.plist',
    entitlementsInherit: 'build/entitlements.mac.plist',
    notarize: teamId ? { teamId } : false,
    target: [
      { target: 'dmg', arch: 'arm64' },
      { target: 'zip', arch: 'arm64' },
    ],
  },
  files: [
    'dist/**/*',
    'node_modules/**/*',
    'build/icon.icns',
    'build/entitlements.mac.plist',
  ],
}
