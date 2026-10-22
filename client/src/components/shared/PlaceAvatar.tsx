import React, { useState, useEffect, useRef } from 'react'
import { getCategoryIcon } from './categoryIcons'
import { getCached, isLoading, fetchPhoto, onThumbReady } from '../../services/photoService'
import { useAuthStore } from '../../store/authStore'
import type { Place } from '../../types'
import { isMarketMarker, marketMarkerEmoji, marketMarkerIcon } from '../Map/marketMarkerIcon'

interface Category {
  name?: string
  color?: string
  icon?: string
}

interface PlaceAvatarProps {
  place: Pick<Place, 'id' | 'name' | 'image_url' | 'google_place_id' | 'osm_id' | 'lat' | 'lng'>
  size?: number
  category?: Category | null
}

export default React.memo(function PlaceAvatar({ place, size = 32, category }: PlaceAvatarProps) {
  const [photoSrc, setPhotoSrc] = useState<string | null>(place.image_url || null)
  const [visible, setVisible] = useState(false)
  const imageUrlFailed = useRef(false)
  const ref = useRef<HTMLDivElement>(null)
  const placesPhotosEnabled = useAuthStore(s => s.placesPhotosEnabled)
  const market = isMarketMarker({ name: place.name, category_name: category?.name, category_icon: category?.icon })

  // Observe visibility — fetch photo only when avatar enters viewport
  useEffect(() => {
    if (market) { setPhotoSrc(null); return }
    if (place.image_url) { setVisible(true); return }
    if (!placesPhotosEnabled) return
    const el = ref.current
    if (!el) return
    // Check if already cached — show immediately without waiting for intersection
    const photoId = place.google_place_id || place.osm_id
    const cacheKey = photoId || `${place.lat},${place.lng}`
    if (cacheKey && getCached(cacheKey)) { setVisible(true); return }

    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); io.disconnect() } }, { rootMargin: '200px' })
    io.observe(el)
    return () => io.disconnect()
  }, [place.id, market])

  useEffect(() => {
    if (market) { setPhotoSrc(null); return }
    if (!visible) return
    if (place.image_url) { setPhotoSrc(place.image_url); return }
    if (!placesPhotosEnabled) return
    const photoId = place.google_place_id || place.osm_id
    if (!photoId && !(place.lat && place.lng)) { setPhotoSrc(null); return }

    const cacheKey = photoId || `${place.lat},${place.lng}`

    const cached = getCached(cacheKey)
    if (cached) {
      setPhotoSrc(cached.thumbDataUrl || cached.photoUrl)
      if (!cached.thumbDataUrl && cached.photoUrl) {
        return onThumbReady(cacheKey, thumb => setPhotoSrc(thumb))
      }
      return
    }

    if (isLoading(cacheKey)) {
      return onThumbReady(cacheKey, thumb => setPhotoSrc(thumb))
    }

    fetchPhoto(cacheKey, photoId || `coords:${place.lat}:${place.lng}`, place.lat, place.lng, place.name,
      entry => { setPhotoSrc(entry.thumbDataUrl || entry.photoUrl) }
    )
    return onThumbReady(cacheKey, thumb => setPhotoSrc(thumb))
  }, [visible, place.id, place.image_url, place.google_place_id, place.osm_id, market])

  const bgColor = category?.color || '#6366f1'
  const markerPlace = { name: place.name, category_name: category?.name, category_icon: category?.icon }
  const marketEmoji = market ? marketMarkerEmoji(markerPlace) : null
  const IconComp = getCategoryIcon(market ? marketMarkerIcon(markerPlace) : category?.icon)
  const iconSize = Math.round(size * 0.46)

  const containerStyle: React.CSSProperties = {
    width: size, height: size,
    borderRadius: '50%',
    overflow: 'hidden',
    flexShrink: 0,
    backgroundColor: bgColor,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }

  if (photoSrc && !market) {
    return (
      <div ref={ref} style={containerStyle}>
        <img
          src={photoSrc}
          alt={place.name}
          decoding="async"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={() => {
            if (!imageUrlFailed.current && photoSrc === place.image_url && (place.google_place_id || place.osm_id)) {
              imageUrlFailed.current = true
              const photoId = place.google_place_id || place.osm_id!
              const cacheKey = `refetch:${photoId}`
              fetchPhoto(cacheKey, photoId, place.lat ?? undefined, place.lng ?? undefined, place.name,
                entry => { setPhotoSrc(entry.thumbDataUrl || entry.photoUrl) }
              )
            } else {
              setPhotoSrc(null)
            }
          }}
        />
      </div>
    )
  }

  return (
    <div ref={ref} style={containerStyle}>
      {marketEmoji
        ? <span aria-label={marketEmoji === '🐷' ? 'Bónus' : 'Supermarket'} style={{ fontSize: Math.round(size * 0.58), lineHeight: 1 }}>{marketEmoji}</span>
        : <IconComp size={iconSize} strokeWidth={1.8} color="rgba(255,255,255,0.92)" />}
    </div>
  )
})
