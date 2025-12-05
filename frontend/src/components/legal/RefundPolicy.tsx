import React from 'react';
import LegalLayout from './LegalLayout';

interface RefundPolicyProps {
    onBack: () => void;
}

const RefundPolicy: React.FC<RefundPolicyProps> = ({ onBack }) => {
    return (
        <LegalLayout title="Refund & Cancellation Policy" lastUpdated="December 5, 2025" onBack={onBack}>
            <section style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ color: 'white', fontSize: '1.25rem', marginBottom: '1rem' }}>1. Order Cancellation</h2>
                <p><strong>Customer Rights:</strong> You may cancel your order at any time before a driver has been assigned. Once a driver has accepted your request, cancellation may attract a fee to compensate the driver for their time.</p>
                <p style={{ marginTop: '0.5rem' }}><strong>Driver Rights:</strong> Drivers may cancel an accepted order in case of vehicle breakdown or emergencies, in which case a new driver will be assigned automatically.</p>
            </section>

            <section style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ color: 'white', fontSize: '1.25rem', marginBottom: '1rem' }}>2. Refunds</h2>
                <p>We process refunds in the following scenarios:</p>
                <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                    <li><strong>Service Not Delivered:</strong> If your delivery was never picked up or was lost in transit.</li>
                    <li><strong>Damaged Goods:</strong> If items were damaged due to driver negligence (proven with evidence).</li>
                    <li><strong>Incorrect Charges:</strong> Any system errors resulting in overcharging.</li>
                </ul>
            </section>

            <section style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ color: 'white', fontSize: '1.25rem', marginBottom: '1rem' }}>3. Non-Refundable Items</h2>
                <p>The following are generally non-refundable:</p>
                <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                    <li>Completed deliveries where the service was performed as requested.</li>
                    <li>Delays caused by external factors (traffic, weather, road closures).</li>
                    <li>Cancellations made after the driver has already arrived at the pickup location.</li>
                </ul>
            </section>

            <section style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ color: 'white', fontSize: '1.25rem', marginBottom: '1rem' }}>4. Processing Time</h2>
                <p>Approved refunds are processed within 5-10 business days and returned to the original payment method.</p>
            </section>
        </LegalLayout>
    );
};

export default RefundPolicy;
