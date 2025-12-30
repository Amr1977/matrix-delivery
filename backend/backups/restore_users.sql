-- Restore specific users to production database
-- Users: kemo and Mohamed Gaber
-- Date: 2025-12-30

-- Insert Mohamed Gaber
INSERT INTO public.users (
    id, name, email, password, phone, primary_role, granted_roles,
    vehicle_type, rating, completed_deliveries, is_available, is_verified,
    verified_at, country, city, area, profile_picture_url, created_at,
    updated_at, license_number, service_area_zone, preferences,
    notification_prefs, two_factor_methods, language, theme,
    document_verification_status, wallet_address, wallet_verified,
    wallet_connected_at, last_active, gender
) VALUES (
    '1765364880020yw23gt30e',
    'Mohamed Gaber',
    'gaber5h@gmail.com',
    '$2a$10$8kP9qyjTCipA0eqAQ49Urev6k4tHsQJRiCid/X0a9f6ZUmwRaXdA2',
    '01112610107',
    'customer',
    '{customer}',
    NULL,
    5.00,
    0,
    true,
    true,
    NULL,
    'Egypt',
    'alex',
    'alex',
    NULL,
    '2025-12-10 12:08:00.03034',
    '2025-12-10 12:08:00.03034',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    false,
    NULL,
    NULL,
    'male'
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    password = EXCLUDED.password,
    phone = EXCLUDED.phone,
    updated_at = NOW();

-- Insert kemo
INSERT INTO public.users (
    id, name, email, password, phone, primary_role, granted_roles,
    vehicle_type, rating, completed_deliveries, is_available, is_verified,
    verified_at, country, city, area, profile_picture_url, created_at,
    updated_at, license_number, service_area_zone, preferences,
    notification_prefs, two_factor_methods, language, theme,
    document_verification_status, wallet_address, wallet_verified,
    wallet_connected_at, last_active, gender
) VALUES (
    '176540168171731iqrra1h',
    'kemo',
    'kareem.khalfalla.dev@gmail.com',
    '$2a$10$xp2GK0CGHnnOLqaaTELfM.CdW0VmK/WTUSB6.qrAQRXjXrZ9d03ES',
    '01556266969',
    'customer',
    '{customer}',
    NULL,
    5.00,
    0,
    true,
    false,
    NULL,
    'Egypt',
    'alex',
    'sidi beshr',
    NULL,
    '2025-12-10 22:21:21.718407',
    '2025-12-10 22:21:21.718407',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    false,
    NULL,
    '2025-12-10 22:22:00.381',
    'male'
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    password = EXCLUDED.password,
    phone = EXCLUDED.phone,
    updated_at = NOW();

-- Verification query
SELECT id, name, email, phone, primary_role, created_at 
FROM public.users 
WHERE email IN ('gaber5h@gmail.com', 'kareem.khalfalla.dev@gmail.com')
ORDER BY created_at;
