// src/features/annotations/utils/tile-math.ts

const MAX_LATITUDE = 85.05112878; // Max extent of Web Mercator

export interface TileCoordinate {
  z: number;
  x: number;
  y: number;
}

/**
 * Helper function for Mercator Y calculation
 * Implements the core math from the reference (Step 6B)
 */
const latToTileY = (lat: number, n: number): number => {
  // Clamp latitude to Web Mercator limits
  const clampedLat = Math.min(Math.max(lat, -MAX_LATITUDE), MAX_LATITUDE);
  
  const latRad = clampedLat * Math.PI / 180;
  
  // This is the core formula: (1 - ln(tan(lat) + sec(lat)) / π) / 2 * n
  // Using the more stable form: (1 - ln(tan(lat/2 + pi/4)) / π) / 2 * n
  const y_val = Math.log(Math.tan(latRad / 2 + Math.PI / 4));

  return Math.floor(
    (1 - y_val / Math.PI) / 2 * n
  );
};


/**
 * Calculates the bounding box coordinates (min/max X/Y tile indices)
 * and generates a list of all tiles at a given zoom level (Z).
 * @param bounds [minLon, minLat, maxLon, maxLat]
 * @param z Zoom level
 * @returns Object with total count and array of indices
 */
export function getTileCountAndIndices(
  bounds: number[],
  z: number
): { count: number; indices: TileCoordinate[] } {
  const [minLon, minLat, maxLon, maxLat] = bounds;

  const n = 2 ** z;
  const indices: TileCoordinate[] = [];

  // --- Step B: Convert bounds → tile indices (Web Mercator) ---

  // X indices (Longitude)
  const xMin = Math.floor(((minLon + 180) / 360) * n);
  const xMax = Math.floor(((maxLon + 180) / 360) * n);

  // Y indices (Latitude is inverted for Y axis in map tiles)
  // Max Latitude (North) gets the smallest Y index (yMin)
  const yMin = latToTileY(maxLat, n); 
  // Min Latitude (South) gets the largest Y index (yMax)
  const yMax = latToTileY(minLat, n); 
  
  // Ensure yMin is the smaller index and yMax is the larger index
  const startY = Math.min(yMin, yMax);
  const endY = Math.max(yMin, yMax);


  // --- Step C: Generate all tiles ---
  for (let x = xMin; x <= xMax; x++) {
    for (let y = startY; y <= endY; y++) {
      // Ensure X and Y are within the valid range for this zoom level (0 to n-1)
      if (x >= 0 && x < n && y >= 0 && y < n) {
         indices.push({ z, x, y });
      }
    }
  }

  return { count: indices.length, indices };
}