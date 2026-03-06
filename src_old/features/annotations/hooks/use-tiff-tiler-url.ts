const TITILER_ENDPOINT = process.env.NEXT_PUBLIC_TITILER_URL ?? 'http://localhost:8011';

export function useTilerTileUrl(
  tiffUrl: string,
  z: number,
  x: number,
  y: number,
  format: 'png' | 'npy' = 'png'
): string {
  if (!tiffUrl || z === undefined || x === undefined || y === undefined) {
    return '';
  }

  // TiTiler Endpoint structure: /cog/tiles/{z}/{x}/{y}.png?url=...
  return `${TITILER_ENDPOINT}/cog/tiles/${z}/${x}/${y}.${format}?url=${encodeURIComponent(tiffUrl)}`;
}