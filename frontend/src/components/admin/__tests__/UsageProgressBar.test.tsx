/**
 * UsageProgressBar Component Tests
 * Tests for the usage progress bar with color thresholds
 * 
 * Requirements: 7.1-7.4
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import UsageProgressBar from '../UsageProgressBar';

describe('UsageProgressBar', () => {
    describe('Rendering', () => {
        test('renders progress bar with label and values', () => {
            render(
                <UsageProgressBar
                    used={250}
                    limit={1000}
                    label="Daily Usage"
                />
            );

            expect(screen.getByTestId('usage-progress-bar')).toBeInTheDocument();
            expect(screen.getByTestId('progress-label')).toHaveTextContent('Daily Usage');
            expect(screen.getByTestId('progress-values')).toHaveTextContent('250 / 1,000');
        });

        test('renders progress bar without percentage when showPercentage is false', () => {
            render(
                <UsageProgressBar
                    used={250}
                    limit={1000}
                    label="Daily Usage"
                    showPercentage={false}
                />
            );

            expect(screen.queryByTestId('progress-percentage')).not.toBeInTheDocument();
        });

        test('renders progress bar with percentage by default', () => {
            render(
                <UsageProgressBar
                    used={250}
                    limit={1000}
                    label="Daily Usage"
                />
            );

            const percentage = screen.getByTestId('progress-percentage');
            expect(percentage).toBeInTheDocument();
            expect(percentage).toHaveTextContent('(25.0%)');
        });
    });

    describe('Percentage Calculation', () => {
        test('calculates correct percentage for normal values', () => {
            render(
                <UsageProgressBar
                    used={300}
                    limit={1000}
                    label="Test"
                />
            );

            expect(screen.getByTestId('progress-percentage')).toHaveTextContent('(30.0%)');
        });

        test('handles zero limit gracefully', () => {
            render(
                <UsageProgressBar
                    used={100}
                    limit={0}
                    label="Test"
                />
            );

            expect(screen.getByTestId('progress-percentage')).toHaveTextContent('(0.0%)');
        });

        test('caps percentage at 100% when used exceeds limit', () => {
            render(
                <UsageProgressBar
                    used={1200}
                    limit={1000}
                    label="Test"
                />
            );

            expect(screen.getByTestId('progress-percentage')).toHaveTextContent('(100.0%)');
        });

        test('handles decimal values correctly', () => {
            render(
                <UsageProgressBar
                    used={33.33}
                    limit={100}
                    label="Test"
                />
            );

            expect(screen.getByTestId('progress-percentage')).toHaveTextContent('(33.3%)');
        });
    });

    describe('Color Thresholds', () => {
        test('applies green color for usage below 80%', () => {
            render(
                <UsageProgressBar
                    used={700}
                    limit={1000}
                    label="Test"
                />
            );

            const progressFill = screen.getByTestId('progress-fill');
            expect(progressFill).toHaveStyle('background-color: #10B981');
            
            const percentage = screen.getByTestId('progress-percentage');
            expect(percentage).toHaveStyle('color: #10B981');
        });

        test('applies yellow color for usage between 80-94%', () => {
            render(
                <UsageProgressBar
                    used={850}
                    limit={1000}
                    label="Test"
                />
            );

            const progressFill = screen.getByTestId('progress-fill');
            expect(progressFill).toHaveStyle('background-color: #F59E0B');
            
            const percentage = screen.getByTestId('progress-percentage');
            expect(percentage).toHaveStyle('color: #F59E0B');
        });

        test('applies red color for usage 95% and above', () => {
            render(
                <UsageProgressBar
                    used={950}
                    limit={1000}
                    label="Test"
                />
            );

            const progressFill = screen.getByTestId('progress-fill');
            expect(progressFill).toHaveStyle('background-color: #EF4444');
            
            const percentage = screen.getByTestId('progress-percentage');
            expect(percentage).toHaveStyle('color: #EF4444');
        });

        test('applies correct color at exact 80% threshold', () => {
            render(
                <UsageProgressBar
                    used={800}
                    limit={1000}
                    label="Test"
                />
            );

            const progressFill = screen.getByTestId('progress-fill');
            expect(progressFill).toHaveStyle('background-color: #F59E0B');
        });

        test('applies correct color at exact 95% threshold', () => {
            render(
                <UsageProgressBar
                    used={950}
                    limit={1000}
                    label="Test"
                />
            );

            const progressFill = screen.getByTestId('progress-fill');
            expect(progressFill).toHaveStyle('background-color: #EF4444');
        });
    });

    describe('Progress Bar Width', () => {
        test('sets correct width for progress fill', () => {
            render(
                <UsageProgressBar
                    used={250}
                    limit={1000}
                    label="Test"
                />
            );

            const progressFill = screen.getByTestId('progress-fill');
            expect(progressFill).toHaveStyle('width: 25%');
        });

        test('sets 0% width when used is 0', () => {
            render(
                <UsageProgressBar
                    used={0}
                    limit={1000}
                    label="Test"
                />
            );

            const progressFill = screen.getByTestId('progress-fill');
            expect(progressFill).toHaveStyle('width: 0%');
        });

        test('sets 100% width when used equals limit', () => {
            render(
                <UsageProgressBar
                    used={1000}
                    limit={1000}
                    label="Test"
                />
            );

            const progressFill = screen.getByTestId('progress-fill');
            expect(progressFill).toHaveStyle('width: 100%');
        });

        test('caps width at 100% when used exceeds limit', () => {
            render(
                <UsageProgressBar
                    used={1200}
                    limit={1000}
                    label="Test"
                />
            );

            const progressFill = screen.getByTestId('progress-fill');
            expect(progressFill).toHaveStyle('width: 100%');
        });
    });

    describe('Number Formatting', () => {
        test('formats large numbers with commas', () => {
            render(
                <UsageProgressBar
                    used={1234567}
                    limit={2000000}
                    label="Test"
                />
            );

            expect(screen.getByTestId('progress-values')).toHaveTextContent('1,234,567 / 2,000,000');
        });

        test('formats decimal numbers correctly', () => {
            render(
                <UsageProgressBar
                    used={123.45}
                    limit={500.67}
                    label="Test"
                />
            );

            expect(screen.getByTestId('progress-values')).toHaveTextContent('123.45 / 500.67');
        });

        test('formats whole numbers without decimals', () => {
            render(
                <UsageProgressBar
                    used={100}
                    limit={500}
                    label="Test"
                />
            );

            expect(screen.getByTestId('progress-values')).toHaveTextContent('100 / 500');
        });
    });

    describe('Edge Cases', () => {
        test('handles negative values gracefully', () => {
            render(
                <UsageProgressBar
                    used={-10}
                    limit={1000}
                    label="Test"
                />
            );

            // Should still render without crashing
            expect(screen.getByTestId('usage-progress-bar')).toBeInTheDocument();
            expect(screen.getByTestId('progress-values')).toHaveTextContent('-10 / 1,000');
        });

        test('handles very small decimal values', () => {
            render(
                <UsageProgressBar
                    used={0.001}
                    limit={1}
                    label="Test"
                />
            );

            expect(screen.getByTestId('progress-percentage')).toHaveTextContent('(0.1%)');
        });

        test('handles very large values', () => {
            render(
                <UsageProgressBar
                    used={999999999}
                    limit={1000000000}
                    label="Test"
                />
            );

            expect(screen.getByTestId('usage-progress-bar')).toBeInTheDocument();
            expect(screen.getByTestId('progress-percentage')).toHaveTextContent('(100.0%)');
        });
    });
});