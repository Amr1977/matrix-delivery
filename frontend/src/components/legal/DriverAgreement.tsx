import React from 'react';
import LegalLayout from './LegalLayout';

interface DriverAgreementProps {
    onBack: () => void;
}

const DriverAgreement: React.FC<DriverAgreementProps> = ({ onBack }) => {
    return (
        <LegalLayout title="Driver Partner Agreement" lastUpdated="December 5, 2025" onBack={onBack}>
            <section style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ color: 'white', fontSize: '1.25rem', marginBottom: '1rem' }}>1. Independent Contractor Status</h2>
                <p>By signing up as a driver, you acknowledge that you are an independent contractor and not an employee of Matrix Delivery. You are free to determine your own working hours and accept or reject any delivery offers.</p>
            </section>

            <section style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ color: 'white', fontSize: '1.25rem', marginBottom: '1rem' }}>2. Driver Requirements</h2>
                <p>To operate on our platform, you must maintain:</p>
                <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                    <li>A valid driver's license for your vehicle type.</li>
                    <li>Valid vehicle insurance and registration.</li>
                    <li>A clean driving record.</li>
                    <li>A working smartphone with data connection.</li>
                </ul>
            </section>

            <section style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ color: 'white', fontSize: '1.25rem', marginBottom: '1rem' }}>3. Code of Conduct</h2>
                <p>Drivers are expected to:</p>
                <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                    <li>Treat all customers and merchants with respect.</li>
                    <li>Handle packages with care to prevent damage.</li>
                    <li>Follow all local traffic laws and regulations.</li>
                    <li>Maintain personal hygiene and professional appearance.</li>
                </ul>
            </section>

            <section style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ color: 'white', fontSize: '1.25rem', marginBottom: '1rem' }}>4. Payments & Fees</h2>
                <p>You earn a fee for each completed delivery. Matrix Delivery charges a platform service fee which is deducted from the total delivery cost. Earnings are transferred to your designated account weekly.</p>
            </section>

            <section style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ color: 'white', fontSize: '1.25rem', marginBottom: '1rem' }}>5. Deactivation</h2>
                <p>We reserve the right to deactivate your account for violations of this agreement, including but not limited to: fraud, unsafe driving, harassment, or consistently poor ratings.</p>
            </section>
        </LegalLayout>
    );
};

export default DriverAgreement;
