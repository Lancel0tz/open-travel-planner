import React, { useState } from 'react'
import type { Place } from '../../types'

type PhotoPlace = Pick<Place, 'id' | 'name' | 'image_url'>

function DayPhoto({ place, onSelect }: { place: PhotoPlace; onSelect: (id: number) => void }) {
  const [failed, setFailed] = useState(false)
  if (!place.image_url || failed) return null
  return (
    <button type="button" onClick={() => onSelect(place.id)} aria-label={place.name}
      style={{ flex: '1 1 0', minWidth: 0, padding: 0, border: '1px solid var(--border-faint)', borderRadius: 12,
        overflow: 'hidden', background: 'var(--bg-card)', textAlign: 'left', cursor: 'pointer' }}>
      <img src={place.image_url} alt={place.name} loading="lazy" decoding="async" onError={() => setFailed(true)}
        style={{ width: '100%', height: 112, display: 'block', objectFit: 'cover' }} />
      <span style={{ display: 'block', padding: '8px 9px', fontSize: 11, lineHeight: 1.5, color: 'var(--text-primary)',
        fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{place.name}</span>
    </button>
  )
}

/** The day's first photographed sight and overnight stay, using the trip's own photos. */
export default function DayPhotoCards({ places, onSelect }: { places: PhotoPlace[]; onSelect: (id: number) => void }) {
  if (!places.length) return null
  return <div style={{ display: 'flex', gap: 8, padding: '4px 10px 10px' }}>
    {places.map(place => <DayPhoto key={`${place.id}:${place.image_url}`} place={place} onSelect={onSelect} />)}
  </div>
}
