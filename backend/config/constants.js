/**
 * Application-wide constants
 */

// Location cache configuration
const LOCATION_CACHE_KEYS = {
    COUNTRIES: 'countries'
};

const LOCATION_CACHE_TTLS = {
    COUNTRIES: 1000 * 60 * 60 * 24 * 7, // 7 days
    CITIES: 1000 * 60 * 60 * 6,         // 6 hours
    AREAS: 1000 * 60 * 60 * 6,          // 6 hours
    STREETS: 1000 * 60 * 60 * 6,        // 6 hours
    ROUTES: 1000 * 60 * 60 * 12         // 12 hours
};

// Common countries list
const COMMON_COUNTRIES = [
    'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda', 'Argentina',
    'Armenia', 'Australia', 'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh',
    'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan', 'Bolivia', 'Bosnia and Herzegovina',
    'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Cambodia', 'Cameroon',
    'Canada', 'Cape Verde', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros',
    'Costa Rica', 'Côte d\'Ivoire', 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic', 'Democratic Republic of the Congo',
    'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'Ecuador', 'Egypt', 'El Salvador',
    'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia', 'Fiji', 'Finland', 'France',
    'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala',
    'Guinea', 'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras', 'Hungary', 'Iceland', 'India',
    'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Jamaica', 'Japan',
    'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia',
    'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Madagascar',
    'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius',
    'Mexico', 'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique',
    'Myanmar', 'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger',
    'Nigeria', 'North Macedonia', 'Norway', 'Oman', 'Pakistan', 'Palau', 'Panama', 'Papua New Guinea',
    'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia',
    'Rwanda', 'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa',
    'San Marino', 'Sao Tome and Principe', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles',
    'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia',
    'South Africa', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname',
    'Sweden', 'Switzerland', 'Syria', 'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste',
    'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu',
    'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay',
    'Uzbekistan', 'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe'
];

// Order status values - CLEAN DEFINITIONS (no namespacing)
// Statuses are distinguished by order_type, not by namespacing
const ORDER_STATUS = {
  // Shared statuses (different meanings by context/order_type)
  PENDING: 'pending',
  ACCEPTED: 'accepted',        // marketplace: vendor accepted, delivery: driver bid accepted
  PICKED_UP: 'picked_up',      // marketplace: from vendor, delivery: from customer
  DELIVERED: 'delivered',      // marketplace: to customer, delivery: to destination
  CANCELED: 'cancelled',       // Unified to British spelling — matches DB columns and 95% of codebase
  COMPLETED: 'completed',

  // Marketplace-specific statuses
  PAID: 'paid',
  ASSIGNED: 'assigned',
  REJECTED: 'rejected',
  DISPUTED: 'disputed',
  REFUNDED: 'refunded',
  FAILED: 'failed',

  // Delivery-specific statuses
  PENDING_BIDS: 'pending_bids',
  IN_TRANSIT: 'in_transit',
  DELIVERED_PENDING: 'delivered_pending'
};

// Order types to distinguish between systems
const ORDER_TYPES = {
  DELIVERY: 'delivery',         // Traditional customer-to-driver delivery
  MARKETPLACE: 'marketplace'    // Vendor-to-customer marketplace orders
};

// Bid status values
const BID_STATUS = {
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    REJECTED: 'rejected'
};

// Payment status values
const PAYMENT_STATUS = {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
    REFUNDED: 'refunded',
    CANCELLED: 'cancelled'
};

// User granted_roles
const USER_ROLES = {
    CUSTOMER: 'customer',
    DRIVER: 'driver',
    ADMIN: 'admin',
    VENDOR: 'vendor'
};

module.exports = {
    LOCATION_CACHE_KEYS,
    LOCATION_CACHE_TTLS,
    COMMON_COUNTRIES,
    ORDER_STATUS,
    ORDER_TYPES,
    BID_STATUS,
    PAYMENT_STATUS,
    USER_ROLES
};
