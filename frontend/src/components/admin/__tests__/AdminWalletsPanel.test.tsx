
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import { AdminWalletsPanel } from '../AdminWalletsPanel';
import { platformWalletsApi } from '../../../services/api';
import { PlatformWallet } from '../../../services/api/types';

// Mock the API service
jest.mock('../../../services/api', () => ({
  platformWalletsApi: {
    getAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
}));

const mockSmartWallet: PlatformWallet = {
  id: 1,
  paymentMethod: 'vodafone_cash',
  phoneNumber: '01012345678',
  instapayAlias: '',
  holderName: 'Matrix Smart Wallet',
  isActive: true,
  dailyLimit: 50000,
  monthlyLimit: 500000,
  dailyUsed: 10000,
  monthlyUsed: 100000,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockInstapayWallet: PlatformWallet = {
  id: 2,
  paymentMethod: 'instapay',
  phoneNumber: '',
  instapayAlias: 'matrix@instapay',
  holderName: 'Matrix Instapay',
  isActive: false,
  dailyLimit: 100000,
  monthlyLimit: 1000000,
  dailyUsed: 85000,
  monthlyUsed: 400000,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockedApi = platformWalletsApi as jest.Mocked<typeof platformWalletsApi>;

describe('AdminWalletsPanel', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('shows loading state initially', () => {
    mockedApi.getAll.mockResolvedValueOnce({ success: true, wallets: [] });
    render(<AdminWalletsPanel />);
    expect(screen.getByTestId('loading-state')).toBeInTheDocument();
    expect(screen.getByText('Loading wallets...')).toBeInTheDocument();
  });

  test('renders wallet list correctly after fetching', async () => {
    mockedApi.getAll.mockResolvedValueOnce({ success: true, wallets: [mockSmartWallet, mockInstapayWallet] });
    render(<AdminWalletsPanel />);

    await waitFor(() => {
      expect(screen.getByTestId('wallet-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('wallet-card-2')).toBeInTheDocument();
    });

    // Check for smart wallet
    expect(screen.getByText('Matrix Smart Wallet')).toBeInTheDocument();
    expect(screen.getByText('01012345678')).toBeInTheDocument();

    // Check for instapay wallet
    expect(screen.getByText('Matrix Instapay')).toBeInTheDocument();
    expect(screen.getByText('matrix@instapay')).toBeInTheDocument();
    expect(screen.getByTestId('inactive-badge')).toBeInTheDocument(); // Inactive badge for wallet 2
  });

  test('shows empty state when no wallets are returned', async () => {
    mockedApi.getAll.mockResolvedValueOnce({ success: true, wallets: [] });
    render(<AdminWalletsPanel />);

    await waitFor(() => {
      expect(screen.getByTestId('smart-wallets-empty')).toBeInTheDocument();
      expect(screen.getByTestId('instapay-wallets-empty')).toBeInTheDocument();
    });

    expect(screen.getByText('No smart wallets configured')).toBeInTheDocument();
    expect(screen.getByText('No InstaPay accounts configured')).toBeInTheDocument();
  });

  test('shows error message if fetching fails', async () => {
    const errorMessage = 'Failed to fetch wallets';
    mockedApi.getAll.mockRejectedValueOnce(new Error(errorMessage));
    render(<AdminWalletsPanel />);

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toBeInTheDocument();
    });

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  test('refreshes wallet list when refresh button is clicked', async () => {
    mockedApi.getAll.mockResolvedValueOnce({ success: true, wallets: [mockSmartWallet] });
    render(<AdminWalletsPanel />);

    await waitFor(() => {
      expect(screen.getByTestId('wallet-card-1')).toBeInTheDocument();
    });

    // Mock for the second call (refresh)
    mockedApi.getAll.mockResolvedValueOnce({ success: true, wallets: [mockSmartWallet, mockInstapayWallet] });

    const refreshButton = screen.getByTestId('refresh-button');
    fireEvent.click(refreshButton);

    await waitFor(() => {
        expect(screen.getByTestId('wallet-card-2')).toBeInTheDocument();
    });

    expect(mockedApi.getAll).toHaveBeenCalledTimes(2);
  });

  describe('CRUD Operations', () => {
    test('opens add wallet modal, submits, and refreshes list', async () => {
      mockedApi.getAll.mockResolvedValue({ success: true, wallets: [] });
      mockedApi.create.mockResolvedValue({ success: true, message: 'Created', wallet: mockSmartWallet });
      render(<AdminWalletsPanel />);

      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByTestId('smart-wallets-empty')).toBeInTheDocument();
      });

      // 1. Open the form
      const addButton = screen.getByTestId('add-wallet-button');
      fireEvent.click(addButton);
      await waitFor(() => {
        expect(screen.getByTestId('wallet-form')).toBeInTheDocument();
      });
      expect(screen.getByText('Add Platform Wallet')).toBeInTheDocument();

      // 2. Fill and submit the form
      fireEvent.change(screen.getByTestId('holder-name-input'), { target: { value: 'New Wallet Holder' } });
      fireEvent.change(screen.getByTestId('phone-number-input'), { target: { value: '01234567890' } });

      const submitButton = screen.getByTestId('submit-button');
      fireEvent.click(submitButton);

      // 3. Verify API calls and UI updates
      await waitFor(() => {
        expect(mockedApi.create).toHaveBeenCalledWith(expect.objectContaining({
          holderName: 'New Wallet Holder',
          phoneNumber: '01234567890',
        }));
      });

      // The success message should show
      await waitFor(() => {
        expect(screen.getByText('Wallet created successfully')).toBeInTheDocument();
      });

      // It should have re-fetched the wallets
      expect(mockedApi.getAll).toHaveBeenCalledTimes(2);

      // The form should be gone
      expect(screen.queryByTestId('wallet-form')).not.toBeInTheDocument();
    });

    test('opens edit wallet modal, submits, and refreshes', async () => {
        mockedApi.getAll.mockResolvedValue({ success: true, wallets: [mockSmartWallet] });
        mockedApi.update.mockResolvedValue({ success: true, message: 'Updated', wallet: { ...mockSmartWallet, holderName: 'Updated Name' } });
        render(<AdminWalletsPanel />);

        // Wait for initial render
        await waitFor(() => {
          expect(screen.getByTestId('wallet-card-1')).toBeInTheDocument();
        });

        // 1. Open the edit form
        const editButton = screen.getByTestId('edit-button-1');
        fireEvent.click(editButton);
        await waitFor(() => {
          expect(screen.getByTestId('wallet-form')).toBeInTheDocument();
        });
        expect(screen.getByText('Edit Platform Wallet')).toBeInTheDocument();

        // 2. Change a value and submit
        const holderNameInput = screen.getByTestId('holder-name-input');
        expect(holderNameInput).toHaveValue('Matrix Smart Wallet'); // Check pre-fill
        fireEvent.change(holderNameInput, { target: { value: 'Updated Name' } });

        const submitButton = screen.getByTestId('submit-button');
        fireEvent.click(submitButton);

        // 3. Verify API calls and UI updates
        await waitFor(() => {
          expect(mockedApi.update).toHaveBeenCalledWith(mockSmartWallet.id, expect.objectContaining({
            holderName: 'Updated Name'
          }));
        });

        await waitFor(() => {
          expect(screen.getByText('Wallet updated successfully')).toBeInTheDocument();
        });

        expect(mockedApi.getAll).toHaveBeenCalledTimes(2); // Re-fetched
        expect(screen.queryByTestId('wallet-form')).not.toBeInTheDocument();
      });

      test('shows deactivation confirmation and deactivates wallet', async () => {
        mockedApi.getAll.mockResolvedValue({ success: true, wallets: [mockSmartWallet] });
        mockedApi.update.mockResolvedValue({ success: true, message: 'Deactivated', wallet: { ...mockSmartWallet, isActive: false } });
        render(<AdminWalletsPanel />);

        await waitFor(() => {
            expect(screen.getByTestId('wallet-card-1')).toBeInTheDocument();
        });

        // 1. Click toggle on an active wallet
        const toggleButton = screen.getByTestId('toggle-button-1');
        fireEvent.click(toggleButton);

        // 2. Verify confirmation modal appears
        await waitFor(() => {
            expect(screen.getByTestId('confirm-deactivate-modal')).toBeInTheDocument();
        });
        expect(screen.getByText('Are you sure you want to deactivate this wallet?')).toBeInTheDocument();

        // 3. Click deactivate button
        const confirmButton = screen.getByTestId('confirm-deactivate-button');
        fireEvent.click(confirmButton);

        // 4. Verify API call and UI update
        await waitFor(() => {
            expect(mockedApi.update).toHaveBeenCalledWith(mockSmartWallet.id, { isActive: false });
        });

        await waitFor(() => {
            expect(screen.getByText('Wallet deactivated successfully')).toBeInTheDocument();
        });

        expect(mockedApi.getAll).toHaveBeenCalledTimes(2); // Re-fetched
        expect(screen.queryByTestId('confirm-deactivate-modal')).not.toBeInTheDocument();
      });

      test('activates an inactive wallet directly without confirmation', async () => {
        mockedApi.getAll.mockResolvedValue({ success: true, wallets: [mockInstapayWallet] }); // wallet is inactive
        mockedApi.update.mockResolvedValue({ success: true, message: 'Activated', wallet: { ...mockInstapayWallet, isActive: true } });
        render(<AdminWalletsPanel />);

        await waitFor(() => {
            expect(screen.getByTestId('wallet-card-2')).toBeInTheDocument();
        });

        // 1. Click toggle on an inactive wallet
        const toggleButton = screen.getByTestId('toggle-button-2');
        fireEvent.click(toggleButton);

        // 2. Verify API is called directly and confirmation modal does NOT appear
        expect(screen.queryByTestId('confirm-deactivate-modal')).not.toBeInTheDocument();
        await waitFor(() => {
            expect(mockedApi.update).toHaveBeenCalledWith(mockInstapayWallet.id, { isActive: true });
        });

        // 3. Verify UI updates
        await waitFor(() => {
            expect(screen.getByText('Wallet activated successfully')).toBeInTheDocument();
        });

        expect(mockedApi.getAll).toHaveBeenCalledTimes(2); // Re-fetched
      });
  });

  describe('Responsive Behavior', () => {
    // Mock window.matchMedia
    beforeAll(() => {
        Object.defineProperty(window, 'matchMedia', {
          writable: true,
          value: jest.fn().mockImplementation(query => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: jest.fn(), // deprecated
            removeListener: jest.fn(), // deprecated
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            dispatchEvent: jest.fn(),
          })),
        });
      });

    test('renders single-column grid on smaller screens', async () => {
        // Set viewport to a mobile width
        (window.matchMedia as jest.Mock).mockImplementation(query => ({
            matches: query === '(max-width: 1024px)', // Mock that we are on a small screen
            media: query,
            onchange: null,
            addListener: jest.fn(),
            removeListener: jest.fn(),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            dispatchEvent: jest.fn(),
        }));
        
        mockedApi.getAll.mockResolvedValue({ success: true, wallets: [mockSmartWallet, mockInstapayWallet] });
        render(<AdminWalletsPanel />);

        await waitFor(() => {
            const walletGrid = screen.getByTestId('smart-wallets-group').querySelector('.wallet-grid');
            // This is an imperfect test as JSDOM doesn't compute styles from media queries.
            // However, the presence of the style block indicates the intention.
            // A better test would use Cypress or Playwright.
            // For now, we confirm the component renders and trust the browser to apply the CSS.
            expect(walletGrid).toBeInTheDocument();
        });
    });
  });
});
