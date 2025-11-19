import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { jest } from '@jest/globals';
import App from './App';
import i18n from 'i18n/i18nContext';

// Mock dependencies
jest.mock('./i18n/i18nContext', () => ({
  __esModule: true,
  useI18n: () => ({
    t: jest.fn((key) => key), // Mock translation function
    locale: 'en',
    changeLocale: jest.fn()
  }),
  default: {}
}));

jest.mock('socket.io-client', () => jest.fn(() => ({
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  disconnect: jest.fn(),
  removeAllListeners: jest.fn()
})));

jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ children }) => <div data-testid="map-marker">{children}</div>,
  Popup: ({ children }) => <div data-testid="map-popup">{children}</div>,
  Polyline: () => <div data-testid="polyline" />
}));

jest.mock('leaflet', () => ({
  icon: () => ({ foo: 'bar' })
}));

jest.mock('react-google-recaptcha', () => ({
  __esModule: true,
  default: ({ children, onChange }) => (
    <div data-testid="recaptcha">
      <button onClick={() => onChange && onChange('mock-token')}>Mock Recaptcha</button>
    </div>
  )
}));

jest.mock('lodash', () => ({
  debounce: (fn) => fn
}));

// Mock LanguageSwitcher
jest.mock('./LanguageSwitcher', () => {
  return () => <div data-testid="language-switcher">Language Switcher</div>;
});

// Mock AdminPanel
jest.mock('./AdminPanel', () => {
  return ({ onClose }) => (
    <div data-testid="admin-panel">
      Admin Panel <button onClick={onClose}>Close</button>
    </div>
  );
});

// Mock ErrorBoundary
jest.mock('./ErrorBoundary', () => {
  return ({ children }) => <div>{children}</div>;
});

// Mock OrderCreationForm
jest.mock('./updated-order-creation-form', () => {
  return ({ onSubmit }) => (
    <div data-testid="order-form">
      Order Form
      <button onClick={() => onSubmit({
        title: 'Test Order',
        description: 'Test Description',
        price: 50,
        pickupAddress: {
          country: 'USA',
          city: 'Test City',
          personName: 'John Doe'
        },
        dropoffAddress: {
          country: 'USA',
          city: 'Test City',
          personName: 'Jane Doe'
        }
      })}>Submit Order</button>
    </div>
  );
});

// Save global.fetch for restoration
const originalFetch = global.fetch;

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
  removeItem: jest.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock geolocation
Object.defineProperty(navigator, 'geolocation', {
  value: {
    getCurrentPosition: jest.fn().mockImplementation((success) =>
      success({ coords: { latitude: 40.7128, longitude: -74.0060 } })
    )
  },
  configurable: true
});

// Mock speechSynthesis
Object.defineProperty(window, 'speechSynthesis', {
  value: {
    speak: jest.fn(),
    getVoices: jest.fn(() => [])
  },
  writable: true
});

// Mock Audio API
window.AudioContext = jest.fn().mockImplementation(() => ({
  createOscillator: jest.fn(() => ({
    connect: jest.fn(),
    frequency: { setValueAtTime: jest.fn() },
    start: jest.fn(),
    stop: jest.fn()
  })),
  createGainNode: jest.fn(() => ({
    connect: jest.fn(),
    gain: { setValueAtTime: jest.fn(), exponentialRampToValueAtTime: jest.fn() }
  })),
  destination: {}
}));
window.webkitAudioContext = window.AudioContext;

describe('App Track Order Button UI Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock fetch for authentication
    global.fetch = jest.fn();

    // Mock successful login
    global.fetch
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ token: 'mock-token', user: { id: '1', name: 'Test User', role: 'customer' } })
        })
      )
      // Mock user fetch
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: '1', name: 'Test User', role: 'customer' })
        })
      )
      // Mock orders fetch - return orders with accepted status
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{
            _id: 'order1',
            orderNumber: 'ORD-001',
            status: 'accepted', // Changed from 'accepted' to check if that's causing issues
            title: 'Test Order',
            price: 50,
            pickupAddress: {
              country: 'USA',
              city: 'New York',
              personName: 'John Doe'
            },
            deliveryAddress: {
              country: 'USA',
              city: 'New York',
              personName: 'Jane Doe'
            },
            assignedDriver: {
              userId: '2',
              name: 'Test Driver'
            },
            from: { lat: 40.7589, lng: -73.9851 },
            to: { lat: 40.7505, lng: -73.9934 }
          }])
        })
      )
      // Mock notifications fetch
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        })
      )
      // Subsequent orders fetch
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{
            _id: 'order1',
            orderNumber: 'ORD-001',
            status: 'accepted',
            title: 'Test Order',
            price: 50,
            pickupAddress: {
              country: 'USA',
              city: 'New York',
              personName: 'John Doe'
            },
            deliveryAddress: {
              country: 'USA',
              city: 'New York',
              personName: 'Jane Doe'
            },
            assignedDriver: {
              userId: '2',
              name: 'Test Driver'
            },
            from: { lat: 40.7589, lng: -73.9851 },
            to: { lat: 40.7505, lng: -73.9934 }
          }])
        })
      );
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('should render track order button for accepted orders', async () => {
    render(<App />);

    // Wait for app to load and authenticate
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // Login
    const emailInput = screen.getByPlaceholderText('auth.email');
    const passwordInput = screen.getByPlaceholderText('auth.password');
    const loginButton = screen.getByText('auth.login');

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password' } });
    fireEvent.click(screen.getByText('Mock Recaptcha'));

    await act(async () => {
      fireEvent.click(loginButton);
      await new Promise(resolve => setTimeout(resolve, 500));
    });

    // Wait for orders to load
    await waitFor(() => {
      expect(screen.getByText('Test Order')).toBeInTheDocument();
    });

    // Check if track order button is present
    await waitFor(() => {
      const trackOrderButton = screen.getByText('orders.trackOrder');
      expect(trackOrderButton).toBeInTheDocument();
      console.log('✅ Track Order button found:', trackOrderButton);
    });
  });

  test('should open live tracking modal when track order button is clicked', async () => {
    render(<App />);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // Login process
    fireEvent.change(screen.getByPlaceholderText('auth.email'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('auth.password'), { target: { value: 'password' } });
    fireEvent.click(screen.getByText('Mock Recaptcha'));

    await act(async () => {
      fireEvent.click(screen.getByText('auth.login'));
      await new Promise(resolve => setTimeout(resolve, 500));
    });

    // Wait for orders
    await waitFor(() => {
      expect(screen.getByText('Test Order')).toBeInTheDocument();
    });

    // Click track order button
    const trackOrderButton = screen.getByText('orders.trackOrder');
    console.log('📱 Clicking Track Order button...');

    fireEvent.click(trackOrderButton);

    // Check if modal opens
    await waitFor(() => {
      const modalTitle = screen.getByText('Live Tracking - ORD-001');
      expect(modalTitle).toBeInTheDocument();
      console.log('✅ Live tracking modal opened successfully!');
    });

    // Check if LiveTrackingMap components are rendered
    await waitFor(() => {
      const mapElement = screen.getByTestId('map');
      expect(mapElement).toBeInTheDocument();
      console.log('✅ Map rendered in modal!');
    });
  });

  test('should display error if LiveTrackingMap component is not properly scoped', async () => {
    // Mock console.error to capture React errors
    const consoleSpy = jest.spyOn(console, 'error');
    consoleSpy.mockImplementation(() => {});

    render(<App />);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // Login
    fireEvent.change(screen.getByPlaceholderText('auth.email'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('auth.password'), { target: { value: 'password' } });
    fireEvent.click(screen.getByText('Mock Recaptcha'));

    await act(async () => {
      fireEvent.click(screen.getByText('auth.login'));
      await new Promise(resolve => setTimeout(resolve, 500));
    });

    // Wait for orders
    await waitFor(() => {
      expect(screen.getByText('Test Order')).toBeInTheDocument();
    });

    // Click track order button
    const trackOrderButton = screen.getByText('orders.trackOrder');
    fireEvent.click(trackOrderButton);

    // Check for React errors
    console.log('Checking for React errors...');
    await new Promise(resolve => setTimeout(resolve, 500));

    // If there are errors, they would be logged
    const errorCalls = consoleSpy.mock.calls.filter(call =>
      call[0] && typeof call[0] === 'string' &&
      (call[0].includes('LiveTrackingMap') || call[0].includes('ReferenceError'))
    );

    if (errorCalls.length > 0) {
      console.error('❌ LiveTrackingMap scoping errors found:', errorCalls);
      throw new Error('LiveTrackingMap component scoping issue detected');
    }

    consoleSpy.mockRestore();
  });

  test('should test LiveTrackingMap component directly', () => {
    // Import the component and test it directly
    const { LiveTrackingMap } = require('./App');

    const mockOrder = {
      _id: 'order1',
      orderNumber: 'ORD-001',
      from: { lat: 40.7589, lng: -73.9851 },
      to: { lat: 40.7505, lng: -73.9934 },
      assignedDriver: { userId: '2', name: 'Test Driver' }
    };

    const mockToken = 'test-token';

    expect(() => {
      render(<LiveTrackingMap order={mockOrder} token={mockToken} />);
    }).not.toThrow();

    console.log('✅ LiveTrackingMap component renders without errors!');
  });
});
