import { getStore } from './storage.ts'

let ctx: AudioContext | undefined

function tone(freq: number, start: number, dur: number, type: OscillatorType, gain: number) {
  ctx ??= new AudioContext()
  const t = ctx.currentTime + start
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  g.gain.setValueAtTime(gain, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(g).connect(ctx.destination)
  osc.start(t)
  osc.stop(t + dur)
}

export type SoundName = 'move' | 'capture' | 'wrong' | 'complete'

export function play(name: SoundName) {
  if (!getStore().settings.sound) return
  try {
    if (name === 'move') tone(520, 0, 0.07, 'triangle', 0.25)
    if (name === 'capture') {
      tone(330, 0, 0.06, 'square', 0.12)
      tone(220, 0.04, 0.08, 'triangle', 0.2)
    }
    if (name === 'wrong') tone(160, 0, 0.18, 'sawtooth', 0.08)
    if (name === 'complete') [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.22, 'triangle', 0.18))
  } catch {
    // audio blocked or unsupported
  }
}
