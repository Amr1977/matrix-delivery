import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SideMenu from '../SideMenu';

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
    isOpen: true,
    onClose: jest.fn(),
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
    t: (key) => key
};

describe('SideMenu Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should render user profile information', () => {
        render(<SideMenu {...defaultProps} />);

        expect(screen.getByText(mockUser.name)).toBeInTheDocument();
        expect(screen.getByText(`driver • 25 deliveries`)).toBeInTheDocument();
    });

    it('should show verification badge for verified users', () => {
        render(<SideMenu {...defaultProps} />);

        expect(screen.getByText('✓ Verified')).toBeInTheDocument();
    });

    it('should hide verification badge for unverified users', () => {
        const unverifiedUser = { ...mockUser, isVerified: false };
        render(<SideMenu {...defaultProps} currentUser={unverifiedUser} />);

        expect(screen.queryByText('✓ Verified')).not.toBeInTheDocument();
    });

    it('should render all navigation items', () => {
        render(<SideMenu {...defaultProps} />);

        expect(screen.getByText('🏠 menu.home')).toBeInTheDocument();
        expect(screen.getByText('💰 menu.earnings')).toBeInTheDocument();
        expect(screen.getByText('👤 menu.profile')).toBeInTheDocument();
        expect(screen.getByText(/menu.notifications/)).toBeInTheDocument();
    });

    it('should show unread notification count', () => {
        render(<SideMenu {...defaultProps} />);

        // 1 unread notification
        expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('should not show notification badge when all read', () => {
        const readNotifications = mockNotifications.map(n => ({ ...n, isRead: true }));
        render(<SideMenu {...defaultProps} notifications={readNotifications} />);

        expect(screen.queryByText('1')).not.toBeInTheDocument();
    });

    it('should render driver toggle when user is driver', () => {
        render(<SideMenu {...defaultProps} />);

        expect(screen.getByText('🚗 menu.driverStatus')).toBeInTheDocument();
    });

    it('should hide driver toggle when user is not driver', () => {
        const customerUser = { ...mockUser, primary_role: 'customer' };
        render(<SideMenu {...defaultProps} currentUser={customerUser} />);

        expect(screen.queryByText('🚗 menu.driverStatus')).not.toBeInTheDocument();
    });

    it('should call onToggleOnline when toggle clicked', () => {
        render(<SideMenu {...defaultProps} />);

        const toggle = screen.getByRole('checkbox');
        fireEvent.click(toggle);

        expect(defaultProps.onToggleOnline).toHaveBeenCalled();
    });

    it('should show correct toggle state', () => {
        render(<SideMenu {...defaultProps} isDriverOnline={true} />);

        const toggle = screen.getByRole('checkbox');
        expect(toggle).toBeChecked();
    });

    it('should render language switcher', () => {
        render(<SideMenu {...defaultProps} />);

        expect(screen.getByText('🌐 menu.language')).toBeInTheDocument();
    });

    it('should render primary_role switcher when multiple granted_roles available', () => {
        render(<SideMenu {...defaultProps} />);

        expect(screen.getByText('🔄 menu.switchRole')).toBeInTheDocument();
        expect(screen.getByDisplayValue('driver')).toBeInTheDocument();
    });

    it('should hide primary_role switcher when only one primary_role', () => {
        render(<SideMenu {...defaultProps} availableRoles={['driver']} />);

        expect(screen.queryByText('🔄 menu.switchRole')).not.toBeInTheDocument();
    });

    it('should call onSwitchRole when primary_role changed', () => {
        render(<SideMenu {...defaultProps} />);

        const roleSelect = screen.getByDisplayValue('driver');
        fireEvent.change(roleSelect, { target: { value: 'customer' } });

        expect(defaultProps.onSwitchRole).toHaveBeenCalledWith('customer');
    });

    it('should call onLogout when logout clicked', () => {
        render(<SideMenu {...defaultProps} />);

        const logoutButton = screen.getByText('🚪 menu.logout');
        fireEvent.click(logoutButton);

        expect(defaultProps.onLogout).toHaveBeenCalled();
    });

    it('should call onClose when backdrop clicked', () => {
        render(<SideMenu {...defaultProps} />);

        const backdrop = screen.getByTestId('side-menu-backdrop');
        fireEvent.click(backdrop);

        expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('should apply open class when isOpen is true', () => {
        const { container } = render(<SideMenu {...defaultProps} isOpen={true} />);

        const menu = container.querySelector('.side-menu');
        expect(menu).toHaveClass('open');
    });

    it('should not apply open class when isOpen is false', () => {
        const { container } = render(<SideMenu {...defaultProps} isOpen={false} />);

        const menu = container.querySelector('.side-menu');
        expect(menu).not.toHaveClass('open');
    });

    it('should call onNavigate with correct view when menu item clicked', () => {
        render(<SideMenu {...defaultProps} />);

        const homeButton = screen.getByText('🏠 menu.home');
        fireEvent.click(homeButton);

        expect(defaultProps.onNavigate).toHaveBeenCalledWith('home');
        expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('should call onNavigate for earnings', () => {
        render(<SideMenu {...defaultProps} />);

        const earningsButton = screen.getByText('💰 menu.earnings');
        fireEvent.click(earningsButton);

        expect(defaultProps.onNavigate).toHaveBeenCalledWith('earnings');
        expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('should call onNavigate for profile', () => {
        render(<SideMenu {...defaultProps} />);

        const profileButton = screen.getByText('👤 menu.profile');
        fireEvent.click(profileButton);

        expect(defaultProps.onNavigate).toHaveBeenCalledWith('profile');
        expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('should call onNavigate for notifications', () => {
        render(<SideMenu {...defaultProps} />);

        const notificationsButton = screen.getByText(/menu.notifications/);
        fireEvent.click(notificationsButton);

        expect(defaultProps.onNavigate).toHaveBeenCalledWith('notifications');
        expect(defaultProps.onClose).toHaveBeenCalled();
    });
});
