import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AsyncOrderMap from '../AsyncOrderMap';
import RoutePreviewMap from '../RoutePreviewMap';
import { MapsApi } from '../../services/api/maps';

jest.mock('../../services/api/maps', () => ({
  MapsApi: {
    calculateRoute: jest.fn()
  }
}));

jest.mock('../RoutePreviewMap', () => {
  return function MockRoutePreviewMap(props) {
    return (
      <div data-testid="route-preview-map">
        <span data-testid="has-driver-to-pickup">{props.driverToPickupPath?.length > 0 ? 'true' : 'false'}</span>
        <span data-testid="has-pickup-to-dropoff">{props.pickupToDropoffPath?.length > 0 ? 'true' : 'false'}</span>
        <span data-testid="pickup-coords">{props.pickup ? `${props.pickup.lat},${props.pickup.lng}` : 'none'}</span>
        <span data-testid="dropoff-coords">{props.dropoff ? `${props.dropoff.lat},${props.dropoff.lng}` : 'none'}</span>
        <span data-testid="driver-location">{props.driverLocation ? `${props.driverLocation.latitude},${props.driverLocation.longitude}` : 'none'}</span>
      </div>
    );
  };
});

describe('AsyncOrderMap - Two-Leg Route Display', () => {
  const mockOrder = {
    id: 1,
    orderNumber: 'ORD-001',
    status: 'accepted',
    from: { lat: 30.0444, lng: 31.2357, name: 'Pickup Location' },
    to: { lat: 30.0131, lng: 31.2089, name: 'Dropoff Location' },
    pickupLocation: { coordinates: { lat: 30.0444, lng: 31.2357 } },
    dropoffLocation: { coordinates: { lat: 30.0131, lng: 31.2089 } },
    assignedDriver: { userId: 1 }
  };

  const mockCurrentUser = {
    id: 1,
    primary_role: 'driver'
  };

  const mockDriverLocation = {
    latitude: 30.0330,
    longitude: 31.2200
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Two-leg route fetching', () => {
    test('fetches driver→pickup and pickup→dropoff routes for active orders', async () => {
      const mockLeg1Response = {
        polyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
        distance_km: 1.5,
        route_found: true
      };

      const mockLeg2Response = {
        polyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
        distance_km: 3.2,
        route_found: true
      };

      MapsApi.calculateRoute
        .mockResolvedValueOnce(mockLeg1Response)
        .mockResolvedValueOnce(mockLeg2Response);

      render(
        <AsyncOrderMap
          order={mockOrder}
          currentUser={mockCurrentUser}
          driverLocation={mockDriverLocation}
        />
      );

      await waitFor(() => {
        expect(MapsApi.calculateRoute).toHaveBeenCalledTimes(2);
      });

      expect(MapsApi.calculateRoute).toHaveBeenNthCalledWith(1, {
        pickup: { lat: 30.0330, lng: 31.2200 },
        delivery: { lat: 30.0444, lng: 31.2357 }
      });

      expect(MapsApi.calculateRoute).toHaveBeenNthCalledWith(2, {
        pickup: { lat: 30.0444, lng: 31.2357 },
        delivery: { lat: 30.0131, lng: 31.2089 }
      });
    });

    test('does not fetch routes when driver location is not available', async () => {
      render(
        <AsyncOrderMap
          order={mockOrder}
          currentUser={mockCurrentUser}
          driverLocation={null}
        />
      );

      await waitFor(() => {
        expect(MapsApi.calculateRoute).not.toHaveBeenCalled();
      });
    });

    test('does not fetch routes for non-active orders', async () => {
      const pendingOrder = { ...mockOrder, status: 'pending_bids' };

      render(
        <AsyncOrderMap
          order={pendingOrder}
          currentUser={mockCurrentUser}
          driverLocation={mockDriverLocation}
        />
      );

      await waitFor(() => {
        expect(MapsApi.calculateRoute).not.toHaveBeenCalled();
      });
    });
  });

  describe('Route rendering', () => {
    test('passes two-leg route paths to RoutePreviewMap', async () => {
      const mockLeg1Response = {
        polyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
        distance_km: 1.5,
        route_found: true
      };

      const mockLeg2Response = {
        polyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
        distance_km: 3.2,
        route_found: true
      };

      MapsApi.calculateRoute
        .mockResolvedValueOnce(mockLeg1Response)
        .mockResolvedValueOnce(mockLeg2Response);

      render(
        <AsyncOrderMap
          order={mockOrder}
          currentUser={mockCurrentUser}
          driverLocation={mockDriverLocation}
        />
      );

      await waitFor(() => {
        const mapElement = screen.getByTestId('route-preview-map');
        expect(mapElement).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByTestId('has-driver-to-pickup')).toHaveTextContent('true');
      });

      await waitFor(() => {
        expect(screen.getByTestId('has-pickup-to-dropoff')).toHaveTextContent('true');
      });
    });
  });
});

describe('RoutePreviewMap - Two-Leg Route Rendering', () => {
  test('renders driver→pickup polyline when driverToPickupPath is provided', () => {
    const driverToPickupPath = [
      [30.0330, 31.2200],
      [30.0380, 31.2250],
      [30.0444, 31.2357]
    ];

    const { container } = render(
      <RoutePreviewMap
        pickup={{ lat: 30.0444, lng: 31.2357 }}
        dropoff={{ lat: 30.0131, lng: 31.2089 }}
        driverLocation={{ latitude: 30.0330, longitude: 31.2200 }}
        driverToPickupPath={driverToPickupPath}
        pickupToDropoffPath={[]}
      />
    );

    const polylines = container.querySelectorAll('.leaflet-polyline');
    expect(polylines.length).toBeGreaterThan(0);
  });

  test('renders pickup→dropoff polyline when pickupToDropoffPath is provided', () => {
    const pickupToDropoffPath = [
      [30.0444, 31.2357],
      [30.0300, 31.2200],
      [30.0131, 31.2089]
    ];

    const { container } = render(
      <RoutePreviewMap
        pickup={{ lat: 30.0444, lng: 31.2357 }}
        dropoff={{ lat: 30.0131, lng: 31.2089 }}
        driverLocation={{ latitude: 30.0330, longitude: 31.2200 }}
        driverToPickupPath={[]}
        pickupToDropoffPath={pickupToDropoffPath}
      />
    );

    const polylines = container.querySelectorAll('.leaflet-polyline');
    expect(polylines.length).toBeGreaterThan(0);
  });

  test('renders both route legs with correct styling', () => {
    const driverToPickupPath = [
      [30.0330, 31.2200],
      [30.0380, 31.2250],
      [30.0444, 31.2357]
    ];

    const pickupToDropoffPath = [
      [30.0444, 31.2357],
      [30.0300, 31.2200],
      [30.0131, 31.2089]
    ];

    const { container } = render(
      <RoutePreviewMap
        pickup={{ lat: 30.0444, lng: 31.2357 }}
        dropoff={{ lat: 30.0131, lng: 31.2089 }}
        driverLocation={{ latitude: 30.0330, longitude: 31.2200 }}
        driverToPickupPath={driverToPickupPath}
        pickupToDropoffPath={pickupToDropoffPath}
      />
    );

    const polylines = container.querySelectorAll('.leaflet-polyline');
    expect(polylines.length).toBeGreaterThanOrEqual(2);
  });
});
