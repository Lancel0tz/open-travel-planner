import { describe, expect, it } from 'vitest'
import { mountRouteDayLabels, separateDayLabels } from './routeDayLabels'
import type { TripOverviewDay } from './tripRouteGeometry'

describe('route day labels', () => {
  it('keeps eight overlapping travel days readable without losing their order', () => {
    const positions = separateDayLabels(Array.from({ length: 8 }, () => ({ x: 100, y: 100 })))
    expect(positions).toHaveLength(8)
    positions.forEach((p, i) => positions.slice(i + 1).forEach(q => {
      expect(Math.abs(p.x - q.x) >= 48 || Math.abs(p.y - q.y) >= 32).toBe(true)
    }))
  })
  it('labels each day independently of clustered places and cleans up on hide', () => {
    const root = document.createElement('div')
    const days = Array.from({ length: 8 }, (_, i) => ({ dayId: i + 10, dayNumber: i + 1, date: '2026-11-09', title: 'Route', color: { line: '#123456', casing: '#fff' }, lines: [[[64, -22], [64, -21]]], segments: [], modes: ['driving'], distance: 1, duration: 1 }) as TripOverviewDay)
    let selected: number | undefined
    const overlay = mountRouteDayLabels(root, days, () => ({ x: 150, y: 200 }), id => { selected = id })
    expect(Array.from(root.querySelectorAll('button')).map(b => b.textContent)).toEqual(['D1','D2','D3','D4','D5','D6','D7','D8'])
    root.querySelectorAll('button')[4].click()
    expect(selected).toBe(14)
    overlay.remove()
    expect(root.childElementCount).toBe(0)
  })
})
