import React from 'react';
import LegalLayout from './LegalLayout';

interface CookiePolicyProps {
    onBack: () => void;
}

const CookiePolicy: React.FC<CookiePolicyProps> = ({ onBack }) => {
    return (
        <LegalLayout title="Cookie Policy" lastUpdated="December 5, 2025" onBack={onBack}>
            <section style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ color: 'white', fontSize: '1.25rem', marginBottom: '1rem' }}>1. What Are Cookies?</h2>
                <p>Cookies are small text files that are placed on your computer or mobile device when you visit a website. They deemed essential for the proper functioning of our platform.</p>
            </section>

            <section style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ color: 'white', fontSize: '1.25rem', marginBottom: '1rem' }}>2. How We Use Cookies</h2>
                <p>We use cookies for the following purposes:</p>
                <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                    <li><strong>Authentication:</strong> To identify you when you sign in and keep you logged in.</li>
                    <li><strong>Security:</strong> To prevent security risks and detect malicious activity.</li>
                    <li><strong>Preferences:</strong> To remember your settings such as language and theme.</li>
                    <li><strong>Analytics:</strong> To understand how our services are being used.</li>
                </ul>
            </section>

            <section style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ color: 'white', fontSize: '1.25rem', marginBottom: '1rem' }}>3. Managing Cookies</h2>
                <p>You can control and/or delete cookies as you wish using your browser settings. However, if you disable cookies, some features of the Matrix Delivery platform (like keeping you logged in) may not function properly.</p>
            </section>
        </LegalLayout>
    );
};

export default CookiePolicy;
