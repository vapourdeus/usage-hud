# usage-hud

A Claude Code mod that shows your usage limits as Minecraft-style bars:

- **Health (hearts)** = your 7-day limit
- **Hunger (drumsticks)** = your 5-hour limit

Each bar shows the exact percentage used, so you still get the numbers. The bars are hidden until you type `/hud`, which shows or hides them.

## Install

In a terminal Claude Code session, type:

```bash
/plugin install usage-hud --marketplace vapourdeus/usage-hud
```

Answer `y` to add the marketplace, then pick a scope.

## Use

- `/hud` shows or hides the bars above the prompt.
- The bars only appear once Claude Code has a usage reading, which needs a plan with these limits.

## Notes

- The bars are drawn as pixel art on the desktop app, VS Code and mobile. The terminal shows the same bars as text symbols.
- The bars start hidden in each session and are not saved between sessions.
