// Percent of each rate-limit window used, or null before the engine has a reading.
export type Usage = { fiveHour: number | null; sevenDay: number | null }

declare module 'claude-code' {
  interface PluginState {
    'usage-hud': { isOn: boolean; gauges: Usage }
  }
}
