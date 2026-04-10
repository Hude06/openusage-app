export const IPC = {
  USAGE_GET_ALL: 'usage:getAll',
  USAGE_DATA_UPDATED: 'usage:dataUpdated',
  HISTORY_GET_RANGE: 'history:getRange',
  SETTINGS_GET: 'settings:get',
  SETTINGS_SAVE: 'settings:save',
  SHELL_OPEN_URL: 'shell:openUrl',
  AUTH_REFRESH_CLAUDE: 'auth:refreshClaude',
  AUTH_REFRESH_CODEX: 'auth:refreshCodex',
} as const
