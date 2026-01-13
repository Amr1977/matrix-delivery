/**
 * Unit Tests for AdminPaymentsPanel Component
 * Tests admin payment verification functionality
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.6, 4.8
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdminPaymentsPanel from '../AdminPaymentsPanel';
import { topupApi } from '../../../services/api/topup';
import type { AdminTopup, AdminTopupListResponse } from '../../../types/topup';

// Mock the topup API
jest.mock('../../../services/api/topup');
const mockTopupApi = topupApi as jest.Mocked<typeof topupApi>;

const mockPendingTopups: AdminTopup[] = [
    {
        id: 1,
        userId: 'user-1',
        userName: 'John Doe',
        userEmail: 'john@example.com',
        userPhone: '01012345678',
        amount: 100,
        paymentMethod: 'vodafone_cash',
        transactionReference: 'TXN001',
        platformWalletId: 1,
        status: 'pending',
        createdAt: '2026-01-13T10:00:00Z',
        updatedAt: '2026-01-13T10:00:00Z'
    },
    {
        id: 2,
        userId: 'user-2',
        userName: 'Jane Smith',
        userEmail: 'jane@example.com',
        userPhone: '01098765432',
        amount: 500,
        paymentMethod: 'instapay',
        transactionReference: 'TXN002',
        platformWalletId: 2,
        status: 'pending',
        createdAt: '2026-01-13T09:00:00Z',
        updatedAt: '2026-01-13T09:00:00Z'
    }
];

const mockApiResponse: AdminTopupListResponse = {
    success: true,
    topups: mockPendingTopups,
    total: 2,
    pendingCount: 2,
    pagination: {
        limit: 50,
        offset: 0,
        hasMore: false
    }
};

describe('AdminPaymentsPanel', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockTopupApi.getPendingTopups.mockResolvedValue(mockApiResponse);
        mockTopupApi.verifyTopup.mockResolvedValue({
            success: true,
            message: 'Top-up verified successfully',
            topup: { ...mockPendingTopups[0], status: 'verified' },
            newBalance: 100
        });
        mockTopupApi.rejectTopup.mockResolvedValue({
            success: true,
            message: 'Top-up rejected',
            topup: { ...mockPendingTopups[0], status: 'rejected', rejectionReason: 'Invalid reference' }
        });
    });

    describe('List Rendering', () => {
        test('renders panel with title', async () => {
            render(<AdminPaymentsPanel />);

            expect(screen.getByTestId('admin-payments-panel')).toBeInTheDocument();
            expect(screen.getByTestId('panel-title')).toHaveTextContent('Payment Verification');
        });

        test('shows loading spinner initially', () => {
            mockTopupApi.getPendingTopups.mockImplementation(() => new Promise(() => {}));
            render(<AdminPaymentsPanel />);

            expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
        });

        test('displays pending topups in table', async () => {
            render(<AdminPaymentsPanel />);

            await waitFor(() => {
                expect(screen.getByTestId('topups-table')).toBeInTheDocument();
            });

            expect(screen.getByTestId('topup-row-1')).toBeInTheDocument();
            expect(screen.getByTestId('topup-row-2')).toBeInTheDocument();
        });

        test('displays user info correctly', async () => {
            render(<AdminPaymentsPanel />);

            await waitFor(() => {
                expect(screen.getByTestId('topup-user-name-1')).toHaveTextContent('John Doe');
            });

            expect(screen.getByTestId('topup-user-email-1')).toHaveTextContent('john@example.com');
        });

        test('displays payment method badge', async () => {
            render(<AdminPaymentsPanel />);

            await waitFor(() => {
                expect(screen.getByTestId('topup-method-1')).toHaveTextContent('Vodafone Cash');
            });

            expect(screen.getByTestId('topup-method-2')).toHaveTextContent('InstaPay');
        });

        test('displays transaction reference', async () => {
            render(<AdminPaymentsPanel />);

            await waitFor(() => {
                expect(screen.getByTestId('topup-reference-1')).toHaveTextContent('TXN001');
            });

            expect(screen.getByTestId('topup-reference-2')).toHaveTextContent('TXN002');
        });

        test('displays amount correctly', async () => {
            render(<AdminPaymentsPanel />);

            await waitFor(() => {
                expect(screen.getByTestId('topup-amount-1')).toBeInTheDocument();
            });
        });

        test('shows pending count badge after data loads', async () => {
            render(<AdminPaymentsPanel />);

            await waitFor(() => {
                expect(screen.getByTestId('pending-count-value')).toHaveTextContent('2 Pending');
            });
        });

        test('shows empty state when no pending topups', async () => {
            mockTopupApi.getPendingTopups.mockResolvedValue({
                ...mockApiResponse,
                topups: [],
                total: 0,
                pendingCount: 0
            });

            render(<AdminPaymentsPanel />);

            await waitFor(() => {
                expect(screen.getByText('All Caught Up!')).toBeInTheDocument();
            });
        });

        test('shows error message on API failure', async () => {
            mockTopupApi.getPendingTopups.mockRejectedValue({ error: 'Network error' });

            render(<AdminPaymentsPanel />);

            await waitFor(() => {
                expect(screen.getByTestId('error-message')).toBeInTheDocument();
            });

            expect(screen.getByTestId('error-message')).toHaveTextContent('Network error');
        });

        test('calls onPendingCountChange callback', async () => {
            const onPendingCountChange = jest.fn();
            render(<AdminPaymentsPanel onPendingCountChange={onPendingCountChange} />);

            await waitFor(() => {
                expect(onPendingCountChange).toHaveBeenCalledWith(2);
            });
        });
    });

    describe('Verify Action', () => {
        test('opens verify dialog when verify button clicked', async () => {
            render(<AdminPaymentsPanel />);

            await waitFor(() => {
                expect(screen.getByTestId('verify-button-1')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByTestId('verify-button-1'));

            expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
            expect(screen.getByTestId('dialog-title')).toHaveTextContent('Verify Top-Up');
        });

        test('shows topup details in verify dialog', async () => {
            render(<AdminPaymentsPanel />);

            await waitFor(() => {
                expect(screen.getByTestId('verify-button-1')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByTestId('verify-button-1'));

            expect(screen.getByTestId('dialog-user')).toHaveTextContent('John Doe');
            expect(screen.getByTestId('dialog-reference')).toHaveTextContent('TXN001');
            expect(screen.getByTestId('dialog-method')).toHaveTextContent('Vodafone Cash');
        });

        test('verifies topup when confirm clicked', async () => {
            render(<AdminPaymentsPanel />);

            await waitFor(() => {
                expect(screen.getByTestId('verify-button-1')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByTestId('verify-button-1'));
            fireEvent.click(screen.getByTestId('dialog-verify-button'));

            await waitFor(() => {
                expect(mockTopupApi.verifyTopup).toHaveBeenCalledWith(1);
            });
        });

        test('closes dialog and refreshes list after verify', async () => {
            render(<AdminPaymentsPanel />);

            await waitFor(() => {
                expect(screen.getByTestId('verify-button-1')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByTestId('verify-button-1'));
            fireEvent.click(screen.getByTestId('dialog-verify-button'));

            await waitFor(() => {
                expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument();
            });
        });

        test('closes dialog when cancel clicked', async () => {
            render(<AdminPaymentsPanel />);

            await waitFor(() => {
                expect(screen.getByTestId('verify-button-1')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByTestId('verify-button-1'));
            fireEvent.click(screen.getByTestId('dialog-cancel-button'));

            expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument();
        });

        test('shows error when verify fails', async () => {
            mockTopupApi.verifyTopup.mockRejectedValue({ error: 'Verification failed' });

            render(<AdminPaymentsPanel />);

            await waitFor(() => {
                expect(screen.getByTestId('verify-button-1')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByTestId('verify-button-1'));
            fireEvent.click(screen.getByTestId('dialog-verify-button'));

            await waitFor(() => {
                expect(screen.getByTestId('action-error')).toHaveTextContent('Verification failed');
            });
        });
    });

    describe('Reject Action', () => {
        test('opens reject dialog when reject button clicked', async () => {
            render(<AdminPaymentsPanel />);

            await waitFor(() => {
                expect(screen.getByTestId('reject-button-1')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByTestId('reject-button-1'));

            expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
            expect(screen.getByTestId('dialog-title')).toHaveTextContent('Reject Top-Up');
        });

        test('shows reason input in reject dialog', async () => {
            render(<AdminPaymentsPanel />);

            await waitFor(() => {
                expect(screen.getByTestId('reject-button-1')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByTestId('reject-button-1'));

            expect(screen.getByTestId('reject-reason-input')).toBeInTheDocument();
        });

        test('reject button disabled without reason', async () => {
            render(<AdminPaymentsPanel />);

            await waitFor(() => {
                expect(screen.getByTestId('reject-button-1')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByTestId('reject-button-1'));

            expect(screen.getByTestId('dialog-reject-button')).toBeDisabled();
        });

        test('reject button enabled with reason', async () => {
            render(<AdminPaymentsPanel />);

            await waitFor(() => {
                expect(screen.getByTestId('reject-button-1')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByTestId('reject-button-1'));
            fireEvent.change(screen.getByTestId('reject-reason-input'), {
                target: { value: 'Invalid reference' }
            });

            expect(screen.getByTestId('dialog-reject-button')).not.toBeDisabled();
        });

        test('rejects topup with reason when confirm clicked', async () => {
            render(<AdminPaymentsPanel />);

            await waitFor(() => {
                expect(screen.getByTestId('reject-button-1')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByTestId('reject-button-1'));
            fireEvent.change(screen.getByTestId('reject-reason-input'), {
                target: { value: 'Invalid reference' }
            });
            fireEvent.click(screen.getByTestId('dialog-reject-button'));

            await waitFor(() => {
                expect(mockTopupApi.rejectTopup).toHaveBeenCalledWith(1, 'Invalid reference');
            });
        });

        test('closes dialog and refreshes list after reject', async () => {
            render(<AdminPaymentsPanel />);

            await waitFor(() => {
                expect(screen.getByTestId('reject-button-1')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByTestId('reject-button-1'));
            fireEvent.change(screen.getByTestId('reject-reason-input'), {
                target: { value: 'Invalid reference' }
            });
            fireEvent.click(screen.getByTestId('dialog-reject-button'));

            await waitFor(() => {
                expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument();
            });
        });

        test('shows error when reject fails', async () => {
            mockTopupApi.rejectTopup.mockRejectedValue({ error: 'Rejection failed' });

            render(<AdminPaymentsPanel />);

            await waitFor(() => {
                expect(screen.getByTestId('reject-button-1')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByTestId('reject-button-1'));
            fireEvent.change(screen.getByTestId('reject-reason-input'), {
                target: { value: 'Invalid reference' }
            });
            fireEvent.click(screen.getByTestId('dialog-reject-button'));

            await waitFor(() => {
                expect(screen.getByTestId('action-error')).toHaveTextContent('Rejection failed');
            });
        });
    });

    describe('Filtering', () => {
        test('filters panel is hidden by default', async () => {
            render(<AdminPaymentsPanel />);

            await waitFor(() => {
                expect(screen.getByTestId('topups-table')).toBeInTheDocument();
            });

            expect(screen.queryByTestId('filters-panel')).not.toBeInTheDocument();
        });

        test('shows filters panel when toggle clicked', async () => {
            render(<AdminPaymentsPanel />);

            await waitFor(() => {
                expect(screen.getByTestId('topups-table')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByTestId('toggle-filters-button'));

            expect(screen.getByTestId('filters-panel')).toBeInTheDocument();
        });

        test('hides filters panel when toggle clicked again', async () => {
            render(<AdminPaymentsPanel />);

            await waitFor(() => {
                expect(screen.getByTestId('topups-table')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByTestId('toggle-filters-button'));
            expect(screen.getByTestId('filters-panel')).toBeInTheDocument();

            fireEvent.click(screen.getByTestId('toggle-filters-button'));
            expect(screen.queryByTestId('filters-panel')).not.toBeInTheDocument();
        });

        test('shows payment method filter dropdown', async () => {
            render(<AdminPaymentsPanel />);

            await waitFor(() => {
                expect(screen.getByTestId('topups-table')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByTestId('toggle-filters-button'));

            expect(screen.getByTestId('payment-method-filter')).toBeInTheDocument();
        });

        test('shows date range filters', async () => {
            render(<AdminPaymentsPanel />);

            await waitFor(() => {
                expect(screen.getByTestId('topups-table')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByTestId('toggle-filters-button'));

            expect(screen.getByTestId('start-date-filter')).toBeInTheDocument();
            expect(screen.getByTestId('end-date-filter')).toBeInTheDocument();
        });

        test('clears filters when clear button clicked', async () => {
            render(<AdminPaymentsPanel />);

            await waitFor(() => {
                expect(screen.getByTestId('topups-table')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByTestId('toggle-filters-button'));
            fireEvent.change(screen.getByTestId('payment-method-filter'), {
                target: { value: 'vodafone_cash' }
            });
            fireEvent.click(screen.getByTestId('clear-filters-button'));

            const filterSelect = screen.getByTestId('payment-method-filter') as HTMLSelectElement;
            expect(filterSelect.value).toBe('');
        });
    });

    describe('Refresh', () => {
        test('refresh button is present', async () => {
            render(<AdminPaymentsPanel />);

            await waitFor(() => {
                expect(screen.getByTestId('refresh-button')).toBeInTheDocument();
            });
        });

        test('shows last update time after data loads', async () => {
            render(<AdminPaymentsPanel />);

            await waitFor(() => {
                expect(screen.getByTestId('topups-table')).toBeInTheDocument();
            });

            expect(screen.getByTestId('last-update').textContent).toContain('Last updated:');
        });
    });
});
