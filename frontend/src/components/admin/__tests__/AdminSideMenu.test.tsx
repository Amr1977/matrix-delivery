/**
 * AdminSideMenu Component Tests
 * Tests for the admin side navigation menu
 * 
 * Requirements: 1.1-1.9, 2.1-2.7
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdminSideMenu, { MENU_ITEMS } from '../AdminSideMenu';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
    BarChart3: () => <div data-testid="icon-bar-chart" />,
    Activity: () => <div data-testid="icon-activity" />,
    CreditCard: () => <div data-testid="icon-credit-card" />,
    Users: () => <div data-testid="icon-users" />,
    Package: () => <div data-testid="icon-package" />,
    TrendingUp: () => <div data-testid="icon-trending-up" />,
    FileText: () => <div data-testid="icon-file-text" />,
    Settings: () => <div data-testid="icon-settings" />,
    ChevronDown: () => <div data-testid="icon-chevron-down" />,
    ChevronRight: () => <div data-testid="icon-chevron-right" />,
    Menu: () => <div data-testid="icon-menu" />,
    X: () => <div data-testid="icon-x" />,
    Wallet: () => <div data-testid="icon-wallet" />,
    CheckCircle: () => <div data-testid="icon-check-circle" />
}));

describe('AdminSideMenu', () => {
    const mockOnItemSelect = jest.fn();
    const mockOnToggleCollapse = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Rendering', () => {
        test('renders side menu with all menu items', () => {
            render(
                <AdminSideMenu
                    activeItem="overview"
                    onItemSelect={mockOnItemSelect}
                />
            );

            expect(screen.getByTestId('admin-side-menu')).toBeInTheDocument();
            expect(screen.getByTestId('menu-nav')).toBeInTheDocument();

            // Check all main menu items are rendered
            MENU_ITEMS.forEach(item => {
                expect(screen.getByTestId(`menu-item-${item.id}`)).toBeInTheDocument();
                expect(screen.getByText(item.label)).toBeInTheDocument();
            });
        });

        test('renders menu items with icons', () => {
            render(
                <AdminSideMenu
                    activeItem="overview"
                    onItemSelect={mockOnItemSelect}
                />
            );

            // Check icons are rendered
            expect(screen.getByTestId('icon-bar-chart')).toBeInTheDocument();
            expect(screen.getByTestId('icon-activity')).toBeInTheDocument();
            expect(screen.getByTestId('icon-credit-card')).toBeInTheDocument();
            expect(screen.getByTestId('icon-users')).toBeInTheDocument();
        });

        test('highlights active menu item', () => {
            render(
                <AdminSideMenu
                    activeItem="users"
                    onItemSelect={mockOnItemSelect}
                />
            );

            const activeItem = screen.getByTestId('menu-item-users');
            expect(activeItem).toHaveClass('active');

            const inactiveItem = screen.getByTestId('menu-item-overview');
            expect(inactiveItem).not.toHaveClass('active');
        });

        test('shows collapse toggle when onToggleCollapse is provided', () => {
            render(
                <AdminSideMenu
                    activeItem="overview"
                    onItemSelect={mockOnItemSelect}
                    onToggleCollapse={mockOnToggleCollapse}
                />
            );

            expect(screen.getByTestId('collapse-toggle')).toBeInTheDocument();
        });

        test('hides collapse toggle when onToggleCollapse is not provided', () => {
            render(
                <AdminSideMenu
                    activeItem="overview"
                    onItemSelect={mockOnItemSelect}
                />
            );

            expect(screen.queryByTestId('collapse-toggle')).not.toBeInTheDocument();
        });
    });

    describe('Expandable Sections', () => {
        test('renders Payments section with sub-items when expanded', () => {
            render(
                <AdminSideMenu
                    activeItem="overview"
                    onItemSelect={mockOnItemSelect}
                />
            );

            // Click Payments to expand
            const paymentsItem = screen.getByTestId('menu-item-payments');
            fireEvent.click(paymentsItem);

            // Check sub-menu is visible
            expect(screen.getByTestId('sub-menu-payments')).toBeInTheDocument();
            expect(screen.getByTestId('sub-menu-item-payments-topups')).toBeInTheDocument();
            expect(screen.getByTestId('sub-menu-item-payments-wallets')).toBeInTheDocument();
            expect(screen.getByText('Top-Up Verification')).toBeInTheDocument();
            expect(screen.getByText('Wallet Management')).toBeInTheDocument();
        });

        test('auto-expands section when sub-item is active', () => {
            render(
                <AdminSideMenu
                    activeItem="payments-topups"
                    onItemSelect={mockOnItemSelect}
                />
            );

            // Payments section should be auto-expanded
            expect(screen.getByTestId('sub-menu-payments')).toBeInTheDocument();
            
            // Sub-item should be active
            const activeSubItem = screen.getByTestId('sub-menu-item-payments-topups');
            expect(activeSubItem).toHaveClass('active');
        });

        test('toggles section expansion on click', () => {
            render(
                <AdminSideMenu
                    activeItem="overview"
                    onItemSelect={mockOnItemSelect}
                />
            );

            const paymentsItem = screen.getByTestId('menu-item-payments');

            // Initially collapsed
            expect(screen.queryByTestId('sub-menu-payments')).not.toBeInTheDocument();

            // Click to expand
            fireEvent.click(paymentsItem);
            expect(screen.getByTestId('sub-menu-payments')).toBeInTheDocument();

            // Click to collapse
            fireEvent.click(paymentsItem);
            expect(screen.queryByTestId('sub-menu-payments')).not.toBeInTheDocument();
        });
    });

    describe('Badge Display', () => {
        test('shows pending count badge on Top-Up Verification when count > 0', () => {
            render(
                <AdminSideMenu
                    activeItem="payments-topups"
                    onItemSelect={mockOnItemSelect}
                    pendingTopupCount={5}
                />
            );

            const badge = screen.getByTestId('topup-count-badge');
            expect(badge).toBeInTheDocument();
            expect(badge).toHaveTextContent('5');
        });

        test('hides badge when pending count is 0', () => {
            render(
                <AdminSideMenu
                    activeItem="payments-topups"
                    onItemSelect={mockOnItemSelect}
                    pendingTopupCount={0}
                />
            );

            expect(screen.queryByTestId('topup-count-badge')).not.toBeInTheDocument();
        });

        test('hides badge when pendingTopupCount is not provided', () => {
            render(
                <AdminSideMenu
                    activeItem="payments-topups"
                    onItemSelect={mockOnItemSelect}
                />
            );

            expect(screen.queryByTestId('topup-count-badge')).not.toBeInTheDocument();
        });
    });

    describe('Interactions', () => {
        test('calls onItemSelect when regular menu item is clicked', () => {
            render(
                <AdminSideMenu
                    activeItem="overview"
                    onItemSelect={mockOnItemSelect}
                />
            );

            const usersItem = screen.getByTestId('menu-item-users');
            fireEvent.click(usersItem);

            expect(mockOnItemSelect).toHaveBeenCalledWith('users');
        });

        test('calls onItemSelect when sub-menu item is clicked', () => {
            render(
                <AdminSideMenu
                    activeItem="payments-topups"
                    onItemSelect={mockOnItemSelect}
                />
            );

            const walletsSubItem = screen.getByTestId('sub-menu-item-payments-wallets');
            fireEvent.click(walletsSubItem);

            expect(mockOnItemSelect).toHaveBeenCalledWith('payments-wallets');
        });

        test('calls onToggleCollapse when collapse toggle is clicked', () => {
            render(
                <AdminSideMenu
                    activeItem="overview"
                    onItemSelect={mockOnItemSelect}
                    onToggleCollapse={mockOnToggleCollapse}
                />
            );

            const collapseToggle = screen.getByTestId('collapse-toggle');
            fireEvent.click(collapseToggle);

            expect(mockOnToggleCollapse).toHaveBeenCalled();
        });

        test('does not call onItemSelect when expandable section is clicked', () => {
            render(
                <AdminSideMenu
                    activeItem="overview"
                    onItemSelect={mockOnItemSelect}
                />
            );

            const paymentsItem = screen.getByTestId('menu-item-payments');
            fireEvent.click(paymentsItem);

            // Should not call onItemSelect for expandable sections
            expect(mockOnItemSelect).not.toHaveBeenCalledWith('payments');
        });
    });

    describe('Collapsed State', () => {
        test('applies collapsed class when collapsed prop is true', () => {
            render(
                <AdminSideMenu
                    activeItem="overview"
                    onItemSelect={mockOnItemSelect}
                    collapsed={true}
                />
            );

            const sideMenu = screen.getByTestId('admin-side-menu');
            expect(sideMenu).toHaveClass('collapsed');
        });

        test('does not apply collapsed class when collapsed prop is false', () => {
            render(
                <AdminSideMenu
                    activeItem="overview"
                    onItemSelect={mockOnItemSelect}
                    collapsed={false}
                />
            );

            const sideMenu = screen.getByTestId('admin-side-menu');
            expect(sideMenu).not.toHaveClass('collapsed');
        });

        test('shows correct icon in collapse toggle based on collapsed state', () => {
            const { rerender } = render(
                <AdminSideMenu
                    activeItem="overview"
                    onItemSelect={mockOnItemSelect}
                    onToggleCollapse={mockOnToggleCollapse}
                    collapsed={false}
                />
            );

            // When not collapsed, should show X icon
            expect(screen.getByTestId('icon-x')).toBeInTheDocument();

            // When collapsed, should show Menu icon
            rerender(
                <AdminSideMenu
                    activeItem="overview"
                    onItemSelect={mockOnItemSelect}
                    onToggleCollapse={mockOnToggleCollapse}
                    collapsed={true}
                />
            );

            expect(screen.getByTestId('icon-menu')).toBeInTheDocument();
        });
    });

    describe('Menu Configuration', () => {
        test('MENU_ITEMS contains all expected items', () => {
            expect(MENU_ITEMS).toHaveLength(8);
            
            const itemIds = MENU_ITEMS.map(item => item.id);
            expect(itemIds).toEqual([
                'overview',
                'health', 
                'payments',
                'users',
                'orders',
                'analytics',
                'logs',
                'settings'
            ]);
        });

        test('Payments item has correct sub-items', () => {
            const paymentsItem = MENU_ITEMS.find(item => item.id === 'payments');
            expect(paymentsItem?.subItems).toHaveLength(2);
            expect(paymentsItem?.subItems?.[0].id).toBe('payments-topups');
            expect(paymentsItem?.subItems?.[1].id).toBe('payments-wallets');
        });
    });
});