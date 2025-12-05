import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ChatPage from '../ChatPage';
import * as api from '../../../api';

// Mock dependencies
jest.mock('../../../api');
jest.mock('../../../hooks/useMessaging');
jest.mock('../../../hooks/useVoiceRecorder');
jest.mock('../../../hooks/useMediaUpload');
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useParams: () => ({ orderId: 'test-order-123' }),
    useNavigate: () => jest.fn()
}));

describe('ChatPage Component', () => {
    const mockOrder = {
        id: 'test-order-123',
        orderNumber: 'ORD-001',
        customerId: 'customer-123',
        assignedDriverUserId: 'driver-456',
        pickupAddress: '123 Main St',
        deliveryAddress: '456 Oak Ave'
    };

    const mockUser = {
        userId: 'customer-123',
        role: 'customer'
    };

    const mockMessages = [
        {
            id: 'msg-1',
            sender: { id: 'customer-123', name: 'John Doe' },
            recipient: { id: 'driver-456', name: 'Jane Smith' },
            content: 'Hello!',
            messageType: 'text',
            createdAt: new Date().toISOString(),
            isRead: false
        },
        {
            id: 'msg-2',
            sender: { id: 'driver-456', name: 'Jane Smith' },
            recipient: { id: 'customer-123', name: 'John Doe' },
            content: 'Hi there!',
            messageType: 'text',
            mediaUrl: '/uploads/images/test.jpg',
            mediaType: 'image',
            thumbnailUrl: '/uploads/thumbnails/thumb_test.jpg',
            createdAt: new Date().toISOString(),
            isRead: true
        }
    ];

    beforeEach(() => {
        // Mock API responses
        api.get = jest.fn((endpoint) => {
            if (endpoint === '/auth/me') {
                return Promise.resolve({ user: mockUser });
            }
            if (endpoint.includes('/orders/')) {
                return Promise.resolve({ order: mockOrder });
            }
            return Promise.resolve({});
        });

        // Mock hooks
        require('../../../hooks/useMessaging').default = jest.fn(() => ({
            messages: mockMessages,
            loading: false,
            error: '',
            sendMessage: jest.fn(),
            fetchOrderMessages: jest.fn(),
            markMessagesRead: jest.fn()
        }));

        require('../../../hooks/useVoiceRecorder').default = jest.fn(() => ({
            isRecording: false,
            recordingTime: 0,
            audioBlob: null,
            audioUrl: null,
            startRecording: jest.fn(),
            stopRecording: jest.fn(),
            cancelRecording: jest.fn(),
            clearRecording: jest.fn(),
            formatTime: (s) => `00:${s.toString().padStart(2, '0')}`
        }));

        require('../../../hooks/useMediaUpload').default = jest.fn(() => ({
            uploading: false,
            uploadProgress: 0,
            error: '',
            preview: null,
            uploadImage: jest.fn(),
            uploadVideo: jest.fn(),
            uploadVoice: jest.fn(),
            clearPreview: jest.fn()
        }));
    });

    it('should render chat page with order details', async () => {
        render(
            <BrowserRouter>
                <ChatPage />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText(/ORD-001/)).toBeInTheDocument();
            expect(screen.getByText(/123 Main St/)).toBeInTheDocument();
            expect(screen.getByText(/456 Oak Ave/)).toBeInTheDocument();
        });
    });

    it('should display messages', async () => {
        render(
            <BrowserRouter>
                <ChatPage />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Hello!')).toBeInTheDocument();
            expect(screen.getByText('Hi there!')).toBeInTheDocument();
        });
    });

    it('should send text message on form submit', async () => {
        const mockSendMessage = jest.fn();
        require('../../../hooks/useMessaging').default = jest.fn(() => ({
            messages: mockMessages,
            loading: false,
            error: '',
            sendMessage: mockSendMessage,
            fetchOrderMessages: jest.fn(),
            markMessagesRead: jest.fn()
        }));

        render(
            <BrowserRouter>
                <ChatPage />
            </BrowserRouter>
        );

        await waitFor(() => {
            const input = screen.getByPlaceholderText(/Type a message/i);
            fireEvent.change(input, { target: { value: 'Test message' } });

            const sendButton = screen.getByRole('button', { name: /📤/ });
            fireEvent.click(sendButton);

            expect(mockSendMessage).toHaveBeenCalled();
        });
    });

    it('should show media options when attachment button is clicked', async () => {
        render(
            <BrowserRouter>
                <ChatPage />
            </BrowserRouter>
        );

        await waitFor(() => {
            const attachButton = screen.getByTitle(/Attach media/i);
            fireEvent.click(attachButton);

            expect(screen.getByText(/Image/i)).toBeInTheDocument();
            expect(screen.getByText(/Video/i)).toBeInTheDocument();
        });
    });

    it('should start voice recording when microphone button is clicked', async () => {
        const mockStartRecording = jest.fn();
        require('../../../hooks/useVoiceRecorder').default = jest.fn(() => ({
            isRecording: false,
            recordingTime: 0,
            audioBlob: null,
            audioUrl: null,
            startRecording: mockStartRecording,
            stopRecording: jest.fn(),
            cancelRecording: jest.fn(),
            clearRecording: jest.fn(),
            formatTime: (s) => `00:${s.toString().padStart(2, '0')}`
        }));

        render(
            <BrowserRouter>
                <ChatPage />
            </BrowserRouter>
        );

        await waitFor(() => {
            const micButton = screen.getByTitle(/Record voice/i);
            fireEvent.click(micButton);

            expect(mockStartRecording).toHaveBeenCalled();
        });
    });

    it('should display upload progress when uploading', async () => {
        require('../../../hooks/useMediaUpload').default = jest.fn(() => ({
            uploading: true,
            uploadProgress: 50,
            error: '',
            preview: null,
            uploadImage: jest.fn(),
            uploadVideo: jest.fn(),
            uploadVoice: jest.fn(),
            clearPreview: jest.fn()
        }));

        render(
            <BrowserRouter>
                <ChatPage />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText(/Uploading... 50%/)).toBeInTheDocument();
        });
    });

    it('should display error messages', async () => {
        require('../../../hooks/useMessaging').default = jest.fn(() => ({
            messages: mockMessages,
            loading: false,
            error: 'Failed to send message',
            sendMessage: jest.fn(),
            fetchOrderMessages: jest.fn(),
            markMessagesRead: jest.fn()
        }));

        render(
            <BrowserRouter>
                <ChatPage />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText(/Failed to send message/)).toBeInTheDocument();
        });
    });
});
