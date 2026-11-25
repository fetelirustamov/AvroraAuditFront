/**
 * Planın mağazası bir sətirdə: "4335 · Mağaza adı".
 * Təsdiq dialoqunun `items` siyahısında və checkbox etiketlərində eyni mətn işlənir.
 */
export function planStoreLabel(row: { locationCode?: string | number | null; locationName?: string | null }): string {
  return [row.locationCode, row.locationName].filter(part => part != null && part !== '').join(' · ');
}
