-- Restore users with minimal essential columns only
-- This avoids schema mismatch issues

-- Insert Mohamed Gaber (minimal columns)
INSERT INTO public.users (
    id, name, email, password_hash, phone, 
    primary_role, granted_roles, rating, 
    completed_deliveries, is_available, is_verified,
    country, city, area, created_at, updated_at, gender
) VALUES (
    '1765364880020yw23gt30e',
    'Mohamed Gaber',
    'gaber5h@gmail.com',
    '$2a$10$8kP9qyjTCipA0eqAQ49Urev6k4tHsQJRiCid/X0a9f6ZUmwRaXdA2',
    '01112610107',
    'customer',
    '{customer}',
    5.00,
    0,
    true,
    true,
    'Egypt',
    'alex',
    'alex',
    '2025-12-10 12:08:00.03034',
    '2025-12-10 12:08:00.03034',
    'male'
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    phone = EXCLUDED.phone,
    updated_at = NOW();

-- Insert kemo (minimal columns)
INSERT INTO public.users (
    id, name, email, password_hash, phone, 
    primary_role, granted_roles, rating, 
    completed_deliveries, is_available, is_verified,
    country, city, area, created_at, updated_at, gender
) VALUES (
    '176540168171731iqrra1h',
    'kemo',
    'kareem.khalfalla.dev@gmail.com',
    '$2a$10$xp2GK0CGHnnOLqaaTELfM.CdW0VmK/WTUSB6.qrAQRXjXrZ9d03ES',
    '01556266969',
    'customer',
    '{customer}',
    5.00,
    0,
    true,
    false,
    'Egypt',
    'alex',
    'sidi beshr',
    '2025-12-10 22:21:21.718407',
    '2025-12-10 22:21:21.718407',
    'male'
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    phone = EXCLUDED.phone,
    updated_at = NOW();

-- Verify restoration
SELECT id, name, email, phone, primary_role, is_verified, created_at 
FROM public.users 
WHERE email IN ('gaber5h@gmail.com', 'kareem.khalfalla.dev@gmail.com')
ORDER BY created_at;
