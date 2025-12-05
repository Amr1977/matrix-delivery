import React from 'react';
import LegalLayout from './LegalLayout';

interface TermsOfServiceProps {
    onBack: () => void;
}

const TermsOfService: React.FC<TermsOfServiceProps> = ({ onBack }) => {
    return (
        <LegalLayout title="Terms of Service" lastUpdated="December 5, 2025" onBack={onBack}>
            <section style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ color: 'white', fontSize: '1.25rem', marginBottom: '1rem' }}>1. Agreement to Terms</h2>
                <p>By accessing or using Matrix Delivery, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, then you may not access the service.</p>
            </section>

            <section style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ color: 'white', fontSize: '1.25rem', marginBottom: '1rem' }}>2. Use of Service</h2>
                <p>You represent that you are at least 18 years of age and are capable of performing the obligations set forth in these terms. You agree to use the service only for lawful purposes and in accordance with these Terms.</p>
            </section>

            <section style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ color: 'white', fontSize: '1.25rem', marginBottom: '1rem' }}>3. User Accounts</h2>
                <p>To use certain features of the service, you must register for an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.</p>
            </section>

            <section style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ color: 'white', fontSize: '1.25rem', marginBottom: '1rem' }}>4. Delivery Services</h2>
                <p>Matrix Delivery connects customers with independent drivers. We are not responsible for the items being delivered, but we facilitate the connection and payment between parties.</p>
            </section>

            <section style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ color: 'white', fontSize: '1.25rem', marginBottom: '1rem' }}>5. Termination</h2>
                <p>We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.</p>
            </section>

            <section style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ color: 'white', fontSize: '1.25rem', marginBottom: '1rem' }}>6. Contact Us</h2>
                <p>If you have any questions about these Terms, please contact us at support@matrix-heroes.io.</p>
            </section>
        </LegalLayout>
    );
};

export default TermsOfService;
