import { 
  UIAnnotation, 
  AnnotationType, 
  AnnotationGeometry, 
  createBBoxGeometry, 
  createPolygonGeometry,
  Position 
} from '../types';

/**
 * Convert API inference response to UIAnnotation array
 * Handles both detection and segmentation models with RLE masks
 */
export function convertInferenceToUIAnnotations(
  response: any,
  options?: {
    markAsUnsaved?: boolean;
  }
): UIAnnotation[] {
  const annotations: UIAnnotation[] = [];
  const { detections = [], masks = [], model_type } = response;

  // Process detections
  for (let i = 0; i < detections.length; i++) {
    const detection = detections[i];
    const mask = model_type === 'segmentation' && i < masks.length ? masks[i] : null;

    const annotation: UIAnnotation = {
      id: `model-${Date.now()}-${i}`,
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [detection.bbox_xyxy[0], detection.bbox_xyxy[1]], // top-left
          [detection.bbox_xyxy[2], detection.bbox_xyxy[1]], // top-right
          [detection.bbox_xyxy[2], detection.bbox_xyxy[3]], // bottom-right
          [detection.bbox_xyxy[0], detection.bbox_xyxy[3]], // bottom-left
          [detection.bbox_xyxy[0], detection.bbox_xyxy[1]], // close
        ]],
      },
      annotationType: 'bbox',
      classLabel: detection.class_name,
      displayLabel: `${detection.class_name} (${(detection.confidence * 100).toFixed(1)}%)`,
      isSaved: options?.markAsUnsaved === false ? true : false,
      isVisible: true,
      pixelBbox: detection.bbox_xyxy,
      confidence: detection.confidence,
      segmentationRLE: mask ? {
        size: mask.rle.size,
        counts: mask.rle.counts,
      } : undefined,
      properties: {
        item_name: detection.item_name,
        class_id: detection.class_id,
        bbox_xyxyn: detection.bbox_xyxyn,
        center_x: detection.center_x,
        center_y: detection.center_y,
        width: detection.width,
        height: detection.height,
        ...(mask && {
          mask_quality: mask.mask_quality,
          stability_score: mask.stability_score,
          mask_area: mask.area,
        }),
      },
    };

    annotations.push(annotation);
  }

  return annotations;
}

/**
 * Convert binary mask to polygon coordinates using contour extraction
 * Binary mask is 2D array where 1 = object, 0 = background
 */
function extractContoursFromMask(
  mask: number[][],
  minPixels: number = 3
): number[][] {
  /**
   * Improved contour extraction using edge detection + simplification
   * More robust than Moore-Neighbor tracing for SAM masks
   */
  const rows = mask.length;
  if (rows === 0) return [];
  
  const cols = mask[0].length;

  // Find all edge pixels (boundary between 0 and 1)
  const edgePixels: [number, number][] = [];
  
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (mask[y][x] > 0) {
        // Check if this is an edge pixel (has a 0 neighbor)
        let isEdge = false;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dy === 0 && dx === 0) continue;
            const ny = y + dy;
            const nx = x + dx;
            if (ny < 0 || ny >= rows || nx < 0 || nx >= cols || mask[ny][nx] === 0) {
              isEdge = true;
              break;
            }
          }
          if (isEdge) break;
        }
        if (isEdge) {
          edgePixels.push([x, y]);
        }
      }
    }
  }

  console.log(`  Found ${edgePixels.length} edge pixels`);

  if (edgePixels.length < minPixels) {
    console.log('  No edge pixels found, trying to find any object pixels');
    // Fallback: find any object pixels to create a convex hull approximation
    const objectPixels: [number, number][] = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (mask[y][x] > 0) {
          objectPixels.push([x, y]);
        }
      }
    }
    if (objectPixels.length < minPixels) return [];
    
    // Return sampled points from object
    const sampleRate = Math.max(1, Math.floor(objectPixels.length / 50));
    const contours: number[][] = [];
    for (let i = 0; i < objectPixels.length; i += sampleRate) {
      contours.push([objectPixels[i][0], objectPixels[i][1]]);
    }
    return contours;
  }

  // Order edge pixels: start from top-left, go clockwise
  edgePixels.sort((a, b) => {
    if (a[1] !== b[1]) return a[1] - b[1]; // Sort by y first
    return a[0] - b[0]; // Then by x
  });

  // Simplify by sampling: reduce number of points
  const sampleRate = Math.max(1, Math.floor(edgePixels.length / 100)); // Target ~100 points
  const simplifiedPixels: [number, number][] = [];
  
  for (let i = 0; i < edgePixels.length; i += sampleRate) {
    simplifiedPixels.push(edgePixels[i]);
  }

  // Close the polygon
  const contours = simplifiedPixels.map(([x, y]) => [x, y]);
  if (contours.length > 0 && 
      (contours[0][0] !== contours[contours.length - 1][0] || 
       contours[0][1] !== contours[contours.length - 1][1])) {
    contours.push([contours[0][0], contours[0][1]]);
  }

  return contours.length >= minPixels ? contours : [];
}

/**
 * LEGACY: Adapt old prediction format to UIAnnotation
 * Use convertInferenceToUIAnnotations for new backend responses
 */
export const adaptPredictionToUIAnnotation = (
  raw: any, 
  modelSource: string,
  patchBounds: [number, number, number, number],
  canvasWidth: number,
  canvasHeight: number
): UIAnnotation[] => {
  console.log('🔄 ADAPTER START', {
    hasRaw: !!raw,
    hasMasks: !!raw?.masks,
    maskCount: raw?.masks?.length || 0,
    patchBounds,
    canvasSize: { canvasWidth, canvasHeight }
  });

  const predictions = raw.masks || (Array.isArray(raw) ? raw : (raw.detections || []));
  const [minLon, minLat, maxLon, maxLat] = patchBounds;

  console.log('📊 Extracted predictions:', predictions.length);

  // Coordinate transformers: pixel [0, canvasWidth] → geo [minLon, maxLon]
  const pxToLon = (x: number) => minLon + (x / canvasWidth) * (maxLon - minLon);
  const pxToLat = (y: number) => maxLat - (y / canvasHeight) * (maxLat - minLat);

  return predictions.map((pred: any, index: number) => {
    const id = `ml-${Date.now()}-${index}`;
    let geometry: AnnotationGeometry;
    let type: AnnotationType;

    const hasRLE =
      !!pred.rle &&
      Array.isArray(pred.rle.size) &&
      Array.isArray(pred.rle.counts);

    console.log(`\n🔍 Processing prediction ${index}:`, {
      hasSegmentation: !!pred.segmentation,
      segmentationType: typeof pred.segmentation,
      hasRLE,
      rleSize: hasRLE ? pred.rle.size : null,
      hasBbox: !!pred.bbox_xyxy || !!pred.bbox,
      classLabel: pred.class_name
    });

    // ✅ FIXED: Backend returns binary mask (2D array), not coordinates
    if (pred.segmentation && Array.isArray(pred.segmentation)) {
      type = 'polygon';

      // Check what we received
      const segmentation = pred.segmentation;
      console.log(`  Segmentation length: ${segmentation.length}`);
      console.log(`  First row type: ${typeof segmentation[0]}, length: ${Array.isArray(segmentation[0]) ? segmentation[0].length : 'N/A'}`);

      // Case 1: Binary mask (most common from your backend)
      // segmentation[y][x] = 0 or 1
      if (
        Array.isArray(segmentation[0]) && 
        typeof segmentation[0][0] === 'number' &&
        (segmentation[0][0] === 0 || segmentation[0][0] === 1)
      ) {
        console.log('  → Detected BINARY MASK format');
        
        // Extract contours from binary mask
        const pixelContours = extractContoursFromMask(segmentation);
        console.log(`  Extracted ${pixelContours.length} contour points`);

        if (pixelContours.length < 3) {
          console.log('  ⚠️ Contour too small, using bbox fallback');
          type = 'bbox';
          const [x1, y1, x2, y2] = pred.bbox_xyxy || pred.bbox || [0, 0, 0, 0];
          geometry = createBBoxGeometry(pxToLon(x1), pxToLat(y2), pxToLon(x2), pxToLat(y1));
        } else {
          // Convert pixel contour to geographic coordinates
          const geoContour = pixelContours.map(([px, py]) => [
            pxToLon(px),
            pxToLat(py)
          ] as Position);

          geometry = createPolygonGeometry([geoContour]);
          console.log('  ✓ Created polygon from mask contour');
        }
      }
      // Case 2: Already in [[[lon, lat], ...]] format (legacy)
      else if (
        Array.isArray(segmentation[0]) && 
        Array.isArray(segmentation[0][0]) &&
        typeof segmentation[0][0][0] === 'number'
      ) {
        console.log('  → Detected COORDINATE RING format (legacy)');
        
        const geoCoords = (segmentation as number[][][]).map(ring =>
          ring.map(point => [pxToLon(point[0]), pxToLat(point[1])] as Position)
        );
        geometry = createPolygonGeometry(geoCoords);
        console.log('  ✓ Used existing coordinate rings');
      }
      // Case 3: Flat array [x1, y1, x2, y2, x3, y3, ...]
      else if (
        Array.isArray(segmentation) &&
        segmentation.length > 0 &&
        typeof segmentation[0] === 'number' &&
        segmentation.length % 2 === 0
      ) {
        console.log('  → Detected FLAT ARRAY format');
        
        const pairs: Position[] = [];
        for (let i = 0; i < segmentation.length; i += 2) {
          pairs.push([
            pxToLon(segmentation[i]),
            pxToLat(segmentation[i + 1])
          ]);
        }
        // Close polygon
        if (pairs.length > 0 && (pairs[0][0] !== pairs[pairs.length - 1][0] || pairs[0][1] !== pairs[pairs.length - 1][1])) {
          pairs.push(pairs[0]);
        }
        geometry = createPolygonGeometry([pairs]);
        console.log('  ✓ Converted flat array to polygon');
      }
      // Fallback: invalid segmentation, use bbox
      else {
        console.log('  ⚠️ Unknown segmentation format, using bbox fallback');
        type = 'bbox';
        const [x1, y1, x2, y2] = pred.bbox_xyxy || pred.bbox || [0, 0, 0, 0];
        geometry = createBBoxGeometry(pxToLon(x1), pxToLat(y2), pxToLon(x2), pxToLat(y1));
      }
    } else {
      // No segmentation, use bounding box
      console.log('  → Using BBOX (no segmentation)');
      type = 'bbox';
      
      const [x1, y1, x2, y2] = pred.bbox_xyxy || pred.bbox || [0, 0, 0, 0];
      console.log(`  Bbox pixels: [${x1}, ${y1}, ${x2}, ${y2}]`);
      console.log(`  Bbox geo: [${pxToLon(x1).toFixed(6)}, ${pxToLat(y2).toFixed(6)}, ${pxToLon(x2).toFixed(6)}, ${pxToLat(y1).toFixed(6)}]`);
      
      geometry = createBBoxGeometry(pxToLon(x1), pxToLat(y2), pxToLon(x2), pxToLat(y1));
    }

    const annotation: UIAnnotation = {
      id,
      geometry,
      annotationType: type,
      classLabel: pred.class_name || pred.item_name || 'Object',
      displayLabel: `${pred.class_name || pred.item_name || 'Object'} (${(pred.confidence * 100).toFixed(0)}%)`,
      isSaved: false,
      isVisible: true,

      // ✅ add this so PatchView can draw the RLE mask
      segmentationRLE: pred.rle && Array.isArray(pred.rle.counts) && Array.isArray(pred.rle.size)
        ? { size: pred.rle.size as [number, number], counts: pred.rle.counts as number[] }
        : undefined,

      // ✅ keep bbox in pixel coords for PatchView (you already said bbox works)
      pixelBbox: pred.bbox
        ? ([pred.bbox[0], pred.bbox[1], pred.bbox[2], pred.bbox[3]] as [number, number, number, number])
        : (pred.bbox_xyxy
            ? ([pred.bbox_xyxy[0], pred.bbox_xyxy[1], pred.bbox_xyxy[2], pred.bbox_xyxy[3]] as [number, number, number, number])
            : undefined),

      properties: {
        confidence: pred.confidence,
        model_source: modelSource,
        area: pred.area,
        mask_quality: pred.mask_quality,
        stability_score: pred.stability_score,
      }
    };

    console.log(`  ✓ Created annotation: ${annotation.displayLabel}`);
    return annotation;
  });
};