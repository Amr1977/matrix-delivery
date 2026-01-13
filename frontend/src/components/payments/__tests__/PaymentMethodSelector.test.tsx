/**
 * Unit Tests for PaymentMethodSelector Component
 * 
 * Tests for Egypt Phase 1 payment methods:
 * - Smart Wallets (combined entry for Vodafone Cash, Orange Money, Etisalat Cash, WE Pay)
 * - InstaPay (bank transfers)
 * 
 * Requirements: 1.1, 2.1
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import PaymentMethodSelector, { 
    EGYPT_PAYMENT_METHODS, 
    PaymentMethod 
} from '../PaymentMethodSelector';

describe('PaymentMethodSelector', () => {
    const mockOnSelect = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Rendering', () => {
        test('renders exactly 2 payment options (Smart Wallets and InstaPay)', () => {
            render(<PaymentMethodSelector onSelect={mockOnSelect} />);

            const grid = screen.getByTestId('payment-methods-grid');
            const paymentCards = grid.querySelectorAll('.payment-method-card');
            
            expect(paymentCards).toHaveLength(2);
        });

        test('renders Smart Wallets option', () => {
            render(<PaymentMethodSelector onSelect={mockOnSelect} />);

            expect(screen.getByTestId('payment-method-smart_wallets')).toBeInTheDocument();
            expect(screen.getByTestId('method-name-smart_wallets')).toHaveTextContent('Smart Wallets');
            expect(screen.getByTestId('method-description-smart_wallets')).toHaveTextContent(
                'Vodafone Cash, Orange Money, Etisalat Cash, WE Pay'
            );
        });

        test('renders InstaPay option', () => {
            render(<PaymentMethodSelector onSelect={mockOnSelect} />);

            expect(screen.getByTestId('payment-method-instapay')).toBeInTheDocument();
            expect(screen.getByTestId('method-name-instapay')).toHaveTextContent('InstaPay');
            expect(screen.getByTestId('method-description-instapay')).toHaveTextContent(
                'Bank transfer via InstaPay'
            );
        });

        test('renders selector title', () => {
            render(<PaymentMethodSelector onSelect={mockOnSelect} />);

            expect(screen.getByTestId('selector-title')).toHaveTextContent('Select Payment Method');
        });

        test('does not render card, crypto, or COD options', () => {
            render(<PaymentMethodSelector onSelect={mockOnSelect} />);

            expect(screen.queryByTestId('payment-method-card')).not.toBeInTheDocument();
            expect(screen.queryByTestId('payment-method-crypto')).not.toBeInTheDocument();
            expect(screen.queryByTestId('payment-method-cod')).not.toBeInTheDocument();
        });

        test('does not display fee information', () => {
            render(<PaymentMethodSelector onSelect={mockOnSelect} />);

            // Fee-related elements should not exist
            expect(screen.queryByText(/fee/i)).not.toBeInTheDocument();
            expect(screen.queryByText(/2\.5%/i)).not.toBeInTheDocument();
            expect(screen.queryByTestId('payment-summary')).not.toBeInTheDocument();
        });
    });

    describe('Selection Callback', () => {
        test('calls onSelect when Smart Wallets is clicked', () => {
            render(<PaymentMethodSelector onSelect={mockOnSelect} />);

            fireEvent.click(screen.getByTestId('payment-method-smart_wallets'));

            expect(mockOnSelect).toHaveBeenCalledTimes(1);
            expect(mockOnSelect).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: 'smart_wallets',
                    type: 'smart_wallets',
                    name: 'Smart Wallets'
                })
            );
        });

        test('calls onSelect when InstaPay is clicked', () => {
            render(<PaymentMethodSelector onSelect={mockOnSelect} />);

            fireEvent.click(screen.getByTestId('payment-method-instapay'));

            expect(mockOnSelect).toHaveBeenCalledTimes(1);
            expect(mockOnSelect).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: 'instapay',
                    type: 'instapay',
                    name: 'InstaPay'
                })
            );
        });

        test('shows selected indicator when method is selected', () => {
            render(<PaymentMethodSelector onSelect={mockOnSelect} />);

            // Initially no selected indicator
            expect(screen.queryByTestId('selected-indicator-smart_wallets')).not.toBeInTheDocument();

            // Click to select
            fireEvent.click(screen.getByTestId('payment-method-smart_wallets'));

            // Selected indicator should appear
            expect(screen.getByTestId('selected-indicator-smart_wallets')).toBeInTheDocument();
        });

        test('updates selection when different method is clicked', () => {
            render(<PaymentMethodSelector onSelect={mockOnSelect} />);

            // Select Smart Wallets first
            fireEvent.click(screen.getByTestId('payment-method-smart_wallets'));
            expect(screen.getByTestId('selected-indicator-smart_wallets')).toBeInTheDocument();

            // Select InstaPay
            fireEvent.click(screen.getByTestId('payment-method-instapay'));
            
            // Smart Wallets should no longer be selected
            expect(screen.queryByTestId('selected-indicator-smart_wallets')).not.toBeInTheDocument();
            // InstaPay should be selected
            expect(screen.getByTestId('selected-indicator-instapay')).toBeInTheDocument();
        });

        test('supports keyboard navigation with Enter key', () => {
            render(<PaymentMethodSelector onSelect={mockOnSelect} />);

            const smartWalletsCard = screen.getByTestId('payment-method-smart_wallets');
            fireEvent.keyDown(smartWalletsCard, { key: 'Enter' });

            expect(mockOnSelect).toHaveBeenCalledWith(
                expect.objectContaining({ id: 'smart_wallets' })
            );
        });

        test('supports keyboard navigation with Space key', () => {
            render(<PaymentMethodSelector onSelect={mockOnSelect} />);

            const instapayCard = screen.getByTestId('payment-method-instapay');
            fireEvent.keyDown(instapayCard, { key: ' ' });

            expect(mockOnSelect).toHaveBeenCalledWith(
                expect.objectContaining({ id: 'instapay' })
            );
        });
    });

    describe('Pre-selected Method', () => {
        test('shows selected indicator for pre-selected method', () => {
            render(
                <PaymentMethodSelector 
                    onSelect={mockOnSelect} 
                    selectedMethodId="instapay" 
                />
            );

            expect(screen.getByTestId('selected-indicator-instapay')).toBeInTheDocument();
            expect(screen.queryByTestId('selected-indicator-smart_wallets')).not.toBeInTheDocument();
        });
    });

    describe('Arabic Language Support', () => {
        test('renders Arabic text when language is ar', () => {
            render(<PaymentMethodSelector onSelect={mockOnSelect} language="ar" />);

            expect(screen.getByTestId('selector-title')).toHaveTextContent('اختر طريقة الدفع');
            expect(screen.getByTestId('method-name-smart_wallets')).toHaveTextContent('المحافظ الذكية');
            expect(screen.getByTestId('method-name-instapay')).toHaveTextContent('انستاباي');
        });

        test('sets RTL direction for Arabic', () => {
            render(<PaymentMethodSelector onSelect={mockOnSelect} language="ar" />);

            const selector = screen.getByTestId('payment-method-selector');
            expect(selector).toHaveAttribute('dir', 'rtl');
        });
    });

    describe('Accessibility', () => {
        test('payment cards have role button', () => {
            render(<PaymentMethodSelector onSelect={mockOnSelect} />);

            const smartWalletsCard = screen.getByTestId('payment-method-smart_wallets');
            expect(smartWalletsCard).toHaveAttribute('role', 'button');
        });

        test('payment cards have tabIndex for keyboard navigation', () => {
            render(<PaymentMethodSelector onSelect={mockOnSelect} />);

            const smartWalletsCard = screen.getByTestId('payment-method-smart_wallets');
            expect(smartWalletsCard).toHaveAttribute('tabIndex', '0');
        });

        test('payment cards have aria-pressed attribute', () => {
            render(<PaymentMethodSelector onSelect={mockOnSelect} />);

            const smartWalletsCard = screen.getByTestId('payment-method-smart_wallets');
            expect(smartWalletsCard).toHaveAttribute('aria-pressed', 'false');

            fireEvent.click(smartWalletsCard);
            expect(smartWalletsCard).toHaveAttribute('aria-pressed', 'true');
        });
    });

    describe('EGYPT_PAYMENT_METHODS constant', () => {
        test('exports exactly 2 payment methods', () => {
            expect(EGYPT_PAYMENT_METHODS).toHaveLength(2);
        });

        test('contains smart_wallets method', () => {
            const smartWallets = EGYPT_PAYMENT_METHODS.find(m => m.id === 'smart_wallets');
            expect(smartWallets).toBeDefined();
            expect(smartWallets?.type).toBe('smart_wallets');
        });

        test('contains instapay method', () => {
            const instapay = EGYPT_PAYMENT_METHODS.find(m => m.id === 'instapay');
            expect(instapay).toBeDefined();
            expect(instapay?.type).toBe('instapay');
        });

        test('all methods have required fields', () => {
            EGYPT_PAYMENT_METHODS.forEach(method => {
                expect(method.id).toBeDefined();
                expect(method.name).toBeDefined();
                expect(method.nameAr).toBeDefined();
                expect(method.icon).toBeDefined();
                expect(method.description).toBeDefined();
                expect(method.descriptionAr).toBeDefined();
                expect(method.type).toBeDefined();
            });
        });
    });
});
