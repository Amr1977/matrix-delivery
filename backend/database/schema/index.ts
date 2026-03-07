/**
 * Database Schema Exports
 * All table schemas in dependency order (tables with foreign keys last)
 */

// Core tables
export { usersSchema } from './users';

// Auth and user-related tables
export {
    passwordResetTokensSchema,
    emailVerificationTokensSchema,
    userFavoritesSchema,
    userPaymentMethodsSchema
} from './auth';

// Order-related tables
export { ordersSchema } from './orders';
export { bidsSchema } from './bids';
export { platformReviewsSchema } from './platform_reviews';
export { paymentsSchema } from './payments';
export { notificationsSchema } from './notifications';

// Balance tables
export {
    userBalancesSchema,
    balanceTransactionsSchema,
    withdrawalRequestsSchema,
    balanceHoldsSchema
} from './balance';

// Tracking and messaging
export {
    messagesSchema,
    locationUpdatesSchema,
    driverLocationsSchema
} from './tracking';

export { fcmTokensSchema } from './fcmTokens';

// Vendor tables
export {
    vendorsSchema,
    vendorCategoriesSchema,
    vendorItemsSchema
} from './vendors';

// Location tables
export {
    locationsSchema,
    locationCacheSchema,
    coordinateMappingsSchema
} from './locations';

// Logs
export { logsSchema } from './logs';

// Import all for ordering
import { usersSchema } from './users';
import {
    passwordResetTokensSchema,
    emailVerificationTokensSchema,
    userFavoritesSchema,
    userPaymentMethodsSchema
} from './auth';
import { ordersSchema } from './orders';
import { bidsSchema } from './bids';
import { platformReviewsSchema, platformReviewVotesSchema, platformReviewFlagsSchema } from './platform_reviews';
import { paymentsSchema, walletPaymentsSchema } from './payments';
import { notificationsSchema } from './notifications';
import {
    userBalancesSchema,
    balanceTransactionsSchema,
    withdrawalRequestsSchema,
    balanceHoldsSchema
} from './balance';
import {
    messagesSchema,
    locationUpdatesSchema,
    driverLocationsSchema
} from './tracking';
import { fcmTokensSchema } from './fcmTokens';
import {
    vendorsSchema,
    vendorCategoriesSchema,
    vendorItemsSchema
} from './vendors';
import {
    locationsSchema,
    locationCacheSchema,
    coordinateMappingsSchema
} from './locations';
import { logsSchema } from './logs';

/**
 * All schemas in dependency order
 * Tables with foreign keys must be created after their referenced tables
 */
export const allSchemas = [
    // Core tables (no dependencies)
    usersSchema,
    fcmTokensSchema,

    // Auth tables (depend on users)
    passwordResetTokensSchema,
    emailVerificationTokensSchema,
    userFavoritesSchema,
    userPaymentMethodsSchema,

    // Order tables (depend on users)
    ordersSchema,

    // Order-related tables (depend on users + orders)
    bidsSchema,
    paymentsSchema,
    walletPaymentsSchema,
    notificationsSchema,
    platformReviewsSchema,
    
    // Balance tables (depend on users + orders)
    userBalancesSchema,
    balanceTransactionsSchema,
    withdrawalRequestsSchema,
    balanceHoldsSchema,

    platformReviewVotesSchema,
    platformReviewFlagsSchema,
    messagesSchema,
    locationUpdatesSchema,
    driverLocationsSchema,

    // Vendor tables (depend on users)
    vendorsSchema,
    vendorCategoriesSchema,
    vendorItemsSchema,

    // Location tables (no dependencies)
    locationsSchema,
    locationCacheSchema,
    coordinateMappingsSchema,

    // Logs (depends on users)
    logsSchema
];
