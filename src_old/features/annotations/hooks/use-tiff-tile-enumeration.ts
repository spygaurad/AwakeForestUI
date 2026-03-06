// src/features/annotations/hooks/use-tile-enumeration.ts
import { useTiffMetadata } from '@/features/annotations/hooks/use-tiff-metadata';
import { useQuery } from '@tanstack/react-query';
import { getTileCountAndIndices, type TileCoordinate } from '@/features/annotations/utils/tile-math'; 

export type { TileCoordinate };

// Fixed zoom level for ML patching review (adjust as needed for your model's tile size)
const PATCH_ZOOM = 12; 

/**
 * Calculates all tile coordinates (Z/X/Y) that intersect the GeoTIFF bounds
 * at a specific, fixed zoom level.
 * @param tiffUrl The URL of the GeoTIFF
 * @returns An array of TileCoordinate objects
 */
export function useTileEnumeration(tiffUrl: string) {
  const { data: tiffInfo, isLoading: tiffLoading } = useTiffMetadata(tiffUrl);
  
  return useQuery<TileCoordinate[], Error>({
    queryKey: ['tile-list', tiffUrl, PATCH_ZOOM],
    queryFn: async () => {
      if (!tiffInfo?.bounds) {
        // If the metadata loaded but has no bounds (unlikely), throw an error.
        throw new Error('TIFF metadata (bounds) not available for enumeration.');
      }

      const bounds = tiffInfo.bounds; // [minLon, minLat, maxLon, maxLat]
      
      const result = getTileCountAndIndices(bounds, PATCH_ZOOM);
      
      // We limit enumeration to a fixed, moderate zoom to prevent millions of tiles
      // as cautioned in the original reference.
      return result.indices; // Returns [{z, x, y}, ...]
    },
    enabled: !!tiffInfo?.bounds && !tiffLoading,
    staleTime: Infinity,
  });
}