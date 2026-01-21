// Maps API Service - Location and routing functionality

import { ApiClient } from './client';

export interface CalculateRouteRequest {
  pickup: { lat: number; lng: number };
  delivery: { lat: number; lng: number };
}

export interface CalculateRouteResponse {
  distance_km: number;
  straight_line_distance_km: number;
  duration_minutes?: number;
  estimates?: {
    car?: { duration_minutes: number };
    [key: string]: any;
  };
  polyline?: string;
  route_found: boolean;
  osrm_used: boolean;
}

export class MapsApi {
  /**
   * Calculate route between two points using OSRM
   */
  static async calculateRoute(request: CalculateRouteRequest): Promise<CalculateRouteResponse> {
    return ApiClient.post<CalculateRouteResponse>('/locations/calculate-route', request);
  }
}