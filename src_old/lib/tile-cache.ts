import localforage from "localforage";

const tileCache = localforage.createInstance({
  name: 'geomind-tiles',
  storeName: 'cog_tiles',
});

export async function getCachedTile(url: string): Promise<Blob | null> {
  return tileCache.getItem(url);
}

export async function cacheTile(url: string, blob: Blob) {
  await tileCache.setItem(url, blob);
}