import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AuthScreen from '../AuthScreen';

// Mock dependencies
// Mock dependencies
jest.mock('../../../i18n/i18nContext', () => ({
    useI18n: () => ({
        t: (key) => key,
        locale: 'en',
        changeLocale: jest.fn()
    })
}));

jest.mock('../../../hooks/useAuth', () => ({
    useAuth: () => ({
        handleForgotPassword: jest.fn()
    })
}));

// Mock child components to simplify test effectively or just let them render if simple
// LoginForm is simple enough to render, but allows us to target inputs

describe('AuthScreen - Invalid Login Scenario', () => {
    const mockOnLogin = jest.fn();
    const mockOnRegister = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('displays error message when login fails with invalid credentials', () => {
        const errorMsg = 'Invalid credentials';
        render(
            <AuthScreen
                onLogin={mockOnLogin}
                onRegister={mockOnRegister}
                loading={false}
                error={errorMsg}
                countries={[]}
            />
        );

        // Initial check: Error should be visible
        expect(screen.getByText(`⚠️ ${errorMsg}`)).toBeInTheDocument();
    });

    test('calls onLogin when form is submitted', async () => {
        render(
            <AuthScreen
                onLogin={mockOnLogin}
                onRegister={mockOnRegister}
                loading={false}
                error=""
                countries={[]}
            />
        );

        // Fill in inputs
        const emailInput = screen.getByPlaceholderText('auth.email');
        const passwordInput = screen.getByPlaceholderText('auth.password');

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });

        // Submit
        const loginButton = screen.getByText('auth.login');
        fireEvent.click(loginButton);

        await waitFor(() => {
            expect(mockOnLogin).toHaveBeenCalledWith(expect.objectContaining({
                email: 'test@example.com',
                password: 'password123'
            }));
        });
    });
});
