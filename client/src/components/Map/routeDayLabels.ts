import type { TripOverviewDay } from './tripRouteGeometry'

type Point = { x: number; y: number }
/** Keep day badges separate even where outbound and return routes overlap. */
export function separateDayLabels(points: Point[]): Point[] {
  const placed: Point[] = []
  for (const point of points) {
    let candidate = point
    for (let step = 0; placed.some(p => Math.abs(p.x - candidate.x) < 48 && Math.abs(p.y - candidate.y) < 32); step++) {
      candidate = { x: point.x, y: point.y + (step % 2 ? -1 : 1) * (Math.floor(step / 2) + 1) * 34 }
    }
    placed.push(candidate)
  }
  return placed
}

/** Shared DOM overlay for Leaflet and GL; these are day labels, never POI clusters. */
export function mountRouteDayLabels(container: HTMLElement, days: TripOverviewDay[], project: (p: [number, number]) => Point, onSelect?: (id: number) => void) {
  const root = document.createElement('div')
  root.dataset.testid = 'route-day-labels'
  Object.assign(root.style, { position: 'absolute', inset: '0', pointerEvents: 'none', zIndex: '650', overflow: 'hidden' })
  const entries = days.flatMap(day => {
    const line = day.lines.reduce<[number, number][]>((longest, next) => next.length > longest.length ? next : longest, [])
    if (!line.length) return []
    // Geometry vertices are irregularly spaced: locate halfway by segment length.
    const lengths = line.slice(1).map((p, i) => Math.hypot(p[0] - line[i][0], (p[1] - line[i][1]) * Math.cos(p[0] * Math.PI / 180)))
    let remaining = lengths.reduce((a, b) => a + b, 0) / 2
    let anchor = line[0]
    for (let i = 0; i < lengths.length; i++) {
      if (remaining <= lengths[i]) {
        const f = lengths[i] ? remaining / lengths[i] : 0
        anchor = [line[i][0] + f * (line[i + 1][0] - line[i][0]), line[i][1] + f * (line[i + 1][1] - line[i][1])]
        break
      }
      remaining -= lengths[i]
    }
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = `D${day.dayNumber}`
    button.title = `D${day.dayNumber} · ${day.date} · ${day.title || ''}`
    button.setAttribute('aria-label', button.title)
    Object.assign(button.style, { position: 'absolute', zIndex: '1', pointerEvents: 'auto', width: '42px', height: '28px', borderRadius: '9px', border: '2px solid white', background: day.color.line, color: 'white', font: 'bold 13px system-ui', boxShadow: '0 2px 7px #0005', cursor: 'pointer', transform: 'translate(-50%, -50%)' })
    button.onclick = e => { e.stopPropagation(); onSelect?.(day.dayId) }
    const stem = document.createElement('div')
    Object.assign(stem.style, { position: 'absolute', width: '2px', background: day.color.line, opacity: '0.8', transformOrigin: 'top center' })
    root.append(stem, button)
    return [{ anchor, button, stem }]
  })
  container.append(root)
  const update = () => {
    const points = entries.map(e => project(e.anchor))
    const positions = separateDayLabels(points)
    entries.forEach((entry, i) => {
      const dy = positions[i].y - points[i].y
      entry.stem.style.left = `${points[i].x}px`
      entry.stem.style.top = `${Math.min(points[i].y, positions[i].y)}px`
      entry.stem.style.height = `${Math.abs(dy)}px`
      entry.button.style.left = `${positions[i].x}px`
      entry.button.style.top = `${positions[i].y}px`
    })
  }
  update()
  return { update, remove: () => root.remove() }
}
