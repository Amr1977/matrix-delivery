/**
 * WalletForm Component Tests
 * Tests form rendering, validation, conditional fields, and submission
 * 
 * Requirements: 4.1-4.9, 5.1-5.6
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WalletForm } from '../WalletForm';
import { PlatformWallet, WalletFormData } from '../../../services/api/types';

// Mock wallet data
const mockWallet: PlatformWallet = {
    id: 1,
    paymentMethod: 'vodafone_cash',
    phoneNumber: '01012345678',
    instapayAlias: '',
    holderName: 'Matrix Delivery LLC',
    dailyLimit: 50000,
    monthlyLimit: 500000,
    dailyUsed: 25000,
    monthlyUsed: 150000,
    isActive: true,
    lastResetDaily: '2025-01-13T00:00:00Z',
    lastResetMonthly: '2025-01-01T00:00:00Z',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-13T10:00:00Z'
};

const mockInstapayWallet: PlatformWallet = {
    ...mockWallet,
    id: 2,
    paymentMethod: 'instapay',
    phoneNumber: '',
    instapayAlias: 'matrix@instapay'
};

describe('WalletForm', () => {
    const mockOnSubmit = jest.fn();
    const mockOnCancel = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Rendering', () => {
        test('renders create form with default values', () => {
            render(
                <WalletForm
                    onSubmit={mockOnSubmit}
                    onCancel={mockOnCancel}
                />
            );

            expect(screen.getByTestId('wallet-form-modal')).toBeInTheDocument();
            expect(screen.getByText('Add Platform Wallet')).toBeInTheDocument();
            expect(screen.getByTestId('payment-method-select')).toHaveValue('vodafone_cash');
            expect(screen.getByTestId('daily-limit-input')).toHaveValue(50000);
            expect(screen.getByTestId('monthly-limit-input')).toHaveValue(500000);
        });

        test('renders edit form with wallet data pre-filled', () => {
            render(
                <WalletForm
                    wallet={mockWallet}
                    onSubmit={mockOnSubmit}
                    onCancel={mockOnCancel}
                />
            );

            expect(screen.getByText('Edit Platform Wallet')).toBeInTheDocument();
            expect(screen.getByTestId('payment-method-select')).toHaveValue('vodafone_cash');
            expect(screen.getByTestId('payment-method-select')).toBeDisabled();
            expect(screen.getByTestId('phone-number-input')).toHaveValue('01012345678');
            expect(screen.getByTestId('holder-name-input')).toHaveValue('Matrix Delivery LLC');
            expect(screen.getByTestId('daily-limit-input')).toHaveValue(50000);
            expect(screen.getByTestId('monthly-limit-input')).toHaveValue(500000);
        });

        test('shows phone number field for smart wallets', () => {
            render(
                <WalletForm
                    onSubmit={mockOnSubmit}
                    onCancel={mockOnCancel}
                />
            );

            expect(screen.getByTestId('phone-number-input')).toBeInTheDocument();
            expect(screen.queryByTestId('instapay-alias-input')).not.toBeInTheDocument();
        });

        test('shows InstaPay alias field for InstaPay', async () => {
            const user = userEvent.setup();
            
            render(
                <WalletForm
                    onSubmit={mockOnSubmit}
                    onCancel={mockOnCancel}
                />
            );

            await user.selectOptions(screen.getByTestId('payment-method-select'), 'instapay');

            expect(screen.getByTestId('instapay-alias-input')).toBeInTheDocument();
            expect(screen.queryByTestId('phone-number-input')).not.toBeInTheDocument();
        });
    });

    describe('Conditional Fields', () => {
        test('switches between phone number and InstaPay alias fields', async () => {
            const user = userEvent.setup();
            
            render(
                <WalletForm
                    onSubmit={mockOnSubmit}
                    onCancel={mockOnCancel}
                />
            );

            // Initially shows phone number for smart wallet
            expect(screen.getByTestId('phone-number-input')).toBeInTheDocument();
            expect(screen.queryByTestId('instapay-alias-input')).not.toBeInTheDocument();

            // Switch to InstaPay
            await user.selectOptions(screen.getByTestId('payment-method-select'), 'instapay');
            expect(screen.getByTestId('instapay-alias-input')).toBeInTheDocument();
            expect(screen.queryByTestId('phone-number-input')).not.toBeInTheDocument();

            // Switch back to smart wallet
            await user.selectOptions(screen.getByTestId('payment-method-select'), 'orange_money');
            expect(screen.getByTestId('phone-number-input')).toBeInTheDocument();
            expect(screen.queryByTestId('instapay-alias-input')).not.toBeInTheDocument();
        });

        test('clears fields when switching payment methods', async () => {
            const user = userEvent.setup();
            
            render(
                <WalletForm
                    onSubmit={mockOnSubmit}
                    onCancel={mockOnCancel}
                />
            );

            // Enter phone number
            await user.type(screen.getByTestId('phone-number-input'), '01012345678');
            expect(screen.getByTestId('phone-number-input')).toHaveValue('01012345678');

            // Switch to InstaPay - phone number should be cleared
            await user.selectOptions(screen.getByTestId('payment-method-select'), 'instapay');
            
            // Enter InstaPay alias
            await user.type(screen.getByTestId('instapay-alias-input'), 'test@instapay');
            expect(screen.getByTestId('instapay-alias-input')).toHaveValue('test@instapay');

            // Switch back to smart wallet - InstaPay alias should be cleared
            await user.selectOptions(screen.getByTestId('payment-method-select'), 'vodafone_cash');
            expect(screen.getByTestId('phone-number-input')).toHaveValue('');
        });
    });

    describe('Form Validation', () => {
        test('validates required fields', async () => {
            const user = userEvent.setup();
            
            render(
                <WalletForm
                    onSubmit={mockOnSubmit}
                    onCancel={mockOnCancel}
                />
            );

            // Submit empty form
            await user.click(screen.getByTestId('submit-button'));

            expect(screen.getByTestId('phone-number-error')).toHaveTextContent('Phone number is required for smart wallets');
            expect(screen.getByTestId('holder-name-error')).toHaveTextContent('Holder name is required');
            expect(mockOnSubmit).not.toHaveBeenCalled();
        });

        test('validates phone number format', async () => {
            const user = userEvent.setup();
            
            render(
                <WalletForm
                    onSubmit={mockOnSubmit}
                    onCancel={mockOnCancel}
                />
            );

            await user.type(screen.getByTestId('phone-number-input'), '123');
            await user.type(screen.getByTestId('holder-name-input'), 'Test Holder');
            await user.click(screen.getByTestId('submit-button'));

            expect(screen.getByTestId('phone-number-error')).toHaveTextContent('Please enter a valid phone number');
            expect(mockOnSubmit).not.toHaveBeenCalled();
        });

        test('validates InstaPay alias is required', async () => {
            const user = userEvent.setup();
            
            render(
                <WalletForm
                    onSubmit={mockOnSubmit}
                    onCancel={mockOnCancel}
                />
            );

            await user.selectOptions(screen.getByTestId('payment-method-select'), 'instapay');
            await user.type(screen.getByTestId('holder-name-input'), 'Test Holder');
            await user.click(screen.getByTestId('submit-button'));

            expect(screen.getByTestId('instapay-alias-error')).toHaveTextContent('InstaPay alias is required');
            expect(mockOnSubmit).not.toHaveBeenCalled();
        });

        test('validates daily limit is positive', async () => {
            const user = userEvent.setup();
            
            render(
                <WalletForm
                    onSubmit={mockOnSubmit}
                    onCancel={mockOnCancel}
                />
            );

            await user.clear(screen.getByTestId('daily-limit-input'));
            await user.type(screen.getByTestId('daily-limit-input'), '0');
            await user.type(screen.getByTestId('phone-number-input'), '01012345678');
            await user.type(screen.getByTestId('holder-name-input'), 'Test Holder');
            await user.click(screen.getByTestId('submit-button'));

            expect(screen.getByTestId('daily-limit-error')).toHaveTextContent('Daily limit must be a positive number');
            expect(mockOnSubmit).not.toHaveBeenCalled();
        });

        test('validates daily limit does not exceed monthly limit', async () => {
            const user = userEvent.setup();
            
            render(
                <WalletForm
                    onSubmit={mockOnSubmit}
                    onCancel={mockOnCancel}
                />
            );

            await user.clear(screen.getByTestId('daily-limit-input'));
            await user.type(screen.getByTestId('daily-limit-input'), '600000');
            await user.type(screen.getByTestId('phone-number-input'), '01012345678');
            await user.type(screen.getByTestId('holder-name-input'), 'Test Holder');
            await user.click(screen.getByTestId('submit-button'));

            expect(screen.getByTestId('daily-limit-error')).toHaveTextContent('Daily limit cannot exceed monthly limit');
            expect(mockOnSubmit).not.toHaveBeenCalled();
        });

        test('clears errors when fields are corrected', async () => {
            const user = userEvent.setup();
            
            render(
                <WalletForm
                    onSubmit={mockOnSubmit}
                    onCancel={mockOnCancel}
                />
            );

            // Submit to trigger errors
            await user.click(screen.getByTestId('submit-button'));
            expect(screen.getByTestId('phone-number-error')).toBeInTheDocument();

            // Fix the error
            await user.type(screen.getByTestId('phone-number-input'), '01012345678');
            expect(screen.queryByTestId('phone-number-error')).not.toBeInTheDocument();
        });
    });

    describe('Form Submission', () => {
        test('submits valid smart wallet form', async () => {
            const user = userEvent.setup();
            mockOnSubmit.mockResolvedValue(undefined);
            
            render(
                <WalletForm
                    onSubmit={mockOnSubmit}
                    onCancel={mockOnCancel}
                />
            );

            await user.type(screen.getByTestId('phone-number-input'), '01012345678');
            await user.type(screen.getByTestId('holder-name-input'), 'Test Holder');
            await user.clear(screen.getByTestId('daily-limit-input'));
            await user.type(screen.getByTestId('daily-limit-input'), '30000');
            await user.clear(screen.getByTestId('monthly-limit-input'));
            await user.type(screen.getByTestId('monthly-limit-input'), '300000');

            await user.click(screen.getByTestId('submit-button'));

            await waitFor(() => {
                expect(mockOnSubmit).toHaveBeenCalledWith({
                    paymentMethod: 'vodafone_cash',
                    phoneNumber: '01012345678',
                    instapayAlias: '',
                    holderName: 'Test Holder',
                    dailyLimit: 30000,
                    monthlyLimit: 300000
                });
            });
        });

        test('submits valid InstaPay form', async () => {
            const user = userEvent.setup();
            mockOnSubmit.mockResolvedValue(undefined);
            
            render(
                <WalletForm
                    onSubmit={mockOnSubmit}
                    onCancel={mockOnCancel}
                />
            );

            await user.selectOptions(screen.getByTestId('payment-method-select'), 'instapay');
            await user.type(screen.getByTestId('instapay-alias-input'), 'test@instapay');
            await user.type(screen.getByTestId('holder-name-input'), 'Test Holder');

            await user.click(screen.getByTestId('submit-button'));

            await waitFor(() => {
                expect(mockOnSubmit).toHaveBeenCalledWith({
                    paymentMethod: 'instapay',
                    phoneNumber: '',
                    instapayAlias: 'test@instapay',
                    holderName: 'Test Holder',
                    dailyLimit: 50000,
                    monthlyLimit: 500000
                });
            });
        });

        test('shows loading state during submission', async () => {
            const user = userEvent.setup();
            
            render(
                <WalletForm
                    onSubmit={mockOnSubmit}
                    onCancel={mockOnCancel}
                    loading={true}
                />
            );

            expect(screen.getByText('Saving...')).toBeInTheDocument();
            expect(screen.getByTestId('submit-button')).toBeDisabled();
            expect(screen.getByTestId('cancel-button')).toBeDisabled();
            expect(screen.getByTestId('close-button')).toBeDisabled();
        });

        test('handles submission error', async () => {
            const user = userEvent.setup();
            mockOnSubmit.mockRejectedValue(new Error('Network error'));
            
            render(
                <WalletForm
                    onSubmit={mockOnSubmit}
                    onCancel={mockOnCancel}
                />
            );

            await user.type(screen.getByTestId('phone-number-input'), '01012345678');
            await user.type(screen.getByTestId('holder-name-input'), 'Test Holder');
            await user.click(screen.getByTestId('submit-button'));

            await waitFor(() => {
                expect(screen.getByTestId('submit-error')).toHaveTextContent('Network error');
            });
        });
    });

    describe('User Interactions', () => {
        test('calls onCancel when cancel button is clicked', async () => {
            const user = userEvent.setup();
            
            render(
                <WalletForm
                    onSubmit={mockOnSubmit}
                    onCancel={mockOnCancel}
                />
            );

            await user.click(screen.getByTestId('cancel-button'));
            expect(mockOnCancel).toHaveBeenCalled();
        });

        test('calls onCancel when close button is clicked', async () => {
            const user = userEvent.setup();
            
            render(
                <WalletForm
                    onSubmit={mockOnSubmit}
                    onCancel={mockOnCancel}
                />
            );

            await user.click(screen.getByTestId('close-button'));
            expect(mockOnCancel).toHaveBeenCalled();
        });

        test('prevents form submission on Enter key in input fields', () => {
            render(
                <WalletForm
                    onSubmit={mockOnSubmit}
                    onCancel={mockOnCancel}
                />
            );

            const phoneInput = screen.getByTestId('phone-number-input');
            fireEvent.keyDown(phoneInput, { key: 'Enter', code: 'Enter' });
            
            // Form should not be submitted without explicit button click
            expect(mockOnSubmit).not.toHaveBeenCalled();
        });
    });

    describe('Edit Mode', () => {
        test('disables payment method selection in edit mode', () => {
            render(
                <WalletForm
                    wallet={mockWallet}
                    onSubmit={mockOnSubmit}
                    onCancel={mockOnCancel}
                />
            );

            expect(screen.getByTestId('payment-method-select')).toBeDisabled();
        });

        test('shows correct button text in edit mode', () => {
            render(
                <WalletForm
                    wallet={mockWallet}
                    onSubmit={mockOnSubmit}
                    onCancel={mockOnCancel}
                />
            );

            expect(screen.getByText('Update Wallet')).toBeInTheDocument();
        });

        test('pre-fills InstaPay wallet data correctly', () => {
            render(
                <WalletForm
                    wallet={mockInstapayWallet}
                    onSubmit={mockOnSubmit}
                    onCancel={mockOnCancel}
                />
            );

            expect(screen.getByTestId('payment-method-select')).toHaveValue('instapay');
            expect(screen.getByTestId('instapay-alias-input')).toHaveValue('matrix@instapay');
            expect(screen.queryByTestId('phone-number-input')).not.toBeInTheDocument();
        });
    });
});