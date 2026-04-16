export const IPC = {
  USAGE_GET_ALL: 'usage:getAll',
  USAGE_DATA_UPDATED: 'usage:dataUpdated',
  USAGE_FORCE_REFRESH: 'usage:forceRefresh',
  HISTORY_GET_RANGE: 'history:getRange',
  SETTINGS_GET: 'settings:get',
  SETTINGS_SAVE: 'settings:save',
  SHELL_OPEN_URL: 'shell:openUrl',
  AUTH_REFRESH_CLAUDE: 'auth:refreshClaude',
  AUTH_REFRESH_CODEX: 'auth:refreshCodex',
  LEADERBOARD_AUTH: 'leaderboard:auth',
  LEADERBOARD_SUBMIT: 'leaderboard:submit',
  LEADERBOARD_LOGOUT: 'leaderboard:logout',
} as const
