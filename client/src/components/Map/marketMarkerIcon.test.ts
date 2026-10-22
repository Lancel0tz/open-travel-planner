import { describe, expect, it } from 'vitest'
import { isMarketMarker, marketMarkerEmoji, marketMarkerIcon } from './marketMarkerIcon'

describe('marketMarkerIcon', () => {
  it('uses a piggy bank for Bónus regardless of a bad photo', () => {
    expect(marketMarkerIcon({ name: 'Bónus · Selfoss', category_name: 'Shopping', category_icon: 'ShoppingBag' })).toBe('PiggyBank')
    expect(isMarketMarker({ name: 'Bónus · Selfoss', category_name: 'Shopping', category_icon: 'ShoppingBag' })).toBe(true)
  })

  it('uses a shopping cart for other supermarkets', () => {
    expect(marketMarkerIcon({ name: 'Krónan · Vík', category_name: 'Shopping', category_icon: 'ShoppingBag' })).toBe('ShoppingCart')
    expect(marketMarkerEmoji({ name: 'Krónan · Vík' })).toBe('🛒')
  })

  it('recognizes grocery chains even when the saved category is missing', () => {
    expect(marketMarkerIcon({ name: '🐷 Bónus 超市 · Borgarnes' })).toBe('PiggyBank')
    expect(marketMarkerEmoji({ name: '🐷 Bónus 超市 · Borgarnes' })).toBe('🐷')
    expect(isMarketMarker({ name: '🛒 Gvendarkjör 本地杂货店' })).toBe(true)
  })

  it('normalizes decomposed Icelandic accents in imported supermarket names', () => {
    const bonusName = 'Bónus · Reykjavík'.normalize('NFD')
    const kronanName = 'Krónan · Vík'.normalize('NFD')
    expect(marketMarkerEmoji({ name: bonusName })).toBe('🐷')
    expect(marketMarkerEmoji({ name: kronanName })).toBe('🛒')
  })

  it('uses a fish glyph for the specialty fish shop', () => {
    expect(marketMarkerIcon({ name: 'Fiskbúðin Sundlaugavegi', category_icon: 'ShoppingBag' })).toBe('Fish')
  })

  it('leaves non-shopping category icons unchanged', () => {
    expect(marketMarkerIcon({ name: 'Fröken Selfoss', category_name: 'Restaurant', category_icon: 'UtensilsCrossed' })).toBe('UtensilsCrossed')
    expect(isMarketMarker({ name: 'Fröken Selfoss', category_name: 'Restaurant', category_icon: 'UtensilsCrossed' })).toBe(false)
  })
})
