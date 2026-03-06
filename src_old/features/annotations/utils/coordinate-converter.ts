// src/features/annotations/utils/coordinate-converter.ts
import type { Geometry } from 'geojson';

// --- CONSTANTS ---
const TILE_SIZE = 800;
const EARTH_RADIUS = 6378137;
const HALF_CIRCUMFERENCE = Math.PI * EARTH_RADIUS; // Approx 20037508.34

/**
 * Calculates the bounding box (in Lon/Lat) for a specific Web Mercator tile (Z/X/Y).
 * This is the inverse of the global tile calculation formulas.
 * @param z Zoom level
 * @param x Tile X index
 * @param y Tile Y index
 * @returns [minLon, minLat, maxLon, maxLat]
 */
export function getTileBbox(z: number, x: number, y: number): [number, number, number, number] {
  const n = 2 ** z;

  // Convert tile index to Web Mercator (meters)
  const tileXMin = (x / n) * 2 * HALF_CIRCUMFERENCE - HALF_CIRCUMFERENCE;
  const tileXMax = ((x + 1) / n) * 2 * HALF_CIRCUMFERENCE - HALF_CIRCUMFERENCE;
  const tileYMax = HALF_CIRCUMFERENCE - (y / n) * 2 * HALF_CIRCUMFERENCE; // Y Max is North
  const tileYMin = HALF_CIRCUMFERENCE - ((y + 1) / n) * 2 * HALF_CIRCUMFERENCE; // Y Min is South

  // Convert Web Mercator (meters) to Lon/Lat (EPSG:4326)
  const lonFromX = (x: number) => (x / HALF_CIRCUMFERENCE) * 180.0;
  const latFromY = (y: number) => {
    const latRad = Math.atan(Math.sinh(y / EARTH_RADIUS));
    return latRad * (180 / Math.PI); // Convert radians to degrees
  };

  const minLon = lonFromX(tileXMin);
  const maxLon = lonFromX(tileXMax);
  const minLat = latFromY(tileYMin);
  const maxLat = latFromY(tileYMax);

  return [minLon, minLat, maxLon, maxLat];
}

/**
 * Converts a GeoJSON coordinate [lon, lat] into a pixel coordinate [x, y]
 * relative to the top-left corner of the given tile's bounding box.
 * @param lonLat [longitude, latitude] array from GeoJSON
 * @param tileBbox [minLon, minLat, maxLon, maxLat] of the tile
 * @returns [pixelX, pixelY] in the 0-256 range
 */
function worldCoordToPatchPixel(
  lonLat: [number, number],
  tileBbox: [number, number, number, number]
): [number, number] {
  const [lon, lat] = lonLat;
  const [minLon, minLat, maxLon, maxLat] = tileBbox;
  
  const rangeLon = maxLon - minLon;
  const rangeLat = maxLat - minLat;

  // X axis
  const pixelX = ((lon - minLon) / rangeLon) * TILE_SIZE;
  
  // Y axis is inverted in map-tile systems (Y=0 is top/North)
  // Max Latitude (North) maps to pixelY=0
  const pixelY = TILE_SIZE - ((lat - minLat) / rangeLat) * TILE_SIZE;

  // Clamp coordinates to the tile boundary
  return [
    Math.min(TILE_SIZE, Math.max(0, pixelX)),
    Math.min(TILE_SIZE, Math.max(0, pixelY)),
  ];
}

/**
 * Converts a GeoJSON BBox geometry to a simple pixel-based {x, y, width, height} object
 * relative to the patch/tile.
 * @param geometry The GeoJSON geometry (e.g., a BBox)
 * @param tileBbox The world coordinates of the tile
 * @returns {x, y, width, height} in patch pixels
 */
export function worldToPatchPixel(
  geometry: Geometry,
  tileBbox: [number, number, number, number]
): { x: number, y: number, width: number, height: number } | null {
  
  if (geometry.type !== 'Polygon' || geometry.coordinates[0].length < 4) return null;

  const coords = geometry.coordinates[0];

  // Get min/max Lon/Lat from the annotation's BBox
  const annLonMin = Math.min(...coords.map(c => c[0]));
  const annLonMax = Math.max(...coords.map(c => c[0]));
  const annLatMin = Math.min(...coords.map(c => c[1]));
  const annLatMax = Math.max(...coords.map(c => c[1]));
  
  // 1. Check if the annotation intersects the tile BBox
  const [tileMinLon, tileMinLat, tileMaxLon, tileMaxLat] = tileBbox;
  const isVisible = (
    annLonMax > tileMinLon && 
    annLonMin < tileMaxLon && 
    annLatMax > tileMinLat && 
    annLatMin < tileMaxLat
  );

  if (!isVisible) return null;

  // 2. Determine the intersection BBox
  const intersectionLonMin = Math.max(annLonMin, tileMinLon);
  const intersectionLonMax = Math.min(annLonMax, tileMaxLon);
  const intersectionLatMin = Math.max(annLatMin, tileMinLat);
  const intersectionLatMax = Math.min(annLatMax, tileMaxLat); // Note: Max lat is the Northmost

  // 3. Convert intersection BBox corners to patch pixels
  const [patchX, patchY] = worldCoordToPatchPixel(
    [intersectionLonMin, intersectionLatMax], // Top-Left of intersection (minLon, maxLat)
    tileBbox
  );
  const [patchXMax, patchYMax] = worldCoordToPatchPixel(
    [intersectionLonMax, intersectionLatMin], // Bottom-Right of intersection (maxLon, minLat)
    tileBbox
  );
  
  // 4. Calculate final width/height
  const width = patchXMax - patchX;
  const height = patchYMax - patchY;

  return { x: patchX, y: patchY, width: width, height: height };
}