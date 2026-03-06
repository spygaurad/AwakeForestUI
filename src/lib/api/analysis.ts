import { apiClient } from './client';
import type { GeoJSONGeometry } from '@/types/geo';
import type { JobResponse } from '@/types/common';

export const analysisApi = {
  runTimeseries: (data: {
    tracked_object_id: string;
    start_date: string;
    end_date: string;
    metric: 'area' | 'count' | 'ndvi';
  }) =>
    apiClient.post('analysis/timeseries', { json: data }).json<JobResponse>(),

  runChangeDetection: (data: {
    dataset_id: string;
    reference_date: string;
    target_date: string;
    aoi_geometry?: GeoJSONGeometry;
  }) =>
    apiClient.post('analysis/change-detection', { json: data }).json<JobResponse>(),
};
