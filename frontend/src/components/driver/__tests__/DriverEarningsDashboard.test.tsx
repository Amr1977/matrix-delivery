import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DriverEarningsDashboard from '../DriverEarningsDashboard';

// Mock recharts to avoid rendering issues in tests
jest.mock('recharts', () => ({
    BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
    Bar: () => <div data-testid="bar" />,
    XAxis: () => <div data-testid="x-axis" />,
    YAxis: () => <div data-testid="y-axis" />,
    CartesianGrid: () => <div data-testid="cartesian-grid" />,
    Tooltip: () => <div data-testid="tooltip" />,
    ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>
}));

const mockStatsData = {
    today: 150.50,
    week: 850.75,
    month: 3200.00,
    chartData: [
        { date: '2025-12-01', amount: 150.50 },
        { date: '2025-11-30', amount: 200.00 },
        { date: '2025-11-29', amount: 175.25 },
        { date: '2025-11-28', amount: 125.00 },
        { date: '2025-11-27', amount: 100.00 },
        { date: '2025-11-26', amount: 50.00 },
        { date: '2025-11-25', amount: 50.00 }
    ]
};

const mockHistoryData = {
    orders: [
        {
            id: 1,
            orderNumber: 'ORD-001',
            date: '2025-12-01T10:00:00Z',
            amount: 50.00,
            rating: 5
        },
        {
            id: 2,
            orderNumber: 'ORD-002',
            date: '2025-11-30T15:30:00Z',
            amount: 75.50,
            rating: 4
        },
        {
            id: 3,
            orderNumber: 'ORD-003',
            date: '2025-11-29T12:00:00Z',
            amount: 25.00,
            rating: null
        }
    ],
    pagination: {
        page: 1,
        limit: 10,
        total: 25,
        totalPages: 3
    }
};

const defaultProps = {
    token: 'test-token',
    API_URL: 'http://localhost:5000/api',
    t: (key) => key
};

global.fetch = jest.fn();

describe('DriverEarningsDashboard Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should show loading state initially', () => {
        (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => { }));

        render(<DriverEarningsDashboard {...defaultProps} />);

        expect(screen.getByText('Loading earnings data...')).toBeInTheDocument();
    });

    it('should fetch stats on mount', async () => {
        (global.fetch as jest.Mock)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => mockStatsData
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => mockHistoryData
            });

        render(<DriverEarningsDashboard {...defaultProps} />);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:5000/api/drivers/earnings/stats',
                expect.objectContaining({
                    headers: { 'Authorization': 'Bearer test-token' }
                })
            );
        });
    });

    it('should fetch history on mount', async () => {
        (global.fetch as jest.Mock)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => mockStatsData
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => mockHistoryData
            });

        render(<DriverEarningsDashboard {...defaultProps} />);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:5000/api/drivers/earnings/history?page=1&limit=10',
                expect.objectContaining({
                    headers: { 'Authorization': 'Bearer test-token' }
                })
            );
        });
    });

    it('should display today\'s earnings', async () => {
        (global.fetch as jest.Mock)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => mockStatsData
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => mockHistoryData
            });

        render(<DriverEarningsDashboard {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText('$150.50')).toBeInTheDocument();
        });
    });

    it('should display weekly earnings', async () => {
        (global.fetch as jest.Mock)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => mockStatsData
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => mockHistoryData
            });

        render(<DriverEarningsDashboard {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText('$850.75')).toBeInTheDocument();
        });
    });

    it('should display monthly earnings', async () => {
        (global.fetch as jest.Mock)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => mockStatsData
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => mockHistoryData
            });

        render(<DriverEarningsDashboard {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText('$3200.00')).toBeInTheDocument();
        });
    });

    it('should render chart with 7-day data', async () => {
        (global.fetch as jest.Mock)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => mockStatsData
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => mockHistoryData
            });

        render(<DriverEarningsDashboard {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
        });
    });

    it('should display order history table', async () => {
        (global.fetch as jest.Mock)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => mockStatsData
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => mockHistoryData
            });

        render(<DriverEarningsDashboard {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText('ORD-001')).toBeInTheDocument();
            expect(screen.getByText('ORD-002')).toBeInTheDocument();
            expect(screen.getByText('ORD-003')).toBeInTheDocument();
        });
    });

    it('should show order number, date, rating, amount', async () => {
        (global.fetch as jest.Mock)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => mockStatsData
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => mockHistoryData
            });

        render(<DriverEarningsDashboard {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText('ORD-001')).toBeInTheDocument();
            expect(screen.getByText('$50.00')).toBeInTheDocument();
        });
    });

    it('should format currency correctly', async () => {
        (global.fetch as jest.Mock)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => mockStatsData
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => mockHistoryData
            });

        render(<DriverEarningsDashboard {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText('$75.50')).toBeInTheDocument();
        });
    });

    it('should render star ratings correctly', async () => {
        (global.fetch as jest.Mock)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => mockStatsData
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => mockHistoryData
            });

        render(<DriverEarningsDashboard {...defaultProps} />);

        await waitFor(() => {
            // 5 stars for first order
            const fiveStars = screen.getByText('★★★★★');
            expect(fiveStars).toBeInTheDocument();

            // 4 stars for second order
            const fourStars = screen.getByText('★★★★');
            expect(fourStars).toBeInTheDocument();
        });
    });

    it('should show dash for missing ratings', async () => {
        (global.fetch as jest.Mock)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => mockStatsData
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => mockHistoryData
            });

        render(<DriverEarningsDashboard {...defaultProps} />);

        await waitFor(() => {
            const dashes = screen.getAllByText('-');
            expect(dashes.length).toBeGreaterThan(0);
        });
    });

    it('should display pagination controls', async () => {
        (global.fetch as jest.Mock)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => mockStatsData
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => mockHistoryData
            });

        render(<DriverEarningsDashboard {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText('Previous')).toBeInTheDocument();
            expect(screen.getByText('Next')).toBeInTheDocument();
            expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
        });
    });

    it('should disable Previous on first page', async () => {
        (global.fetch as jest.Mock)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => mockStatsData
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => mockHistoryData
            });

        render(<DriverEarningsDashboard {...defaultProps} />);

        await waitFor(() => {
            const prevButton = screen.getByText('Previous');
            expect(prevButton).toBeDisabled();
        });
    });

    it('should disable Next on last page', async () => {
        const lastPageData = {
            ...mockHistoryData,
            pagination: { ...mockHistoryData.pagination, page: 3, totalPages: 3 }
        };

        (global.fetch as jest.Mock)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => mockStatsData
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => lastPageData
            });

        render(<DriverEarningsDashboard {...defaultProps} />);

        await waitFor(() => {
            const nextButton = screen.getByText('Next');
            expect(nextButton).toBeDisabled();
        });
    });

    it('should fetch new page when pagination clicked', async () => {
        (global.fetch as jest.Mock)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => mockStatsData
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => mockHistoryData
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ ...mockHistoryData, pagination: { ...mockHistoryData.pagination, page: 2 } })
            });

        render(<DriverEarningsDashboard {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText('Next')).toBeInTheDocument();
        });

        const nextButton = screen.getByText('Next');
        fireEvent.click(nextButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:5000/api/drivers/earnings/history?page=2&limit=10',
                expect.any(Object)
            );
        });
    });

    it('should show error message on fetch failure', async () => {
        (global.fetch as jest.Mock)
            .mockRejectedValueOnce(new Error('Network error'))
            .mockResolvedValueOnce({
                ok: true,
                json: async () => mockHistoryData
            });

        render(<DriverEarningsDashboard {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText('Network error')).toBeInTheDocument();
        });
    });

    it('should show "No completed orders" when empty', async () => {
        const emptyHistory = {
            orders: [],
            pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
        };

        (global.fetch as jest.Mock)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => mockStatsData
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => emptyHistory
            });

        render(<DriverEarningsDashboard {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText('No completed orders yet.')).toBeInTheDocument();
        });
    });

    it('should handle API error responses', async () => {
        (global.fetch as jest.Mock)
            .mockResolvedValueOnce({
                ok: false,
                status: 500
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => mockHistoryData
            });

        render(<DriverEarningsDashboard {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText('Failed to fetch stats')).toBeInTheDocument();
        });
    });
});
