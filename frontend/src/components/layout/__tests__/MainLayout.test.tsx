import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MainLayout from '../MainLayout';

const mockUser = {
    id: 1,
    name: 'Test Driver',
    email: 'driver@test.com',
    primary_role: 'driver',
    isVerified: true,
    completedDeliveries: 25
};

const mockNotifications = [
    { id: 1, title: 'New Order', message: 'You have a new order', isRead: false, createdAt: new Date().toISOString() },
    { id: 2, title: 'Order Completed', message: 'Order #123 completed', isRead: true, createdAt: new Date().toISOString() }
];

const defaultProps = {
    currentUser: mockUser,
    notifications: mockNotifications,
    onNavigate: jest.fn(),
    onLogout: jest.fn(),
    onToggleOnline: jest.fn(),
    isDriverOnline: true,
    onSwitchRole: jest.fn(),
    availableRoles: ['driver', 'customer'],
    onChangeLocale: jest.fn(),
    currentLocale: 'en',
    t: (key) => key,
    unreadCount: 1,
    children: <div>Test Content</div>
};

describe('MainLayout Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        // Reset body overflow
        document.body.style.overflow = 'unset';
    });

    it('should render header with logo and app name', () => {
        render(<MainLayout {...defaultProps} />);

        expect(screen.getByAlt('Matrix Heroes')).toBeInTheDocument();
        expect(screen.getByText('common.appName')).toBeInTheDocument();
    });

    it('should render hamburger menu button', () => {
        render(<MainLayout {...defaultProps} />);

        const hamburger = screen.getByLabelText('Toggle menu');
        expect(hamburger).toBeInTheDocument();
    });

    it('should open side menu when hamburger clicked', () => {
        render(<MainLayout {...defaultProps} />);

        const hamburger = screen.getByLabelText('Toggle menu');
        fireEvent.click(hamburger);

        // SideMenu should receive isOpen=true
        // Check for side menu content
        expect(screen.getByText(mockUser.name)).toBeInTheDocument();
    });

    it('should close side menu when Escape pressed', async () => {
        render(<MainLayout {...defaultProps} />);

        // Open menu
        const hamburger = screen.getByLabelText('Toggle menu');
        fireEvent.click(hamburger);

        // Press Escape
        fireEvent.keyDown(window, { key: 'Escape' });

        await waitFor(() => {
            // Menu should be closed (check hamburger doesn't have 'open' class)
            expect(hamburger).not.toHaveClass('open');
        });
    });

    it('should prevent body scroll when menu open', () => {
        render(<MainLayout {...defaultProps} />);

        const hamburger = screen.getByLabelText('Toggle menu');
        fireEvent.click(hamburger);

        expect(document.body.style.overflow).toBe('hidden');
    });

    it('should restore body scroll when menu closed', () => {
        render(<MainLayout {...defaultProps} />);

        const hamburger = screen.getByLabelText('Toggle menu');

        // Open menu
        fireEvent.click(hamburger);
        expect(document.body.style.overflow).toBe('hidden');

        // Close menu
        fireEvent.click(hamburger);
        expect(document.body.style.overflow).toBe('unset');
    });

    it('should render notification bell with unread count', () => {
        render(<MainLayout {...defaultProps} />);

        const bell = screen.getByLabelText('Notifications');
        expect(bell).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument(); // unreadCount badge
    });

    it('should not show badge when unreadCount is 0', () => {
        render(<MainLayout {...defaultProps} unreadCount={0} />);

        const bell = screen.getByLabelText('Notifications');
        expect(bell).toBeInTheDocument();
        expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    it('should call onNavigate when notification bell clicked', () => {
        render(<MainLayout {...defaultProps} />);

        const bell = screen.getByLabelText('Notifications');
        fireEvent.click(bell);

        expect(defaultProps.onNavigate).toHaveBeenCalledWith('notifications');
    });

    it('should render children content', () => {
        render(<MainLayout {...defaultProps} />);

        expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should toggle hamburger animation class', () => {
        render(<MainLayout {...defaultProps} />);

        const hamburger = screen.getByLabelText('Toggle menu');

        // Initially not open
        expect(hamburger).not.toHaveClass('open');

        // Click to open
        fireEvent.click(hamburger);
        expect(hamburger).toHaveClass('open');

        // Click to close
        fireEvent.click(hamburger);
        expect(hamburger).not.toHaveClass('open');
    });

    it('should cleanup event listeners on unmount', () => {
        const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

        const { unmount } = render(<MainLayout {...defaultProps} />);
        unmount();

        expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

        removeEventListenerSpy.mockRestore();
    });
});
