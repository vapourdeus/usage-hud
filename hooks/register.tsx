import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Usage } from '../types'

// Ten icons per bar: each one stands for 10% of the window.
const SLOTS = 10
// Each sprite is 9 pixels square; one pixel of gap follows it.
const PITCH = 10

// Pixel sprites: `o` outline, `H` and `R` a heart's highlight and fill,
// `M`, `h` and `B` a drumstick's meat, its highlight and its bone.
const HEART = [
  '.ooo.ooo.',
  'oHHHoRRRo',
  'oHRRRRRRo',
  'oRRRRRRRo',
  'oRRRRRRRo',
  '.oRRRRRo.',
  '..oRRRo..',
  '...oRo...',
  '....o....',
]
const DRUMSTICK = [
  '..oo.....',
  '.oRro....',
  'oRRRTo...',
  'orRTNTo..',
  '.oVDNNo..',
  '..oVDDo..',
  '...ooo.oo',
  '......o.o',
  '......oo.',
]

type Palette = Record<string, string>

const FULL_HEART: Palette = { o: '#1a0a0a', H: '#ff7a7a', R: '#d81e1e' }
const EMPTY_HEART: Palette = { o: '#1a1a1a', H: '#4a4a4a', R: '#2e2e2e' }
const FULL_DRUMSTICK: Palette = {
  o: '#1a1a1a',
  R: '#b00000',
  r: '#9a0000',
  T: '#ad7a4a',
  N: '#8b5a2b',
  D: '#5c3a18',
  V: '#2e1d0b',
}
const EMPTY_DRUMSTICK: Palette = {
  o: '#1a1a1a',
  R: '#2e2e2e',
  r: '#262626',
  T: '#3d3d3d',
  N: '#353535',
  D: '#2b2b2b',
  V: '#222222',
}

const HEART_TEXT = { filled: '♥', empty: '♡' }
const DRUMSTICK_TEXT = { filled: '♦', empty: '◇' }

// Hidden until /hud shows them; not saved, so each session starts hidden.
const isOn = atom({ plugin: 'usage-hud', key: 'isOn' } as const, false)
const gauges = atom(
  { plugin: 'usage-hud', key: 'gauges' } as const,
  { fiveHour: null, sevenDay: null } as Usage,
)

const toUsage = (
  rateLimits: { kind: string; percentUsed: number }[],
): Usage => ({
  fiveHour: rateLimits.find(w => w.kind === 'five_hour')?.percentUsed ?? null,
  sevenDay: rateLimits.find(w => w.kind === 'seven_day')?.percentUsed ?? null,
})

// How many of the ten icons are still full: a bar shows what is left, as
// Minecraft does, so full means nothing used.
const left = (used: number) =>
  Math.min(SLOTS, Math.max(0, Math.round((100 - used) / 10)))

const label = (used: number | null) => (used === null ? '--' : `${used}% used`)

// One SVG holding a row of sprites. Each icon takes its own palette, so full
// and empty icons can sit side by side.
const iconRow = (sprite: string[], palettes: Palette[]) => {
  const cells = palettes
    .map((palette, slot) =>
      sprite
        .flatMap((row, y) =>
          [...row].flatMap((cell, x) =>
            palette[cell]
              ? [
                  `<rect x="${slot * PITCH + x}" y="${y}" width="1" height="1" fill="${palette[cell]}"/>`,
                ]
              : [],
          ),
        )
        .join(''),
    )
    .join('')
  const width = SLOTS * PITCH - 1

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${sprite.length}" shape-rendering="crispEdges">${cells}</svg>`
}

// Hearts fill from the left and drumsticks from the right, as in Minecraft.
const heartRow = (used: number) => {
  const full = left(used)

  return iconRow(
    HEART,
    Array.from({ length: SLOTS }, (_, slot) =>
      slot < full ? FULL_HEART : EMPTY_HEART,
    ),
  )
}

const drumstickRow = (used: number) => {
  const full = left(used)

  return iconRow(
    DRUMSTICK,
    Array.from({ length: SLOTS }, (_, slot) =>
      slot >= SLOTS - full ? FULL_DRUMSTICK : EMPTY_DRUMSTICK,
    ),
  )
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'hud',
      description: 'Show or hide the usage bars above the prompt',
    })

    const { rateLimits } = await $.session.usage()
    await update($, gauges, () => toUsage(rateLimits))

    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    await update($, gauges, () => toUsage(e.rateLimits))

    return next(e)
  })

  on('command.run', { command: 'hud' }, async $ => {
    const isNowOn = !(await read($, isOn))
    await update($, isOn, () => isNowOn)

    return { text: `Usage bars ${isNowOn ? 'shown' : 'hidden'}.` }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const { fiveHour, sevenDay } = await read($, gauges)
    const isShown = await read($, isOn)

    if (!isShown || e.props.hasSurvey || (fiveHour === null && sevenDay === null)) {
      return next(e)
    }

    const elements = $.ui.resolve(e)
    const { Box, Text } = elements
    const health = sevenDay ?? 0
    const hunger = fiveHour ?? 0

    // The terminal has no SVG element: it draws the same bars as glyphs.
    if (!('Svg' in elements)) {
      const hearts =
        HEART_TEXT.filled.repeat(left(health)) +
        HEART_TEXT.empty.repeat(SLOTS - left(health))
      const drumsticks =
        DRUMSTICK_TEXT.empty.repeat(SLOTS - left(hunger)) +
        DRUMSTICK_TEXT.filled.repeat(left(hunger))

      return (
        <Box flexDirection="row" justifyContent="space-between">
          <Box flexDirection="row">
            <Text color="error" weight="bold">
              {hearts}
            </Text>
            <Text dimColor>{` 7-day ${label(sevenDay)}`}</Text>
          </Box>
          <Box flexDirection="row">
            <Text dimColor>{`5-hour ${label(fiveHour)} `}</Text>
            <Text color="warning" weight="bold">
              {drumsticks}
            </Text>
          </Box>
        </Box>
      )
    }

    const { Svg } = elements

    return (
      <Box flexDirection="column">
        <Text size="caption" dimColor>
          HEARTS
        </Text>
        <Svg
          alt={`Health: ${left(health)} of ${SLOTS} hearts`}
          width={(SLOTS * PITCH - 1) * 2}
          height={18}
          source={heartRow(health)}
        />
        <Text size="heading">7-day limit</Text>
        <Text size="caption" dimColor>
          {label(sevenDay)}
        </Text>
        <Text size="caption" dimColor>
          HUNGER
        </Text>
        <Svg
          alt={`Hunger: ${left(hunger)} of ${SLOTS} drumsticks`}
          width={(SLOTS * PITCH - 1) * 2}
          height={18}
          source={drumstickRow(hunger)}
        />
        <Text size="heading">5-hour limit</Text>
        <Text size="caption" dimColor>
          {label(fiveHour)}
        </Text>
      </Box>
    )
  })
}
