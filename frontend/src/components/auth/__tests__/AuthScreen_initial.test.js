import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AuthScreen from '../AuthScreen';

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

describe('AuthScreen - Initial State', () => {
    const mockOnLogin = jest.fn();
    const mockOnRegister = jest.fn();

    test('should NOT display any error message initially', () => {
        // Render without passing an error prop (simulating clean state or proper handling)
        render(
            <AuthScreen
                onLogin={mockOnLogin}
                onRegister={mockOnRegister}
                loading={false}
                error={null} // Passing null or empty string
                countries={[]}
            />
        );

        // Check that the error container is NOT present
        // The error container in AuthScreen has "⚠️" content
        const errorAlert = screen.queryByText(/⚠️/i);
        expect(errorAlert).not.toBeInTheDocument();
    });

    test('should NOT display error message if error prop is empty string', () => {
        render(
            <AuthScreen
                onLogin={mockOnLogin}
                onRegister={mockOnRegister}
                loading={false}
                error=""
                countries={[]}
            />
        );

        const errorAlert = screen.queryByText(/⚠️/i);
        expect(errorAlert).not.toBeInTheDocument();
    });
});
