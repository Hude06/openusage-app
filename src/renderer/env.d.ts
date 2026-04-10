/// <reference types="vite/client" />

import type { TokenPulseAPI } from '../preload/preload'

declare global {
  interface Window {
    tokenPulse: TokenPulseAPI
  }
}
