interface MarkerPlace {
  name: string
  category_name?: string | null
  category_icon?: string | null
}

function normalizedPlaceName(name: string): string {
  // Place names can arrive from imports in either composed or decomposed
  // Unicode form. Fold accents and formatting characters before matching so
  // supermarket names always get their store icon, even with copied text.
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u200B-\u200F\uFEFF]/g, '')
    .toLowerCase()
}

/**
 * Grocery markers use a stable store glyph instead of a provider photo, which can
 * resolve to an unrelated nearby attraction. Specialty fish shops keep their own
 * fish glyph. Other place categories preserve their configured icon.
 */
export function marketMarkerIcon(place: MarkerPlace): string | null | undefined {
  // Some saved supermarket places were imported without a joined category. Use
  // their store names too, so both the photo suppression and icon stay stable.
  const name = normalizedPlaceName(place.name)
  const isNamedGrocery = /bonus|kronan|gvendarkjor|supermarket|grocery|超市|杂货店/.test(name)
  const isShopping = isNamedGrocery
    || place.category_name?.toLowerCase() === 'shopping'
    || place.category_icon === 'ShoppingBag'
  if (!isShopping) return place.category_icon

  if (/fiskbuðin|fiskbudin|fish\s*shop|fishmonger/.test(name)) return 'Fish'
  if (/bonus/.test(name)) return 'PiggyBank'
  return 'ShoppingCart'
}

export function isMarketMarker(place: MarkerPlace): boolean {
  return /bónus|bonus|krónan|kronan|gvendarkjör|supermarket|grocery|超市|杂货店/i.test(place.name)
    || marketMarkerIcon(place) !== place.category_icon
}

/** Brand-style emoji used in compact place cards and map markers. */
export function marketMarkerEmoji(place: MarkerPlace): string | null {
  const icon = marketMarkerIcon(place)
  if (icon === 'PiggyBank') return '🐷'
  if (icon === 'ShoppingCart') return '🛒'
  return null
}
