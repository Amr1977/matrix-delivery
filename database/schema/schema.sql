--
-- PostgreSQL database dump
--

\restrict 7gHmWKTlsw5cS4LDddzL0w25bblhb6D7xxUNIrgCuDGDwr8Cb12V20Q2cXAnZst

-- Dumped from database version 17.11 (8a81ecb)
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.withdrawal_requests DROP CONSTRAINT IF EXISTS withdrawal_requests_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.wallet_payments DROP CONSTRAINT IF EXISTS wallet_payments_order_id_fkey;
ALTER TABLE IF EXISTS ONLY public.wallet_payments DROP CONSTRAINT IF EXISTS wallet_payments_confirmed_by_fkey;
ALTER TABLE IF EXISTS ONLY public.vendors DROP CONSTRAINT IF EXISTS vendors_owner_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.vendor_payouts DROP CONSTRAINT IF EXISTS vendor_payouts_vendor_id_fkey;
ALTER TABLE IF EXISTS ONLY public.vendor_payouts DROP CONSTRAINT IF EXISTS vendor_payouts_processed_by_fkey;
ALTER TABLE IF EXISTS ONLY public.vendor_payouts DROP CONSTRAINT IF EXISTS vendor_payouts_order_id_fkey;
ALTER TABLE IF EXISTS ONLY public.vendor_items DROP CONSTRAINT IF EXISTS vendor_items_vendor_id_fkey;
ALTER TABLE IF EXISTS ONLY public.vendor_categories DROP CONSTRAINT IF EXISTS vendor_categories_vendor_id_fkey;
ALTER TABLE IF EXISTS ONLY public.user_saved_addresses DROP CONSTRAINT IF EXISTS user_saved_addresses_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.user_payment_methods DROP CONSTRAINT IF EXISTS user_payment_methods_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.user_favorites DROP CONSTRAINT IF EXISTS user_favorites_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.user_favorites DROP CONSTRAINT IF EXISTS user_favorites_favorite_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.user_balances DROP CONSTRAINT IF EXISTS user_balances_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.topups DROP CONSTRAINT IF EXISTS topups_verified_by_fkey;
ALTER TABLE IF EXISTS ONLY public.topups DROP CONSTRAINT IF EXISTS topups_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.topups DROP CONSTRAINT IF EXISTS topups_platform_wallet_id_fkey;
ALTER TABLE IF EXISTS ONLY public.topup_audit_logs DROP CONSTRAINT IF EXISTS topup_audit_logs_topup_id_fkey;
ALTER TABLE IF EXISTS ONLY public.topup_audit_logs DROP CONSTRAINT IF EXISTS topup_audit_logs_admin_id_fkey;
ALTER TABLE IF EXISTS ONLY public.takaful_loan_payments DROP CONSTRAINT IF EXISTS takaful_loan_payments_loan_id_fkey;
ALTER TABLE IF EXISTS ONLY public.system_settings DROP CONSTRAINT IF EXISTS system_settings_updated_by_fkey;
ALTER TABLE IF EXISTS ONLY public.stores DROP CONSTRAINT IF EXISTS stores_vendor_id_fkey;
ALTER TABLE IF EXISTS ONLY public.shopping_carts DROP CONSTRAINT IF EXISTS shopping_carts_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.shopping_carts DROP CONSTRAINT IF EXISTS shopping_carts_store_id_fkey;
ALTER TABLE IF EXISTS ONLY public.reviews DROP CONSTRAINT IF EXISTS reviews_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.reviews DROP CONSTRAINT IF EXISTS reviews_reviewer_id_fkey;
ALTER TABLE IF EXISTS ONLY public.reviews DROP CONSTRAINT IF EXISTS reviews_reviewee_id_fkey;
ALTER TABLE IF EXISTS ONLY public.reviews DROP CONSTRAINT IF EXISTS reviews_order_id_fkey;
ALTER TABLE IF EXISTS ONLY public.review_votes DROP CONSTRAINT IF EXISTS review_votes_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.review_votes DROP CONSTRAINT IF EXISTS review_votes_review_id_fkey;
ALTER TABLE IF EXISTS ONLY public.review_flags DROP CONSTRAINT IF EXISTS review_flags_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.review_flags DROP CONSTRAINT IF EXISTS review_flags_review_id_fkey;
ALTER TABLE IF EXISTS ONLY public.referral_payouts DROP CONSTRAINT IF EXISTS referral_payouts_referrer_id_fkey;
ALTER TABLE IF EXISTS ONLY public.referral_earnings DROP CONSTRAINT IF EXISTS referral_earnings_referrer_id_fkey;
ALTER TABLE IF EXISTS ONLY public.referral_conversions DROP CONSTRAINT IF EXISTS referral_conversions_referral_code_fkey;
ALTER TABLE IF EXISTS ONLY public.platform_reviews DROP CONSTRAINT IF EXISTS platform_reviews_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.platform_review_votes DROP CONSTRAINT IF EXISTS platform_review_votes_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.platform_review_votes DROP CONSTRAINT IF EXISTS platform_review_votes_review_id_fkey;
ALTER TABLE IF EXISTS ONLY public.platform_review_flags DROP CONSTRAINT IF EXISTS platform_review_flags_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.platform_review_flags DROP CONSTRAINT IF EXISTS platform_review_flags_review_id_fkey;
ALTER TABLE IF EXISTS ONLY public.platform_revenue DROP CONSTRAINT IF EXISTS platform_revenue_order_id_fkey;
ALTER TABLE IF EXISTS ONLY public.payments DROP CONSTRAINT IF EXISTS payments_payer_id_fkey;
ALTER TABLE IF EXISTS ONLY public.payments DROP CONSTRAINT IF EXISTS payments_order_id_fkey;
ALTER TABLE IF EXISTS ONLY public.password_reset_tokens DROP CONSTRAINT IF EXISTS password_reset_tokens_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS orders_emergency_transfer_id_fkey;
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS orders_customer_id_fkey;
ALTER TABLE IF EXISTS ONLY public.offers DROP CONSTRAINT IF EXISTS offers_item_id_fkey;
ALTER TABLE IF EXISTS ONLY public.notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.notifications DROP CONSTRAINT IF EXISTS notifications_order_id_fkey;
ALTER TABLE IF EXISTS ONLY public.messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE IF EXISTS ONLY public.messages DROP CONSTRAINT IF EXISTS messages_recipient_id_fkey;
ALTER TABLE IF EXISTS ONLY public.messages DROP CONSTRAINT IF EXISTS messages_order_id_fkey;
ALTER TABLE IF EXISTS ONLY public.marketplace_reviews DROP CONSTRAINT IF EXISTS marketplace_reviews_vendor_id_fkey;
ALTER TABLE IF EXISTS ONLY public.marketplace_reviews DROP CONSTRAINT IF EXISTS marketplace_reviews_store_id_fkey;
ALTER TABLE IF EXISTS ONLY public.marketplace_reviews DROP CONSTRAINT IF EXISTS marketplace_reviews_reviewer_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.marketplace_reviews DROP CONSTRAINT IF EXISTS marketplace_reviews_order_id_fkey;
ALTER TABLE IF EXISTS ONLY public.marketplace_orders DROP CONSTRAINT IF EXISTS marketplace_orders_vendor_id_fkey;
ALTER TABLE IF EXISTS ONLY public.marketplace_orders DROP CONSTRAINT IF EXISTS marketplace_orders_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.marketplace_orders DROP CONSTRAINT IF EXISTS marketplace_orders_store_id_fkey;
ALTER TABLE IF EXISTS ONLY public.marketplace_orders DROP CONSTRAINT IF EXISTS marketplace_orders_cart_id_fkey;
ALTER TABLE IF EXISTS ONLY public.marketplace_order_vendor_fsm DROP CONSTRAINT IF EXISTS marketplace_order_vendor_fsm_order_id_fkey;
ALTER TABLE IF EXISTS ONLY public.marketplace_order_payment_fsm DROP CONSTRAINT IF EXISTS marketplace_order_payment_fsm_order_id_fkey;
ALTER TABLE IF EXISTS ONLY public.marketplace_order_items DROP CONSTRAINT IF EXISTS marketplace_order_items_order_id_fkey;
ALTER TABLE IF EXISTS ONLY public.marketplace_order_items DROP CONSTRAINT IF EXISTS marketplace_order_items_item_id_fkey;
ALTER TABLE IF EXISTS ONLY public.marketplace_order_delivery_fsm DROP CONSTRAINT IF EXISTS marketplace_order_delivery_fsm_order_id_fkey;
ALTER TABLE IF EXISTS ONLY public.marketplace_audit_logs DROP CONSTRAINT IF EXISTS marketplace_audit_logs_vendor_id_fkey;
ALTER TABLE IF EXISTS ONLY public.marketplace_audit_logs DROP CONSTRAINT IF EXISTS marketplace_audit_logs_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.marketplace_audit_logs DROP CONSTRAINT IF EXISTS marketplace_audit_logs_order_id_fkey;
ALTER TABLE IF EXISTS ONLY public.logs DROP CONSTRAINT IF EXISTS logs_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.location_updates DROP CONSTRAINT IF EXISTS location_updates_order_id_fkey;
ALTER TABLE IF EXISTS ONLY public.location_updates DROP CONSTRAINT IF EXISTS location_updates_driver_id_fkey;
ALTER TABLE IF EXISTS ONLY public.items DROP CONSTRAINT IF EXISTS items_store_id_fkey;
ALTER TABLE IF EXISTS ONLY public.items DROP CONSTRAINT IF EXISTS items_category_id_fkey;
ALTER TABLE IF EXISTS ONLY public.fsm_action_log DROP CONSTRAINT IF EXISTS fsm_action_log_order_id_fkey;
ALTER TABLE IF EXISTS ONLY public.takaful_contributions DROP CONSTRAINT IF EXISTS fk_contrib_order;
ALTER TABLE IF EXISTS ONLY public.fcm_tokens DROP CONSTRAINT IF EXISTS fcm_tokens_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.emergency_transfers DROP CONSTRAINT IF EXISTS emergency_transfers_order_id_fkey;
ALTER TABLE IF EXISTS ONLY public.emergency_transfer_notifications DROP CONSTRAINT IF EXISTS emergency_transfer_notifications_transfer_id_fkey;
ALTER TABLE IF EXISTS ONLY public.email_verification_tokens DROP CONSTRAINT IF EXISTS email_verification_tokens_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.driver_locations DROP CONSTRAINT IF EXISTS driver_locations_order_id_fkey;
ALTER TABLE IF EXISTS ONLY public.crypto_transactions DROP CONSTRAINT IF EXISTS crypto_transactions_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.crypto_transactions DROP CONSTRAINT IF EXISTS crypto_transactions_order_id_fkey;
ALTER TABLE IF EXISTS ONLY public.categories DROP CONSTRAINT IF EXISTS categories_parent_id_fkey;
ALTER TABLE IF EXISTS ONLY public.cart_items DROP CONSTRAINT IF EXISTS cart_items_item_id_fkey;
ALTER TABLE IF EXISTS ONLY public.cart_items DROP CONSTRAINT IF EXISTS cart_items_cart_id_fkey;
ALTER TABLE IF EXISTS ONLY public.bids DROP CONSTRAINT IF EXISTS bids_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.bids DROP CONSTRAINT IF EXISTS bids_order_id_fkey;
ALTER TABLE IF EXISTS ONLY public.balance_transactions DROP CONSTRAINT IF EXISTS balance_transactions_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.balance_holds DROP CONSTRAINT IF EXISTS balance_holds_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.balance_holds DROP CONSTRAINT IF EXISTS balance_holds_transaction_id_fkey;
ALTER TABLE IF EXISTS ONLY public.backups DROP CONSTRAINT IF EXISTS backups_created_by_fkey;
ALTER TABLE IF EXISTS ONLY public.admin_logs DROP CONSTRAINT IF EXISTS admin_logs_admin_id_fkey;
DROP TRIGGER IF EXISTS wallet_payments_updated_at ON public.wallet_payments;
DROP TRIGGER IF EXISTS vendor_fsm_updated ON public.marketplace_order_vendor_fsm;
DROP TRIGGER IF EXISTS trigger_update_vendor_rating_on_review ON public.marketplace_reviews;
DROP TRIGGER IF EXISTS trigger_update_vendor_payout_updated_at ON public.vendor_payouts;
DROP TRIGGER IF EXISTS trigger_update_marketplace_review_updated_at ON public.marketplace_reviews;
DROP TRIGGER IF EXISTS trigger_update_marketplace_order_updated_at ON public.marketplace_order_items;
DROP TRIGGER IF EXISTS trigger_update_cart_updated_at ON public.cart_items;
DROP TRIGGER IF EXISTS trigger_set_payout_number ON public.vendor_payouts;
DROP TRIGGER IF EXISTS trg_takaful_contribution ON public.takaful_contributions;
DROP TRIGGER IF EXISTS topups_updated_at ON public.topups;
DROP TRIGGER IF EXISTS payment_fsm_updated ON public.marketplace_order_payment_fsm;
DROP TRIGGER IF EXISTS delivery_fsm_updated ON public.marketplace_order_delivery_fsm;
DROP TRIGGER IF EXISTS balance_transactions_updated_at ON public.balance_transactions;
DROP TRIGGER IF EXISTS balance_holds_updated_at ON public.balance_holds;
DROP INDEX IF EXISTS public.idx_withdrawal_requests_user_id;
DROP INDEX IF EXISTS public.idx_withdrawal_requests_status;
DROP INDEX IF EXISTS public.idx_withdrawal_requests_request_number;
DROP INDEX IF EXISTS public.idx_wallet_payments_wallet_type;
DROP INDEX IF EXISTS public.idx_wallet_payments_transaction_ref;
DROP INDEX IF EXISTS public.idx_wallet_payments_status;
DROP INDEX IF EXISTS public.idx_wallet_payments_order_id;
DROP INDEX IF EXISTS public.idx_wallet_payments_created_at;
DROP INDEX IF EXISTS public.idx_vendors_rating;
DROP INDEX IF EXISTS public.idx_vendors_owner;
DROP INDEX IF EXISTS public.idx_vendors_coords;
DROP INDEX IF EXISTS public.idx_vendors_city;
DROP INDEX IF EXISTS public.idx_vendor_payouts_vendor;
DROP INDEX IF EXISTS public.idx_vendor_payouts_unique_order;
DROP INDEX IF EXISTS public.idx_vendor_payouts_status;
DROP INDEX IF EXISTS public.idx_vendor_payouts_payout_number;
DROP INDEX IF EXISTS public.idx_vendor_payouts_order;
DROP INDEX IF EXISTS public.idx_vendor_payouts_created;
DROP INDEX IF EXISTS public.idx_vendor_items_vendor;
DROP INDEX IF EXISTS public.idx_vendor_items_price;
DROP INDEX IF EXISTS public.idx_vendor_items_created;
DROP INDEX IF EXISTS public.idx_vendor_items_category;
DROP INDEX IF EXISTS public.idx_vendor_fsm_state;
DROP INDEX IF EXISTS public.idx_users_wallet;
DROP INDEX IF EXISTS public.idx_users_primary_role;
DROP INDEX IF EXISTS public.idx_users_last_active;
DROP INDEX IF EXISTS public.idx_users_is_verified;
DROP INDEX IF EXISTS public.idx_users_is_available;
DROP INDEX IF EXISTS public.idx_users_email;
DROP INDEX IF EXISTS public.idx_users_created_at;
DROP INDEX IF EXISTS public.idx_user_saved_addresses_user;
DROP INDEX IF EXISTS public.idx_user_balances_user_id;
DROP INDEX IF EXISTS public.idx_user_balances_frozen;
DROP INDEX IF EXISTS public.idx_user_balances_currency;
DROP INDEX IF EXISTS public.idx_user_balances_active;
DROP INDEX IF EXISTS public.idx_topups_user_id;
DROP INDEX IF EXISTS public.idx_topups_status;
DROP INDEX IF EXISTS public.idx_topups_reference;
DROP INDEX IF EXISTS public.idx_topups_payment_method;
DROP INDEX IF EXISTS public.idx_topups_created_at;
DROP INDEX IF EXISTS public.idx_topup_audit_logs_topup_id;
DROP INDEX IF EXISTS public.idx_topup_audit_logs_admin_id;
DROP INDEX IF EXISTS public.idx_takaful_loans_status;
DROP INDEX IF EXISTS public.idx_takaful_loans_courier;
DROP INDEX IF EXISTS public.idx_takaful_contributions_order;
DROP INDEX IF EXISTS public.idx_takaful_contributions_date;
DROP INDEX IF EXISTS public.idx_takaful_contributions_courier;
DROP INDEX IF EXISTS public.idx_takaful_claims_type;
DROP INDEX IF EXISTS public.idx_takaful_claims_status;
DROP INDEX IF EXISTS public.idx_takaful_claims_courier;
DROP INDEX IF EXISTS public.idx_stores_vendor_id;
DROP INDEX IF EXISTS public.idx_stores_location;
DROP INDEX IF EXISTS public.idx_shopping_carts_user_id;
DROP INDEX IF EXISTS public.idx_shopping_carts_store_id;
DROP INDEX IF EXISTS public.idx_shopping_carts_expires_at;
DROP INDEX IF EXISTS public.idx_reviews_user_id;
DROP INDEX IF EXISTS public.idx_reviews_upvotes;
DROP INDEX IF EXISTS public.idx_reviews_review_type;
DROP INDEX IF EXISTS public.idx_reviews_order_id;
DROP INDEX IF EXISTS public.idx_reviews_is_approved;
DROP INDEX IF EXISTS public.idx_reviews_flag_count;
DROP INDEX IF EXISTS public.idx_reviews_created_at;
DROP INDEX IF EXISTS public.idx_referral_payouts_referrer;
DROP INDEX IF EXISTS public.idx_referral_links_referrer;
DROP INDEX IF EXISTS public.idx_referral_links_code;
DROP INDEX IF EXISTS public.idx_referral_earnings_status;
DROP INDEX IF EXISTS public.idx_referral_earnings_referrer;
DROP INDEX IF EXISTS public.idx_referral_conversions_referrer;
DROP INDEX IF EXISTS public.idx_referral_conversions_referee;
DROP INDEX IF EXISTS public.idx_platform_wallets_active;
DROP INDEX IF EXISTS public.idx_platform_reviews_user_id;
DROP INDEX IF EXISTS public.idx_platform_reviews_upvotes;
DROP INDEX IF EXISTS public.idx_platform_reviews_is_approved;
DROP INDEX IF EXISTS public.idx_platform_reviews_flag_count;
DROP INDEX IF EXISTS public.idx_platform_reviews_created_at;
DROP INDEX IF EXISTS public.idx_platform_revenue_payment_method;
DROP INDEX IF EXISTS public.idx_platform_revenue_created;
DROP INDEX IF EXISTS public.idx_payments_status;
DROP INDEX IF EXISTS public.idx_payments_paymob_transaction;
DROP INDEX IF EXISTS public.idx_payments_paymob_order;
DROP INDEX IF EXISTS public.idx_payments_payer_id;
DROP INDEX IF EXISTS public.idx_payments_order_id;
DROP INDEX IF EXISTS public.idx_payments_created_at;
DROP INDEX IF EXISTS public.idx_payment_fsm_state;
DROP INDEX IF EXISTS public.idx_password_reset_tokens_user_id;
DROP INDEX IF EXISTS public.idx_password_reset_tokens_token;
DROP INDEX IF EXISTS public.idx_password_reset_tokens_expires_at;
DROP INDEX IF EXISTS public.idx_orders_status;
DROP INDEX IF EXISTS public.idx_orders_payment_method;
DROP INDEX IF EXISTS public.idx_orders_order_number;
DROP INDEX IF EXISTS public.idx_orders_escrow_status;
DROP INDEX IF EXISTS public.idx_orders_driver_status;
DROP INDEX IF EXISTS public.idx_orders_customer_id;
DROP INDEX IF EXISTS public.idx_orders_created_at;
DROP INDEX IF EXISTS public.idx_orders_completed_at;
DROP INDEX IF EXISTS public.idx_orders_blockchain_tx;
DROP INDEX IF EXISTS public.idx_orders_assigned_driver_user_id;
DROP INDEX IF EXISTS public.idx_offers_status;
DROP INDEX IF EXISTS public.idx_offers_item_id;
DROP INDEX IF EXISTS public.idx_offers_date_range;
DROP INDEX IF EXISTS public.idx_notifications_user_id;
DROP INDEX IF EXISTS public.idx_notifications_order_id;
DROP INDEX IF EXISTS public.idx_notifications_is_read;
DROP INDEX IF EXISTS public.idx_notifications_created_at;
DROP INDEX IF EXISTS public.idx_migration_name;
DROP INDEX IF EXISTS public.idx_messages_sender_id;
DROP INDEX IF EXISTS public.idx_messages_recipient_id;
DROP INDEX IF EXISTS public.idx_messages_order_id;
DROP INDEX IF EXISTS public.idx_messages_is_read;
DROP INDEX IF EXISTS public.idx_messages_created_at;
DROP INDEX IF EXISTS public.idx_marketplace_reviews_vendor_id;
DROP INDEX IF EXISTS public.idx_marketplace_reviews_reviewer;
DROP INDEX IF EXISTS public.idx_marketplace_reviews_order_id;
DROP INDEX IF EXISTS public.idx_marketplace_reviews_featured;
DROP INDEX IF EXISTS public.idx_marketplace_reviews_approved;
DROP INDEX IF EXISTS public.idx_marketplace_orders_vendor_id;
DROP INDEX IF EXISTS public.idx_marketplace_orders_user_id;
DROP INDEX IF EXISTS public.idx_marketplace_orders_store_id;
DROP INDEX IF EXISTS public.idx_marketplace_orders_status;
DROP INDEX IF EXISTS public.idx_marketplace_orders_order_number;
DROP INDEX IF EXISTS public.idx_marketplace_orders_created_at;
DROP INDEX IF EXISTS public.idx_marketplace_order_items_order_id;
DROP INDEX IF EXISTS public.idx_marketplace_order_items_item_id;
DROP INDEX IF EXISTS public.idx_marketplace_metrics_type_timestamp;
DROP INDEX IF EXISTS public.idx_marketplace_metrics_timestamp;
DROP INDEX IF EXISTS public.idx_marketplace_audit_logs_vendor_id;
DROP INDEX IF EXISTS public.idx_marketplace_audit_logs_user_id;
DROP INDEX IF EXISTS public.idx_marketplace_audit_logs_order_id;
DROP INDEX IF EXISTS public.idx_marketplace_audit_logs_created_at;
DROP INDEX IF EXISTS public.idx_marketplace_audit_logs_action;
DROP INDEX IF EXISTS public.idx_logs_user_id;
DROP INDEX IF EXISTS public.idx_logs_timestamp;
DROP INDEX IF EXISTS public.idx_logs_source;
DROP INDEX IF EXISTS public.idx_logs_session_id;
DROP INDEX IF EXISTS public.idx_logs_level;
DROP INDEX IF EXISTS public.idx_logs_category;
DROP INDEX IF EXISTS public.idx_location_updates_order_id;
DROP INDEX IF EXISTS public.idx_location_updates_driver_id;
DROP INDEX IF EXISTS public.idx_location_updates_created_at;
DROP INDEX IF EXISTS public.idx_loan_payments_loan;
DROP INDEX IF EXISTS public.idx_items_store_id;
DROP INDEX IF EXISTS public.idx_items_status;
DROP INDEX IF EXISTS public.idx_items_inventory_quantity;
DROP INDEX IF EXISTS public.idx_items_category_id;
DROP INDEX IF EXISTS public.idx_health_logs_timestamp;
DROP INDEX IF EXISTS public.idx_fcm_tokens_user_id;
DROP INDEX IF EXISTS public.idx_fcm_tokens_role;
DROP INDEX IF EXISTS public.idx_fcm_tokens_active;
DROP INDEX IF EXISTS public.idx_emergency_transfers_timeout;
DROP INDEX IF EXISTS public.idx_emergency_transfers_status;
DROP INDEX IF EXISTS public.idx_emergency_transfers_order;
DROP INDEX IF EXISTS public.idx_emergency_transfers_new_driver;
DROP INDEX IF EXISTS public.idx_emergency_notif_transfer;
DROP INDEX IF EXISTS public.idx_emergency_notif_driver;
DROP INDEX IF EXISTS public.idx_email_verification_tokens_user_id;
DROP INDEX IF EXISTS public.idx_email_verification_tokens_token;
DROP INDEX IF EXISTS public.idx_email_verification_tokens_expires_at;
DROP INDEX IF EXISTS public.idx_driver_locations_timestamp;
DROP INDEX IF EXISTS public.idx_driver_locations_order;
DROP INDEX IF EXISTS public.idx_driver_locations_driver_id;
DROP INDEX IF EXISTS public.idx_delivery_fsm_state;
DROP INDEX IF EXISTS public.idx_crypto_tx_user;
DROP INDEX IF EXISTS public.idx_crypto_tx_status;
DROP INDEX IF EXISTS public.idx_crypto_tx_order;
DROP INDEX IF EXISTS public.idx_crypto_tx_hash;
DROP INDEX IF EXISTS public.idx_categories_parent_id;
DROP INDEX IF EXISTS public.idx_categories_name;
DROP INDEX IF EXISTS public.idx_cart_items_item_id;
DROP INDEX IF EXISTS public.idx_cart_items_cart_item;
DROP INDEX IF EXISTS public.idx_cart_items_cart_id;
DROP INDEX IF EXISTS public.idx_bids_user_id;
DROP INDEX IF EXISTS public.idx_bids_status;
DROP INDEX IF EXISTS public.idx_bids_order_id;
DROP INDEX IF EXISTS public.idx_bids_created_at;
DROP INDEX IF EXISTS public.idx_balance_tx_user_type_status;
DROP INDEX IF EXISTS public.idx_balance_tx_user_type_created;
DROP INDEX IF EXISTS public.idx_balance_tx_user_created;
DROP INDEX IF EXISTS public.idx_balance_tx_user;
DROP INDEX IF EXISTS public.idx_balance_tx_type;
DROP INDEX IF EXISTS public.idx_balance_tx_transaction_id;
DROP INDEX IF EXISTS public.idx_balance_tx_status;
DROP INDEX IF EXISTS public.idx_balance_tx_order;
DROP INDEX IF EXISTS public.idx_balance_tx_created;
DROP INDEX IF EXISTS public.idx_balance_transactions_user_id;
DROP INDEX IF EXISTS public.idx_balance_transactions_type;
DROP INDEX IF EXISTS public.idx_balance_transactions_transaction_id;
DROP INDEX IF EXISTS public.idx_balance_transactions_created_at;
DROP INDEX IF EXISTS public.idx_balance_holds_user_id;
DROP INDEX IF EXISTS public.idx_balance_holds_user;
DROP INDEX IF EXISTS public.idx_balance_holds_status;
DROP INDEX IF EXISTS public.idx_balance_holds_order;
DROP INDEX IF EXISTS public.idx_balance_holds_hold_id;
DROP INDEX IF EXISTS public.idx_balance_holds_expires;
DROP INDEX IF EXISTS public.idx_audit_logs_user_id;
DROP INDEX IF EXISTS public.idx_audit_logs_created_at;
DROP INDEX IF EXISTS public.idx_audit_logs_action;
DROP INDEX IF EXISTS public.idx_admin_logs_created;
DROP INDEX IF EXISTS public.idx_admin_logs_admin;
DROP INDEX IF EXISTS public.idx_admin_logs_action;
DROP INDEX IF EXISTS public.idx_action_log_timestamp;
DROP INDEX IF EXISTS public.idx_action_log_order_id;
DROP INDEX IF EXISTS public.idx_action_log_fsm_type;
DROP INDEX IF EXISTS public.idx_action_log_actor;
ALTER TABLE IF EXISTS ONLY public.withdrawal_requests DROP CONSTRAINT IF EXISTS withdrawal_requests_request_number_key;
ALTER TABLE IF EXISTS ONLY public.withdrawal_requests DROP CONSTRAINT IF EXISTS withdrawal_requests_pkey;
ALTER TABLE IF EXISTS ONLY public.wallet_payments DROP CONSTRAINT IF EXISTS wallet_payments_pkey;
ALTER TABLE IF EXISTS ONLY public.vendors DROP CONSTRAINT IF EXISTS vendors_pkey;
ALTER TABLE IF EXISTS ONLY public.vendor_payouts DROP CONSTRAINT IF EXISTS vendor_payouts_pkey;
ALTER TABLE IF EXISTS ONLY public.vendor_payouts DROP CONSTRAINT IF EXISTS vendor_payouts_payout_number_key;
ALTER TABLE IF EXISTS ONLY public.vendor_items DROP CONSTRAINT IF EXISTS vendor_items_pkey;
ALTER TABLE IF EXISTS ONLY public.vendor_categories DROP CONSTRAINT IF EXISTS vendor_categories_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_wallet_address_key;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE IF EXISTS ONLY public.user_saved_addresses DROP CONSTRAINT IF EXISTS user_saved_addresses_pkey;
ALTER TABLE IF EXISTS ONLY public.user_payment_methods DROP CONSTRAINT IF EXISTS user_payment_methods_user_id_provider_token_key;
ALTER TABLE IF EXISTS ONLY public.user_payment_methods DROP CONSTRAINT IF EXISTS user_payment_methods_pkey;
ALTER TABLE IF EXISTS ONLY public.user_favorites DROP CONSTRAINT IF EXISTS user_favorites_pkey;
ALTER TABLE IF EXISTS ONLY public.user_balances DROP CONSTRAINT IF EXISTS user_balances_pkey;
ALTER TABLE IF EXISTS ONLY public.topups DROP CONSTRAINT IF EXISTS topups_unique_reference_per_method;
ALTER TABLE IF EXISTS ONLY public.topups DROP CONSTRAINT IF EXISTS topups_pkey;
ALTER TABLE IF EXISTS ONLY public.topup_audit_logs DROP CONSTRAINT IF EXISTS topup_audit_logs_pkey;
ALTER TABLE IF EXISTS ONLY public.takaful_loans DROP CONSTRAINT IF EXISTS takaful_loans_pkey;
ALTER TABLE IF EXISTS ONLY public.takaful_loan_payments DROP CONSTRAINT IF EXISTS takaful_loan_payments_pkey;
ALTER TABLE IF EXISTS ONLY public.takaful_fund DROP CONSTRAINT IF EXISTS takaful_fund_pkey;
ALTER TABLE IF EXISTS ONLY public.takaful_contributions DROP CONSTRAINT IF EXISTS takaful_contributions_pkey;
ALTER TABLE IF EXISTS ONLY public.takaful_claims DROP CONSTRAINT IF EXISTS takaful_claims_pkey;
ALTER TABLE IF EXISTS ONLY public.system_settings DROP CONSTRAINT IF EXISTS system_settings_pkey;
ALTER TABLE IF EXISTS ONLY public.system_health_logs DROP CONSTRAINT IF EXISTS system_health_logs_pkey;
ALTER TABLE IF EXISTS ONLY public.stores DROP CONSTRAINT IF EXISTS stores_pkey;
ALTER TABLE IF EXISTS ONLY public.shopping_carts DROP CONSTRAINT IF EXISTS shopping_carts_pkey;
ALTER TABLE IF EXISTS ONLY public.schema_migrations DROP CONSTRAINT IF EXISTS schema_migrations_pkey;
ALTER TABLE IF EXISTS ONLY public.schema_migrations DROP CONSTRAINT IF EXISTS schema_migrations_migration_name_key;
ALTER TABLE IF EXISTS ONLY public.reviews DROP CONSTRAINT IF EXISTS reviews_pkey;
ALTER TABLE IF EXISTS ONLY public.review_votes DROP CONSTRAINT IF EXISTS review_votes_pkey;
ALTER TABLE IF EXISTS ONLY public.review_flags DROP CONSTRAINT IF EXISTS review_flags_pkey;
ALTER TABLE IF EXISTS ONLY public.referral_payouts DROP CONSTRAINT IF EXISTS referral_payouts_pkey;
ALTER TABLE IF EXISTS ONLY public.referral_links DROP CONSTRAINT IF EXISTS referral_links_pkey;
ALTER TABLE IF EXISTS ONLY public.referral_links DROP CONSTRAINT IF EXISTS referral_links_code_key;
ALTER TABLE IF EXISTS ONLY public.referral_earnings DROP CONSTRAINT IF EXISTS referral_earnings_pkey;
ALTER TABLE IF EXISTS ONLY public.referral_conversions DROP CONSTRAINT IF EXISTS referral_conversions_referrer_id_referee_id_key;
ALTER TABLE IF EXISTS ONLY public.referral_conversions DROP CONSTRAINT IF EXISTS referral_conversions_pkey;
ALTER TABLE IF EXISTS ONLY public.platform_wallets DROP CONSTRAINT IF EXISTS platform_wallets_wallet_type_key;
ALTER TABLE IF EXISTS ONLY public.platform_wallets DROP CONSTRAINT IF EXISTS platform_wallets_pkey;
ALTER TABLE IF EXISTS ONLY public.platform_reviews DROP CONSTRAINT IF EXISTS platform_reviews_pkey;
ALTER TABLE IF EXISTS ONLY public.platform_review_votes DROP CONSTRAINT IF EXISTS platform_review_votes_pkey;
ALTER TABLE IF EXISTS ONLY public.platform_review_flags DROP CONSTRAINT IF EXISTS platform_review_flags_pkey;
ALTER TABLE IF EXISTS ONLY public.platform_revenue DROP CONSTRAINT IF EXISTS platform_revenue_pkey;
ALTER TABLE IF EXISTS ONLY public.platform_revenue DROP CONSTRAINT IF EXISTS platform_revenue_order_id_key;
ALTER TABLE IF EXISTS ONLY public.payments DROP CONSTRAINT IF EXISTS payments_pkey;
ALTER TABLE IF EXISTS ONLY public.password_reset_tokens DROP CONSTRAINT IF EXISTS password_reset_tokens_token_key;
ALTER TABLE IF EXISTS ONLY public.password_reset_tokens DROP CONSTRAINT IF EXISTS password_reset_tokens_pkey;
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS orders_pkey;
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS orders_order_number_key;
ALTER TABLE IF EXISTS ONLY public.offers DROP CONSTRAINT IF EXISTS offers_pkey;
ALTER TABLE IF EXISTS ONLY public.notifications DROP CONSTRAINT IF EXISTS notifications_pkey;
ALTER TABLE IF EXISTS ONLY public.messages DROP CONSTRAINT IF EXISTS messages_pkey;
ALTER TABLE IF EXISTS ONLY public.marketplace_reviews DROP CONSTRAINT IF EXISTS marketplace_reviews_pkey;
ALTER TABLE IF EXISTS ONLY public.marketplace_orders DROP CONSTRAINT IF EXISTS marketplace_orders_pkey;
ALTER TABLE IF EXISTS ONLY public.marketplace_orders DROP CONSTRAINT IF EXISTS marketplace_orders_order_number_key;
ALTER TABLE IF EXISTS ONLY public.marketplace_order_vendor_fsm DROP CONSTRAINT IF EXISTS marketplace_order_vendor_fsm_pkey;
ALTER TABLE IF EXISTS ONLY public.marketplace_order_payment_fsm DROP CONSTRAINT IF EXISTS marketplace_order_payment_fsm_pkey;
ALTER TABLE IF EXISTS ONLY public.marketplace_order_items DROP CONSTRAINT IF EXISTS marketplace_order_items_pkey;
ALTER TABLE IF EXISTS ONLY public.marketplace_order_delivery_fsm DROP CONSTRAINT IF EXISTS marketplace_order_delivery_fsm_pkey;
ALTER TABLE IF EXISTS ONLY public.marketplace_metrics DROP CONSTRAINT IF EXISTS marketplace_metrics_pkey;
ALTER TABLE IF EXISTS ONLY public.marketplace_audit_logs DROP CONSTRAINT IF EXISTS marketplace_audit_logs_pkey;
ALTER TABLE IF EXISTS ONLY public.logs DROP CONSTRAINT IF EXISTS logs_pkey;
ALTER TABLE IF EXISTS ONLY public.locations DROP CONSTRAINT IF EXISTS locations_pkey;
ALTER TABLE IF EXISTS ONLY public.locations DROP CONSTRAINT IF EXISTS locations_country_city_area_street_key;
ALTER TABLE IF EXISTS ONLY public.location_updates DROP CONSTRAINT IF EXISTS location_updates_pkey;
ALTER TABLE IF EXISTS ONLY public.location_cache DROP CONSTRAINT IF EXISTS location_cache_pkey;
ALTER TABLE IF EXISTS ONLY public.items DROP CONSTRAINT IF EXISTS items_pkey;
ALTER TABLE IF EXISTS ONLY public.gold_prices DROP CONSTRAINT IF EXISTS gold_prices_recorded_at_key;
ALTER TABLE IF EXISTS ONLY public.gold_prices DROP CONSTRAINT IF EXISTS gold_prices_pkey;
ALTER TABLE IF EXISTS ONLY public.fsm_action_log DROP CONSTRAINT IF EXISTS fsm_action_log_pkey;
ALTER TABLE IF EXISTS ONLY public.fcm_tokens DROP CONSTRAINT IF EXISTS fcm_tokens_token_key;
ALTER TABLE IF EXISTS ONLY public.fcm_tokens DROP CONSTRAINT IF EXISTS fcm_tokens_pkey;
ALTER TABLE IF EXISTS ONLY public.emergency_transfers DROP CONSTRAINT IF EXISTS emergency_transfers_pkey;
ALTER TABLE IF EXISTS ONLY public.emergency_transfer_notifications DROP CONSTRAINT IF EXISTS emergency_transfer_notifications_pkey;
ALTER TABLE IF EXISTS ONLY public.email_verification_tokens DROP CONSTRAINT IF EXISTS email_verification_tokens_token_key;
ALTER TABLE IF EXISTS ONLY public.email_verification_tokens DROP CONSTRAINT IF EXISTS email_verification_tokens_pkey;
ALTER TABLE IF EXISTS ONLY public.driver_locations DROP CONSTRAINT IF EXISTS driver_locations_pkey;
ALTER TABLE IF EXISTS ONLY public.driver_locations DROP CONSTRAINT IF EXISTS driver_locations_driver_order_unique;
ALTER TABLE IF EXISTS ONLY public.driver_locations DROP CONSTRAINT IF EXISTS driver_locations_driver_id_order_id_key;
ALTER TABLE IF EXISTS ONLY public.crypto_transactions DROP CONSTRAINT IF EXISTS crypto_transactions_tx_hash_key;
ALTER TABLE IF EXISTS ONLY public.crypto_transactions DROP CONSTRAINT IF EXISTS crypto_transactions_pkey;
ALTER TABLE IF EXISTS ONLY public.coordinate_mappings DROP CONSTRAINT IF EXISTS coordinate_mappings_pkey;
ALTER TABLE IF EXISTS ONLY public.coordinate_mappings DROP CONSTRAINT IF EXISTS coordinate_mappings_location_key_key;
ALTER TABLE IF EXISTS ONLY public.commission_config DROP CONSTRAINT IF EXISTS commission_config_pkey;
ALTER TABLE IF EXISTS ONLY public.categories DROP CONSTRAINT IF EXISTS categories_pkey;
ALTER TABLE IF EXISTS ONLY public.cart_items DROP CONSTRAINT IF EXISTS cart_items_pkey;
ALTER TABLE IF EXISTS ONLY public.bids DROP CONSTRAINT IF EXISTS bids_pkey;
ALTER TABLE IF EXISTS ONLY public.bids DROP CONSTRAINT IF EXISTS bids_order_id_user_id_key;
ALTER TABLE IF EXISTS ONLY public.balance_transactions DROP CONSTRAINT IF EXISTS balance_transactions_transaction_id_key;
ALTER TABLE IF EXISTS ONLY public.balance_transactions DROP CONSTRAINT IF EXISTS balance_transactions_pkey;
ALTER TABLE IF EXISTS ONLY public.balance_holds DROP CONSTRAINT IF EXISTS balance_holds_pkey;
ALTER TABLE IF EXISTS ONLY public.balance_holds DROP CONSTRAINT IF EXISTS balance_holds_hold_id_key;
ALTER TABLE IF EXISTS ONLY public.backups DROP CONSTRAINT IF EXISTS backups_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_pkey;
ALTER TABLE IF EXISTS ONLY public.admin_logs DROP CONSTRAINT IF EXISTS admin_logs_pkey;
ALTER TABLE IF EXISTS public.withdrawal_requests ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.wallet_payments ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.vendor_payouts ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.vendor_categories ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.user_payment_methods ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.topups ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.topup_audit_logs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.takaful_loans ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.takaful_loan_payments ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.takaful_fund ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.takaful_contributions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.takaful_claims ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.system_health_logs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.stores ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.shopping_carts ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.schema_migrations ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.referral_payouts ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.referral_links ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.referral_earnings ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.referral_conversions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.platform_wallets ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.platform_revenue ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.offers ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.notifications ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.marketplace_reviews ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.marketplace_orders ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.marketplace_order_items ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.marketplace_metrics ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.marketplace_audit_logs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.logs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.locations ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.location_updates ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.items ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.gold_prices ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.fsm_action_log ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.fcm_tokens ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.emergency_transfers ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.emergency_transfer_notifications ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.driver_locations ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.coordinate_mappings ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.commission_config ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.categories ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.cart_items ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.bids ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.balance_transactions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.balance_holds ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.audit_logs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.admin_logs ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS public.withdrawal_requests_id_seq;
DROP TABLE IF EXISTS public.withdrawal_requests;
DROP SEQUENCE IF EXISTS public.wallet_payments_id_seq;
DROP TABLE IF EXISTS public.wallet_payments;
DROP TABLE IF EXISTS public.vendors;
DROP SEQUENCE IF EXISTS public.vendor_payouts_id_seq;
DROP TABLE IF EXISTS public.vendor_payouts;
DROP TABLE IF EXISTS public.vendor_items;
DROP SEQUENCE IF EXISTS public.vendor_categories_id_seq;
DROP TABLE IF EXISTS public.vendor_categories;
DROP TABLE IF EXISTS public.user_saved_addresses;
DROP SEQUENCE IF EXISTS public.user_payment_methods_id_seq;
DROP TABLE IF EXISTS public.user_payment_methods;
DROP TABLE IF EXISTS public.user_favorites;
DROP TABLE IF EXISTS public.user_balances;
DROP SEQUENCE IF EXISTS public.topups_id_seq;
DROP TABLE IF EXISTS public.topups;
DROP SEQUENCE IF EXISTS public.topup_audit_logs_id_seq;
DROP TABLE IF EXISTS public.topup_audit_logs;
DROP SEQUENCE IF EXISTS public.takaful_loans_id_seq;
DROP TABLE IF EXISTS public.takaful_loans;
DROP SEQUENCE IF EXISTS public.takaful_loan_payments_id_seq;
DROP TABLE IF EXISTS public.takaful_loan_payments;
DROP SEQUENCE IF EXISTS public.takaful_fund_id_seq;
DROP TABLE IF EXISTS public.takaful_fund;
DROP SEQUENCE IF EXISTS public.takaful_contributions_id_seq;
DROP TABLE IF EXISTS public.takaful_contributions;
DROP SEQUENCE IF EXISTS public.takaful_claims_id_seq;
DROP TABLE IF EXISTS public.takaful_claims;
DROP TABLE IF EXISTS public.system_settings;
DROP SEQUENCE IF EXISTS public.system_health_logs_id_seq;
DROP TABLE IF EXISTS public.system_health_logs;
DROP SEQUENCE IF EXISTS public.stores_id_seq;
DROP TABLE IF EXISTS public.stores;
DROP SEQUENCE IF EXISTS public.shopping_carts_id_seq;
DROP TABLE IF EXISTS public.shopping_carts;
DROP SEQUENCE IF EXISTS public.schema_migrations_id_seq;
DROP TABLE IF EXISTS public.schema_migrations;
DROP TABLE IF EXISTS public.reviews;
DROP TABLE IF EXISTS public.review_votes;
DROP TABLE IF EXISTS public.review_flags;
DROP SEQUENCE IF EXISTS public.referral_payouts_id_seq;
DROP TABLE IF EXISTS public.referral_payouts;
DROP SEQUENCE IF EXISTS public.referral_links_id_seq;
DROP TABLE IF EXISTS public.referral_links;
DROP SEQUENCE IF EXISTS public.referral_earnings_id_seq;
DROP TABLE IF EXISTS public.referral_earnings;
DROP SEQUENCE IF EXISTS public.referral_conversions_id_seq;
DROP TABLE IF EXISTS public.referral_conversions;
DROP SEQUENCE IF EXISTS public.platform_wallets_id_seq;
DROP TABLE IF EXISTS public.platform_wallets;
DROP TABLE IF EXISTS public.platform_reviews;
DROP TABLE IF EXISTS public.platform_review_votes;
DROP TABLE IF EXISTS public.platform_review_flags;
DROP SEQUENCE IF EXISTS public.platform_revenue_id_seq;
DROP TABLE IF EXISTS public.platform_revenue;
DROP TABLE IF EXISTS public.payments;
DROP TABLE IF EXISTS public.password_reset_tokens;
DROP TABLE IF EXISTS public.orders;
DROP SEQUENCE IF EXISTS public.offers_id_seq;
DROP TABLE IF EXISTS public.offers;
DROP SEQUENCE IF EXISTS public.notifications_id_seq;
DROP TABLE IF EXISTS public.notifications;
DROP TABLE IF EXISTS public.messages;
DROP SEQUENCE IF EXISTS public.marketplace_reviews_id_seq;
DROP TABLE IF EXISTS public.marketplace_reviews;
DROP SEQUENCE IF EXISTS public.marketplace_orders_id_seq;
DROP TABLE IF EXISTS public.marketplace_orders;
DROP TABLE IF EXISTS public.marketplace_order_vendor_fsm;
DROP TABLE IF EXISTS public.marketplace_order_payment_fsm;
DROP SEQUENCE IF EXISTS public.marketplace_order_items_id_seq;
DROP TABLE IF EXISTS public.marketplace_order_items;
DROP TABLE IF EXISTS public.marketplace_order_delivery_fsm;
DROP SEQUENCE IF EXISTS public.marketplace_metrics_id_seq;
DROP TABLE IF EXISTS public.marketplace_metrics;
DROP SEQUENCE IF EXISTS public.marketplace_audit_logs_id_seq;
DROP TABLE IF EXISTS public.marketplace_audit_logs;
DROP SEQUENCE IF EXISTS public.logs_id_seq;
DROP TABLE IF EXISTS public.logs;
DROP SEQUENCE IF EXISTS public.locations_id_seq;
DROP TABLE IF EXISTS public.locations;
DROP SEQUENCE IF EXISTS public.location_updates_id_seq;
DROP TABLE IF EXISTS public.location_updates;
DROP TABLE IF EXISTS public.location_cache;
DROP SEQUENCE IF EXISTS public.items_id_seq;
DROP TABLE IF EXISTS public.items;
DROP SEQUENCE IF EXISTS public.gold_prices_id_seq;
DROP TABLE IF EXISTS public.gold_prices;
DROP SEQUENCE IF EXISTS public.fsm_action_log_id_seq;
DROP TABLE IF EXISTS public.fsm_action_log;
DROP SEQUENCE IF EXISTS public.fcm_tokens_id_seq;
DROP TABLE IF EXISTS public.fcm_tokens;
DROP SEQUENCE IF EXISTS public.emergency_transfers_id_seq;
DROP TABLE IF EXISTS public.emergency_transfers;
DROP SEQUENCE IF EXISTS public.emergency_transfer_notifications_id_seq;
DROP TABLE IF EXISTS public.emergency_transfer_notifications;
DROP TABLE IF EXISTS public.email_verification_tokens;
DROP SEQUENCE IF EXISTS public.driver_locations_id_seq;
DROP TABLE IF EXISTS public.driver_locations;
DROP VIEW IF EXISTS public.driver_crypto_earnings;
DROP TABLE IF EXISTS public.users;
DROP TABLE IF EXISTS public.crypto_transactions;
DROP SEQUENCE IF EXISTS public.coordinate_mappings_id_seq;
DROP TABLE IF EXISTS public.coordinate_mappings;
DROP SEQUENCE IF EXISTS public.commission_config_id_seq;
DROP TABLE IF EXISTS public.commission_config;
DROP SEQUENCE IF EXISTS public.categories_id_seq;
DROP TABLE IF EXISTS public.categories;
DROP SEQUENCE IF EXISTS public.cart_items_id_seq;
DROP TABLE IF EXISTS public.cart_items;
DROP SEQUENCE IF EXISTS public.bids_id_seq;
DROP TABLE IF EXISTS public.bids;
DROP SEQUENCE IF EXISTS public.balance_transactions_id_seq;
DROP TABLE IF EXISTS public.balance_transactions;
DROP SEQUENCE IF EXISTS public.balance_holds_id_seq;
DROP TABLE IF EXISTS public.balance_holds;
DROP TABLE IF EXISTS public.backups;
DROP SEQUENCE IF EXISTS public.audit_logs_id_seq;
DROP TABLE IF EXISTS public.audit_logs;
DROP SEQUENCE IF EXISTS public.admin_logs_id_seq;
DROP TABLE IF EXISTS public.admin_logs;
DROP FUNCTION IF EXISTS public.update_wallet_payment_timestamp();
DROP FUNCTION IF EXISTS public.update_vendor_rating_on_review();
DROP FUNCTION IF EXISTS public.update_vendor_payout_updated_at();
DROP FUNCTION IF EXISTS public.update_topups_timestamp();
DROP FUNCTION IF EXISTS public.update_takaful_fund_on_contribution();
DROP FUNCTION IF EXISTS public.update_marketplace_review_updated_at();
DROP FUNCTION IF EXISTS public.update_marketplace_order_updated_at();
DROP FUNCTION IF EXISTS public.update_fsm_last_updated();
DROP FUNCTION IF EXISTS public.update_cart_updated_at();
DROP FUNCTION IF EXISTS public.update_balance_transaction_timestamp();
DROP FUNCTION IF EXISTS public.set_payout_number();
DROP FUNCTION IF EXISTS public.generate_payout_number();
DROP FUNCTION IF EXISTS public.ensure_vendor_review_count_column();
DROP FUNCTION IF EXISTS public.cleanup_old_marketplace_metrics();
DROP FUNCTION IF EXISTS public.cleanup_old_health_logs();
DROP EXTENSION IF EXISTS postgis;
--
-- Name: postgis; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;


--
-- Name: cleanup_old_health_logs(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_old_health_logs() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    DELETE FROM system_health_logs WHERE timestamp < NOW() - INTERVAL '3 days';
END;
$$;


--
-- Name: cleanup_old_marketplace_metrics(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_old_marketplace_metrics() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    DELETE FROM marketplace_metrics WHERE timestamp < NOW() - INTERVAL '30 days';
END;
$$;


--
-- Name: ensure_vendor_review_count_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ensure_vendor_review_count_column() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'vendors'
          AND column_name = 'review_count'
    ) THEN
        ALTER TABLE vendors ADD COLUMN review_count INTEGER DEFAULT 0;
    END IF;
END;
$$;


--
-- Name: generate_payout_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_payout_number() RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
  payout_num TEXT;
  counter INTEGER := 0;
BEGIN
  LOOP
    payout_num := 'PAYOUT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(counter::TEXT, 4, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM vendor_payouts WHERE payout_number = payout_num);
    counter := counter + 1;
    IF counter > 9999 THEN
      RAISE EXCEPTION 'Too many payouts today';
    END IF;
  END LOOP;
  RETURN payout_num;
END;
$$;


--
-- Name: set_payout_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_payout_number() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.payout_number IS NULL THEN
    NEW.payout_number := generate_payout_number();
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: update_balance_transaction_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_balance_transaction_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_cart_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_cart_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE shopping_carts
  SET updated_at = CURRENT_TIMESTAMP
  WHERE id = (
    CASE
      WHEN TG_OP = 'DELETE' THEN OLD.cart_id
      ELSE NEW.cart_id
    END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: update_fsm_last_updated(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_fsm_last_updated() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_marketplace_order_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_marketplace_order_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE marketplace_orders
  SET updated_at = CURRENT_TIMESTAMP
  WHERE id = (
    CASE
      WHEN TG_OP = 'DELETE' THEN OLD.order_id
      ELSE NEW.order_id
    END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: update_marketplace_review_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_marketplace_review_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_takaful_fund_on_contribution(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_takaful_fund_on_contribution() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE takaful_fund SET 
    balance = balance + NEW.amount,
    total_contributions = total_contributions + NEW.amount,
    updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_topups_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_topups_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_vendor_payout_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_vendor_payout_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


--
-- Name: update_vendor_rating_on_review(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_vendor_rating_on_review() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    avg_rating DECIMAL(3,2);
    review_count INTEGER;
BEGIN
    SELECT AVG(rating), COUNT(*)
    INTO avg_rating, review_count
    FROM marketplace_reviews
    WHERE vendor_id = NEW.vendor_id
      AND is_approved = true;

    UPDATE vendors
    SET rating = COALESCE(avg_rating, 0),
        review_count = COALESCE(review_count, 0),
        updated_at = NOW()
    WHERE id = NEW.vendor_id;

    RETURN NEW;
END;
$$;


--
-- Name: update_wallet_payment_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_wallet_payment_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_logs (
    id integer NOT NULL,
    admin_id character varying(255) NOT NULL,
    action character varying(100) NOT NULL,
    target_type character varying(50),
    target_id character varying(255),
    details jsonb,
    ip_address character varying(45),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: admin_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.admin_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: admin_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.admin_logs_id_seq OWNED BY public.admin_logs.id;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    user_id character varying(255),
    action character varying(100) NOT NULL,
    resource character varying(255) NOT NULL,
    details jsonb,
    ip_address character varying(45),
    user_agent text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: backups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.backups (
    id character varying(255) NOT NULL,
    created_by character varying(255) NOT NULL,
    table_counts jsonb,
    file_path text,
    file_size bigint,
    status character varying(50) DEFAULT 'pending'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: balance_holds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.balance_holds (
    id integer NOT NULL,
    hold_id character varying(255) NOT NULL,
    user_id character varying(255),
    amount numeric(20,2) NOT NULL,
    currency character varying(10) DEFAULT 'EGP'::character varying,
    reason text,
    order_id character varying(255),
    expires_at timestamp without time zone,
    description text,
    metadata jsonb,
    transaction_id integer,
    status character varying(50) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone
);


--
-- Name: balance_holds_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.balance_holds_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: balance_holds_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.balance_holds_id_seq OWNED BY public.balance_holds.id;


--
-- Name: balance_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.balance_transactions (
    id integer NOT NULL,
    transaction_id character varying(255) NOT NULL,
    user_id character varying(255),
    type character varying(50) NOT NULL,
    amount numeric(20,2) NOT NULL,
    currency character varying(10) DEFAULT 'EGP'::character varying,
    balance_before numeric(20,2) NOT NULL,
    balance_after numeric(20,2) NOT NULL,
    status character varying(50) NOT NULL,
    description text,
    metadata jsonb,
    order_id character varying(255),
    wallet_payment_id integer,
    withdrawal_request_id integer,
    related_transaction_id integer,
    processed_by character varying(255),
    processing_method character varying(255),
    processed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone
);


--
-- Name: balance_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.balance_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: balance_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.balance_transactions_id_seq OWNED BY public.balance_transactions.id;


--
-- Name: bids; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bids (
    id integer NOT NULL,
    order_id character varying(255) NOT NULL,
    user_id character varying(255) NOT NULL,
    driver_name character varying(255) NOT NULL,
    bid_price numeric(10,2) NOT NULL,
    estimated_pickup_time timestamp without time zone,
    estimated_delivery_time timestamp without time zone,
    message text,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    driver_location_lat numeric(10,8),
    driver_location_lng numeric(11,8),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT bids_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'accepted'::character varying, 'rejected'::character varying])::text[])))
);


--
-- Name: bids_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bids_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bids_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bids_id_seq OWNED BY public.bids.id;


--
-- Name: cart_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cart_items (
    id integer NOT NULL,
    cart_id integer NOT NULL,
    item_id integer NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT cart_items_quantity_check CHECK ((quantity > 0))
);


--
-- Name: cart_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cart_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cart_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cart_items_id_seq OWNED BY public.cart_items.id;


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id integer NOT NULL,
    parent_id integer,
    name character varying(255) NOT NULL,
    description text,
    status boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_parent_id CHECK (((parent_id IS NULL) OR (parent_id <> id)))
);


--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- Name: commission_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.commission_config (
    id integer NOT NULL,
    platform_rate numeric(5,4) DEFAULT 0.10,
    takaful_rate numeric(5,4) DEFAULT 0.05,
    effective_from date DEFAULT CURRENT_DATE,
    created_by text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: commission_config_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.commission_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: commission_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.commission_config_id_seq OWNED BY public.commission_config.id;


--
-- Name: coordinate_mappings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coordinate_mappings (
    id integer NOT NULL,
    location_key character varying(100) NOT NULL,
    country character varying(100) NOT NULL,
    city character varying(100) NOT NULL,
    lat_min numeric(10,8) NOT NULL,
    lat_max numeric(10,8) NOT NULL,
    lng_min numeric(11,8) NOT NULL,
    lng_max numeric(11,8) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: coordinate_mappings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.coordinate_mappings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: coordinate_mappings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.coordinate_mappings_id_seq OWNED BY public.coordinate_mappings.id;


--
-- Name: crypto_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crypto_transactions (
    id character varying(255) NOT NULL,
    order_id character varying(255),
    user_id character varying(255),
    transaction_type character varying(50) NOT NULL,
    token_address character varying(255) NOT NULL,
    token_symbol character varying(10) NOT NULL,
    amount numeric(20,8) NOT NULL,
    tx_hash character varying(255),
    block_number bigint,
    status character varying(50) DEFAULT 'pending'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    confirmed_at timestamp without time zone,
    metadata jsonb
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    phone character varying(50) NOT NULL,
    primary_role character varying(50) NOT NULL,
    granted_roles text[],
    vehicle_type character varying(100),
    rating numeric(3,2) DEFAULT 5.00,
    completed_deliveries integer DEFAULT 0,
    is_available boolean DEFAULT true,
    is_verified boolean DEFAULT false,
    verified_at timestamp without time zone,
    country character varying(100),
    city character varying(100),
    area character varying(100),
    profile_picture_url text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_active timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    license_number character varying(100),
    service_area_zone character varying(255),
    preferences jsonb,
    notification_prefs jsonb,
    two_factor_methods jsonb,
    language character varying(20),
    theme character varying(20),
    document_verification_status character varying(50),
    gender character varying(10) DEFAULT 'male'::character varying,
    available_cash numeric(10,2) DEFAULT 0,
    cash_currency text DEFAULT 'EGP'::text,
    wallet_address character varying(255),
    wallet_verified boolean DEFAULT false,
    wallet_connected_at timestamp without time zone,
    CONSTRAINT users_primary_role_check CHECK (((primary_role)::text = ANY ((ARRAY['customer'::character varying, 'driver'::character varying, 'admin'::character varying, 'vendor'::character varying])::text[])))
);


--
-- Name: driver_crypto_earnings; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.driver_crypto_earnings AS
 SELECT u.id AS driver_id,
    u.name AS driver_name,
    u.wallet_address,
    ct.token_symbol,
    count(DISTINCT ct.order_id) AS total_orders,
    sum(ct.amount) AS total_earnings,
    max(ct.confirmed_at) AS last_payout
   FROM (public.users u
     JOIN public.crypto_transactions ct ON (((u.id)::text = (ct.user_id)::text)))
  WHERE (((ct.transaction_type)::text = 'payout'::text) AND ((ct.status)::text = 'confirmed'::text))
  GROUP BY u.id, u.name, u.wallet_address, ct.token_symbol;


--
-- Name: driver_locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.driver_locations (
    id integer NOT NULL,
    driver_id character varying(255) NOT NULL,
    order_id character varying(255),
    latitude numeric(10,8) NOT NULL,
    longitude numeric(11,8) NOT NULL,
    heading numeric(5,2),
    speed_kmh numeric(5,2),
    accuracy_meters numeric(8,2),
    context character varying(50) DEFAULT 'idle'::character varying,
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: driver_locations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.driver_locations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: driver_locations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.driver_locations_id_seq OWNED BY public.driver_locations.id;


--
-- Name: email_verification_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_verification_tokens (
    id character varying(255) NOT NULL,
    user_id character varying(255) NOT NULL,
    token character varying(255) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    used boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: emergency_transfer_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.emergency_transfer_notifications (
    id integer NOT NULL,
    transfer_id integer,
    driver_id text NOT NULL,
    notified_at timestamp with time zone DEFAULT now(),
    distance_to_transfer_km numeric(10,3),
    has_sufficient_cash boolean DEFAULT true,
    response text
);


--
-- Name: emergency_transfer_notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.emergency_transfer_notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: emergency_transfer_notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.emergency_transfer_notifications_id_seq OWNED BY public.emergency_transfer_notifications.id;


--
-- Name: emergency_transfers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.emergency_transfers (
    id integer NOT NULL,
    order_id text NOT NULL,
    original_driver_id text NOT NULL,
    original_driver_location jsonb,
    distance_traveled_km numeric(10,3),
    emergency_reason text,
    new_driver_id text,
    new_driver_location jsonb,
    original_delivery_fee numeric(10,2),
    emergency_bonus_rate numeric(5,4) DEFAULT 0.20,
    emergency_bonus numeric(10,2),
    original_driver_compensation numeric(10,2),
    upfront_amount numeric(10,2) DEFAULT 0,
    upfront_transferred boolean DEFAULT false,
    status text DEFAULT 'pending'::text,
    timeout_at timestamp with time zone,
    original_driver_confirmed boolean DEFAULT false,
    new_driver_confirmed boolean DEFAULT false,
    handoff_location jsonb,
    handoff_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    accepted_at timestamp with time zone,
    completed_at timestamp with time zone,
    escalated_at timestamp with time zone
);


--
-- Name: emergency_transfers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.emergency_transfers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: emergency_transfers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.emergency_transfers_id_seq OWNED BY public.emergency_transfers.id;


--
-- Name: fcm_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fcm_tokens (
    id integer NOT NULL,
    user_id character varying(255) NOT NULL,
    role character varying(50) NOT NULL,
    token text NOT NULL,
    device_info character varying(255),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fcm_tokens_role_check CHECK (((role)::text = ANY ((ARRAY['customer'::character varying, 'driver'::character varying, 'admin'::character varying])::text[])))
);


--
-- Name: fcm_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fcm_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fcm_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fcm_tokens_id_seq OWNED BY public.fcm_tokens.id;


--
-- Name: fsm_action_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fsm_action_log (
    id integer NOT NULL,
    order_id integer,
    fsm_type text NOT NULL,
    from_state text,
    to_state text NOT NULL,
    event text NOT NULL,
    actor text NOT NULL,
    actor_role text,
    metadata jsonb DEFAULT '{}'::jsonb,
    "timestamp" timestamp without time zone DEFAULT now(),
    ip_address inet,
    user_agent text,
    CONSTRAINT fsm_action_log_actor_role_check CHECK ((actor_role = ANY (ARRAY['customer'::text, 'vendor'::text, 'driver'::text, 'admin'::text, 'system'::text]))),
    CONSTRAINT fsm_action_log_fsm_type_check CHECK ((fsm_type = ANY (ARRAY['vendor'::text, 'payment'::text, 'delivery'::text])))
);


--
-- Name: fsm_action_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fsm_action_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fsm_action_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fsm_action_log_id_seq OWNED BY public.fsm_action_log.id;


--
-- Name: gold_prices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gold_prices (
    id integer NOT NULL,
    price_per_gram numeric(10,2) NOT NULL,
    recorded_at date DEFAULT CURRENT_DATE,
    source text
);


--
-- Name: gold_prices_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.gold_prices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: gold_prices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.gold_prices_id_seq OWNED BY public.gold_prices.id;


--
-- Name: items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.items (
    id integer NOT NULL,
    store_id integer NOT NULL,
    category_id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    price numeric(10,2) NOT NULL,
    status boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    inventory_quantity integer DEFAULT 0 NOT NULL,
    image_url text
);


--
-- Name: items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.items_id_seq OWNED BY public.items.id;


--
-- Name: location_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.location_cache (
    cache_key character varying(255) NOT NULL,
    payload jsonb NOT NULL,
    expires_at timestamp without time zone NOT NULL
);


--
-- Name: location_updates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.location_updates (
    id integer NOT NULL,
    order_id character varying(255) NOT NULL,
    driver_id character varying(255) NOT NULL,
    latitude numeric(10,8) NOT NULL,
    longitude numeric(11,8) NOT NULL,
    status character varying(50) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: location_updates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.location_updates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: location_updates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.location_updates_id_seq OWNED BY public.location_updates.id;


--
-- Name: locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.locations (
    id integer NOT NULL,
    country character varying(100) NOT NULL,
    city character varying(100) NOT NULL,
    area character varying(100) NOT NULL,
    street character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: locations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.locations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: locations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.locations_id_seq OWNED BY public.locations.id;


--
-- Name: logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.logs (
    id integer NOT NULL,
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    level character varying(20) NOT NULL,
    source character varying(20) NOT NULL,
    category character varying(50),
    message text NOT NULL,
    user_id character varying(255),
    session_id character varying(100),
    url text,
    method character varying(10),
    status_code integer,
    duration_ms integer,
    ip_address character varying(45),
    user_agent text,
    stack_trace text,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT logs_level_check CHECK (((level)::text = ANY ((ARRAY['error'::character varying, 'warn'::character varying, 'info'::character varying, 'debug'::character varying, 'http'::character varying])::text[]))),
    CONSTRAINT logs_source_check CHECK (((source)::text = ANY ((ARRAY['frontend'::character varying, 'backend'::character varying])::text[])))
);


--
-- Name: logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.logs_id_seq OWNED BY public.logs.id;


--
-- Name: marketplace_audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketplace_audit_logs (
    id integer NOT NULL,
    user_id character varying(255),
    vendor_id character varying(255),
    order_id integer,
    action character varying(100) NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id integer NOT NULL,
    old_values jsonb,
    new_values jsonb,
    changes jsonb,
    ip_address inet,
    user_agent text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: marketplace_audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.marketplace_audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: marketplace_audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.marketplace_audit_logs_id_seq OWNED BY public.marketplace_audit_logs.id;


--
-- Name: marketplace_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketplace_metrics (
    id integer NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now(),
    metric_type character varying(50) NOT NULL,
    total_orders integer DEFAULT 0,
    orders_pending_bids integer DEFAULT 0,
    orders_vendor_confirmed integer DEFAULT 0,
    orders_assigned integer DEFAULT 0,
    orders_delivered integer DEFAULT 0,
    orders_cancelled integer DEFAULT 0,
    active_vendors integer DEFAULT 0,
    avg_vendor_rating numeric(3,2),
    order_volume_egp numeric(14,2) DEFAULT 0,
    commission_collected_egp numeric(14,2) DEFAULT 0,
    payouts_pending_egp numeric(14,2) DEFAULT 0,
    avg_preparation_time_minutes integer,
    avg_delivery_time_minutes integer,
    order_creation_failures integer DEFAULT 0,
    inventory_conflicts integer DEFAULT 0
);


--
-- Name: marketplace_metrics_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.marketplace_metrics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: marketplace_metrics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.marketplace_metrics_id_seq OWNED BY public.marketplace_metrics.id;


--
-- Name: marketplace_order_delivery_fsm; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketplace_order_delivery_fsm (
    order_id integer NOT NULL,
    current_state text,
    last_updated timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT marketplace_order_delivery_fsm_current_state_check CHECK (((current_state IS NULL) OR (current_state = ANY (ARRAY['delivery_request_created_waiting_for_courier_acceptance'::text, 'courier_has_been_assigned_to_deliver_the_order'::text, 'courier_has_arrived_at_vendor_pickup_location'::text, 'courier_confirms_receipt_of_order_from_vendor'::text, 'courier_is_actively_transporting_order_to_customer'::text, 'courier_has_arrived_at_customer_drop_off_location'::text, 'courier_marks_order_as_delivered_to_customer'::text, 'awaiting_customer_confirmation_of_order_delivery'::text, 'order_delivery_successfully_completed_and_confirmed_by_customer'::text, 'delivery_disputed_by_customer_and_requires_resolution'::text]))))
);


--
-- Name: marketplace_order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketplace_order_items (
    id integer NOT NULL,
    order_id integer NOT NULL,
    item_id integer NOT NULL,
    item_name character varying(255) NOT NULL,
    item_description text,
    unit_price numeric(10,2) NOT NULL,
    quantity integer NOT NULL,
    total_price numeric(10,2) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: marketplace_order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.marketplace_order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: marketplace_order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.marketplace_order_items_id_seq OWNED BY public.marketplace_order_items.id;


--
-- Name: marketplace_order_payment_fsm; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketplace_order_payment_fsm (
    order_id integer NOT NULL,
    current_state text,
    last_updated timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT marketplace_order_payment_fsm_current_state_check CHECK (((current_state IS NULL) OR (current_state = ANY (ARRAY['payment_pending_for_customer'::text, 'payment_attempt_failed_for_order'::text, 'payment_successfully_received_and_verified_for_order'::text, 'payment_has_been_refunded_to_customer'::text]))))
);


--
-- Name: marketplace_order_vendor_fsm; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketplace_order_vendor_fsm (
    order_id integer NOT NULL,
    current_state text DEFAULT 'awaiting_order_availability_vendor_confirmation'::text NOT NULL,
    last_updated timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT marketplace_order_vendor_fsm_current_state_check CHECK ((current_state = ANY (ARRAY['awaiting_order_availability_vendor_confirmation'::text, 'order_rejected_by_vendor'::text, 'awaiting_vendor_start_preparation'::text, 'vendor_is_actively_preparing_order'::text, 'order_is_fully_prepared_and_ready_for_delivery'::text])))
);


--
-- Name: marketplace_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketplace_orders (
    id integer NOT NULL,
    order_type character varying(50) DEFAULT 'marketplace'::character varying NOT NULL,
    user_id character varying(255) NOT NULL,
    cart_id integer NOT NULL,
    store_id integer NOT NULL,
    vendor_id character varying(255) NOT NULL,
    order_number character varying(50) NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    delivery_fee numeric(10,2) DEFAULT 0,
    currency character varying(10) DEFAULT 'EGP'::character varying,
    delivery_address text,
    delivery_lat numeric(10,8),
    delivery_lng numeric(11,8),
    delivery_instructions text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    confirmed_at timestamp without time zone,
    prepared_at timestamp without time zone,
    picked_up_at timestamp without time zone,
    delivered_at timestamp without time zone,
    cancelled_at timestamp without time zone,
    commission_rate numeric(5,2) DEFAULT 10.00,
    commission_amount numeric(10,2),
    customer_notes text,
    vendor_notes text,
    cancellation_reason text
);


--
-- Name: marketplace_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.marketplace_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: marketplace_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.marketplace_orders_id_seq OWNED BY public.marketplace_orders.id;


--
-- Name: marketplace_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketplace_reviews (
    id integer NOT NULL,
    order_id integer NOT NULL,
    vendor_id character varying(255) NOT NULL,
    store_id integer,
    reviewer_user_id character varying(255) NOT NULL,
    rating integer NOT NULL,
    title character varying(255),
    content text,
    food_quality integer,
    service_rating integer,
    delivery_speed integer,
    images jsonb,
    is_approved boolean DEFAULT true,
    flag_count integer DEFAULT 0,
    is_featured boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT marketplace_reviews_delivery_speed_check CHECK (((delivery_speed >= 1) AND (delivery_speed <= 5))),
    CONSTRAINT marketplace_reviews_food_quality_check CHECK (((food_quality >= 1) AND (food_quality <= 5))),
    CONSTRAINT marketplace_reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5))),
    CONSTRAINT marketplace_reviews_service_rating_check CHECK (((service_rating >= 1) AND (service_rating <= 5)))
);


--
-- Name: marketplace_reviews_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.marketplace_reviews_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: marketplace_reviews_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.marketplace_reviews_id_seq OWNED BY public.marketplace_reviews.id;


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id character varying(255) NOT NULL,
    order_id character varying(255) NOT NULL,
    sender_id character varying(255) NOT NULL,
    recipient_id character varying(255) NOT NULL,
    content text NOT NULL,
    message_type character varying(50) DEFAULT 'text'::character varying,
    media_url text,
    media_type character varying(50),
    media_size integer,
    media_duration integer,
    thumbnail_url text,
    is_read boolean DEFAULT false,
    read_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id character varying(255) NOT NULL,
    order_id character varying(255),
    type character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: offers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.offers (
    id integer NOT NULL,
    item_id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    discount_type character varying(20) NOT NULL,
    discount_value numeric(10,2) NOT NULL,
    start_date timestamp without time zone NOT NULL,
    end_date timestamp without time zone NOT NULL,
    status boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_date_range CHECK ((end_date > start_date)),
    CONSTRAINT offers_discount_type_check CHECK (((discount_type)::text = ANY ((ARRAY['percentage'::character varying, 'fixed'::character varying])::text[])))
);


--
-- Name: offers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.offers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: offers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.offers_id_seq OWNED BY public.offers.id;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id character varying(255) NOT NULL,
    order_number character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    pickup_address text NOT NULL,
    delivery_address text NOT NULL,
    from_lat numeric(10,8) NOT NULL,
    from_lng numeric(11,8) NOT NULL,
    pickup_contact_name character varying(255) NOT NULL,
    to_lat numeric(10,8) NOT NULL,
    to_lng numeric(11,8) NOT NULL,
    dropoff_contact_name character varying(255) NOT NULL,
    package_description text,
    package_weight numeric(10,2),
    estimated_value numeric(10,2),
    special_instructions text,
    price numeric(10,2) NOT NULL,
    status character varying(50) DEFAULT 'pending_bids'::character varying NOT NULL,
    customer_id character varying(255) NOT NULL,
    customer_name character varying(255) NOT NULL,
    assigned_driver_user_id character varying(255),
    assigned_driver_name character varying(255),
    assigned_driver_bid_price numeric(10,2),
    estimated_delivery_date timestamp without time zone,
    pickup_time timestamp without time zone,
    delivery_time timestamp without time zone,
    current_location_lat numeric(10,8),
    current_location_lng numeric(11,8),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    accepted_at timestamp without time zone,
    picked_up_at timestamp without time zone,
    delivered_at timestamp without time zone,
    completed_at timestamp without time zone,
    cancelled_at timestamp without time zone,
    pickup_coordinates jsonb,
    delivery_coordinates jsonb,
    require_upfront_payment boolean DEFAULT false,
    upfront_payment numeric(10,2),
    pickup_location_link text,
    delivery_location_link text,
    estimated_distance_km numeric(10,2),
    estimated_duration_minutes integer,
    route_polyline text,
    is_remote_area boolean DEFAULT false,
    is_international boolean DEFAULT false,
    payment_method character varying(20) DEFAULT 'COD'::character varying,
    platform_fee_amount numeric(10,2) DEFAULT 0,
    is_emergency_transfer boolean DEFAULT false,
    emergency_transfer_id integer,
    escrow_amount numeric(10,2),
    escrow_status text DEFAULT 'none'::text,
    driver_distance_traveled_km numeric(10,3),
    cancellation_reason text,
    cancellation_fee numeric(10,2) DEFAULT 0,
    cancelled_by text,
    upfront_paid_by_driver boolean DEFAULT false,
    in_transit_at timestamp without time zone,
    pickup_contact_phone character varying(50),
    dropoff_contact_phone character varying(50),
    from_coordinates character varying(255),
    to_coordinates character varying(255),
    crypto_token character varying(100),
    crypto_amount numeric(20,8),
    blockchain_tx_hash character varying(255),
    platform_commission numeric(10,2),
    driver_payout numeric(10,2),
    payment_status character varying(50) DEFAULT 'pending'::character varying,
    CONSTRAINT orders_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'pending_bids'::character varying, 'accepted'::character varying, 'paid'::character varying, 'assigned'::character varying, 'picked_up'::character varying, 'in_transit'::character varying, 'courier_delivered'::character varying, 'customer_delivered'::character varying, 'delivered'::character varying, 'delivered_pending'::character varying, 'completed'::character varying, 'cancelled'::character varying, 'disputed'::character varying, 'refunded'::character varying, 'rejected'::character varying, 'failed'::character varying])::text[])))
);


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_tokens (
    id character varying(255) NOT NULL,
    user_id character varying(255) NOT NULL,
    token character varying(255) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    used boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id character varying(255) NOT NULL,
    order_id character varying(255) NOT NULL,
    amount numeric(10,2) NOT NULL,
    currency character varying(3) DEFAULT 'USD'::character varying,
    payment_method character varying(50),
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    stripe_payment_intent_id character varying(255),
    stripe_charge_id character varying(255),
    paypal_order_id character varying(255),
    paypal_capture_id character varying(255),
    payer_id character varying(255) NOT NULL,
    payee_id character varying(255),
    platform_fee numeric(10,2) DEFAULT 0.00,
    driver_earnings numeric(10,2) DEFAULT 0.00,
    refund_amount numeric(10,2) DEFAULT 0.00,
    refund_reason text,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    processed_at timestamp without time zone,
    refunded_at timestamp without time zone,
    paymob_transaction_id bigint,
    paymob_order_id bigint,
    CONSTRAINT payments_payment_method_check CHECK (((payment_method)::text = ANY ((ARRAY['credit_card'::character varying, 'debit_card'::character varying, 'paypal'::character varying, 'bank_transfer'::character varying, 'cash'::character varying])::text[]))),
    CONSTRAINT payments_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying, 'refunded'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: platform_revenue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_revenue (
    id integer NOT NULL,
    order_id character varying(255),
    commission_amount numeric(10,2) NOT NULL,
    commission_rate numeric(5,4) DEFAULT 0.15 NOT NULL,
    payment_method character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: platform_revenue_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.platform_revenue_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: platform_revenue_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.platform_revenue_id_seq OWNED BY public.platform_revenue.id;


--
-- Name: platform_review_flags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_review_flags (
    review_id uuid NOT NULL,
    user_id character varying(255) NOT NULL,
    reason character varying(255),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: platform_review_votes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_review_votes (
    review_id uuid NOT NULL,
    user_id character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: platform_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying(255) NOT NULL,
    rating integer NOT NULL,
    content text,
    professionalism_rating integer,
    communication_rating integer,
    timeliness_rating integer,
    package_condition_rating integer,
    upvotes integer DEFAULT 0,
    flag_count integer DEFAULT 0,
    is_approved boolean DEFAULT true,
    is_featured boolean DEFAULT false,
    github_issue_link character varying(255),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT platform_reviews_communication_rating_check CHECK (((communication_rating >= 1) AND (communication_rating <= 5))),
    CONSTRAINT platform_reviews_package_condition_rating_check CHECK (((package_condition_rating >= 1) AND (package_condition_rating <= 5))),
    CONSTRAINT platform_reviews_professionalism_rating_check CHECK (((professionalism_rating >= 1) AND (professionalism_rating <= 5))),
    CONSTRAINT platform_reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5))),
    CONSTRAINT platform_reviews_timeliness_rating_check CHECK (((timeliness_rating >= 1) AND (timeliness_rating <= 5)))
);


--
-- Name: platform_wallets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_wallets (
    id integer NOT NULL,
    wallet_type character varying(50) NOT NULL,
    phone_number character varying(20) NOT NULL,
    wallet_name character varying(255) NOT NULL,
    is_active boolean DEFAULT true,
    daily_limit numeric(10,2) DEFAULT 50000,
    monthly_limit numeric(10,2) DEFAULT 500000,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    instapay_alias character varying(100),
    holder_name character varying(100),
    daily_used numeric(20,2) DEFAULT 0,
    monthly_used numeric(20,2) DEFAULT 0,
    last_reset_daily timestamp with time zone DEFAULT now(),
    last_reset_monthly timestamp with time zone DEFAULT now()
);


--
-- Name: platform_wallets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.platform_wallets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: platform_wallets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.platform_wallets_id_seq OWNED BY public.platform_wallets.id;


--
-- Name: referral_conversions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referral_conversions (
    id integer NOT NULL,
    referrer_id character varying(255) NOT NULL,
    referee_id character varying(255) NOT NULL,
    referral_code character varying(50) NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying,
    activation_date timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: referral_conversions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.referral_conversions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: referral_conversions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.referral_conversions_id_seq OWNED BY public.referral_conversions.id;


--
-- Name: referral_earnings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referral_earnings (
    id integer NOT NULL,
    referrer_id character varying(255) NOT NULL,
    referee_id character varying(255) NOT NULL,
    transaction_id character varying(255),
    transaction_amount numeric(10,2),
    commission_amount numeric(10,2),
    commission_rate numeric(5,2) DEFAULT 10.00,
    status character varying(50) DEFAULT 'pending'::character varying,
    paid_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: referral_earnings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.referral_earnings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: referral_earnings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.referral_earnings_id_seq OWNED BY public.referral_earnings.id;


--
-- Name: referral_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referral_links (
    id integer NOT NULL,
    referrer_id character varying(255) NOT NULL,
    code character varying(50) NOT NULL,
    commission_rate numeric(5,2) DEFAULT 10.00,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: referral_links_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.referral_links_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: referral_links_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.referral_links_id_seq OWNED BY public.referral_links.id;


--
-- Name: referral_payouts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referral_payouts (
    id integer NOT NULL,
    referrer_id character varying(255) NOT NULL,
    total_earned numeric(10,2),
    total_paid numeric(10,2) DEFAULT 0,
    pending_amount numeric(10,2),
    payout_method character varying(50),
    payout_frequency character varying(50) DEFAULT 'weekly'::character varying,
    last_payout_date timestamp without time zone,
    next_payout_date timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: referral_payouts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.referral_payouts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: referral_payouts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.referral_payouts_id_seq OWNED BY public.referral_payouts.id;


--
-- Name: review_flags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.review_flags (
    review_id character varying(255) NOT NULL,
    user_id character varying(255) NOT NULL,
    reason character varying(255),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: review_votes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.review_votes (
    review_id character varying(255) NOT NULL,
    user_id character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviews (
    id character varying(255) NOT NULL,
    user_id character varying(255) NOT NULL,
    order_id character varying(255),
    reviewer_id character varying(255),
    reviewee_id character varying(255),
    rating integer NOT NULL,
    content text,
    professionalism_rating integer,
    communication_rating integer,
    timeliness_rating integer,
    package_condition_rating integer,
    upvotes integer DEFAULT 0,
    flag_count integer DEFAULT 0,
    is_approved boolean DEFAULT true,
    is_featured boolean DEFAULT false,
    github_issue_link character varying(255),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    reviewer_role character varying(50),
    review_type character varying(50),
    comment text,
    condition_rating integer,
    CONSTRAINT reviews_communication_rating_check CHECK (((communication_rating >= 1) AND (communication_rating <= 5))),
    CONSTRAINT reviews_condition_rating_check CHECK (((condition_rating >= 1) AND (condition_rating <= 5))),
    CONSTRAINT reviews_package_condition_rating_check CHECK (((package_condition_rating >= 1) AND (package_condition_rating <= 5))),
    CONSTRAINT reviews_professionalism_rating_check CHECK (((professionalism_rating >= 1) AND (professionalism_rating <= 5))),
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5))),
    CONSTRAINT reviews_timeliness_rating_check CHECK (((timeliness_rating >= 1) AND (timeliness_rating <= 5)))
);


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    id integer NOT NULL,
    migration_name character varying(255) NOT NULL,
    applied_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    checksum character varying(64),
    execution_time_ms integer
);


--
-- Name: schema_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.schema_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: schema_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.schema_migrations_id_seq OWNED BY public.schema_migrations.id;


--
-- Name: shopping_carts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shopping_carts (
    id integer NOT NULL,
    user_id character varying(255) NOT NULL,
    store_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp without time zone DEFAULT (CURRENT_TIMESTAMP + '7 days'::interval)
);


--
-- Name: shopping_carts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.shopping_carts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: shopping_carts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.shopping_carts_id_seq OWNED BY public.shopping_carts.id;


--
-- Name: stores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stores (
    id integer NOT NULL,
    vendor_id character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    address text,
    phone character varying(50),
    email character varying(255),
    status boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    latitude numeric(10,8),
    longitude numeric(11,8),
    location public.geography(Point,4326)
);


--
-- Name: stores_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stores_id_seq OWNED BY public.stores.id;


--
-- Name: system_health_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_health_logs (
    id integer NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now(),
    memory_percent numeric(5,2),
    memory_used_mb integer,
    memory_available_mb integer,
    pm2_total_memory_mb integer,
    pm2_processes jsonb,
    active_ws_connections integer DEFAULT 0,
    cpu_load numeric(5,2)
);


--
-- Name: system_health_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.system_health_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: system_health_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.system_health_logs_id_seq OWNED BY public.system_health_logs.id;


--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_settings (
    key character varying(100) NOT NULL,
    value text NOT NULL,
    type character varying(50) DEFAULT 'string'::character varying,
    description text,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by character varying(255)
);


--
-- Name: takaful_claims; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.takaful_claims (
    id integer NOT NULL,
    courier_id text NOT NULL,
    claim_type text NOT NULL,
    amount numeric(10,2) NOT NULL,
    description text,
    evidence_urls text[],
    event_date date,
    beneficiary_name text,
    status text DEFAULT 'pending'::text,
    reviewed_by text,
    reviewed_at timestamp with time zone,
    rejection_reason text,
    created_at timestamp with time zone DEFAULT now(),
    paid_at timestamp with time zone
);


--
-- Name: takaful_claims_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.takaful_claims_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: takaful_claims_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.takaful_claims_id_seq OWNED BY public.takaful_claims.id;


--
-- Name: takaful_contributions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.takaful_contributions (
    id integer NOT NULL,
    courier_id text NOT NULL,
    order_id text NOT NULL,
    amount numeric(10,2) NOT NULL,
    delivery_fee numeric(10,2),
    contribution_rate numeric(5,4) DEFAULT 0.05,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: takaful_contributions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.takaful_contributions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: takaful_contributions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.takaful_contributions_id_seq OWNED BY public.takaful_contributions.id;


--
-- Name: takaful_fund; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.takaful_fund (
    id integer NOT NULL,
    balance numeric(12,2) DEFAULT 0,
    total_contributions numeric(12,2) DEFAULT 0,
    total_payouts numeric(12,2) DEFAULT 0,
    currency text DEFAULT 'EGP'::text,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: takaful_fund_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.takaful_fund_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: takaful_fund_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.takaful_fund_id_seq OWNED BY public.takaful_fund.id;


--
-- Name: takaful_loan_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.takaful_loan_payments (
    id integer NOT NULL,
    loan_id integer,
    order_id text,
    gold_grams_paid numeric(10,4),
    gold_price_at_payment numeric(10,2),
    egp_amount numeric(10,2),
    remaining_gold_grams numeric(10,4),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: takaful_loan_payments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.takaful_loan_payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: takaful_loan_payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.takaful_loan_payments_id_seq OWNED BY public.takaful_loan_payments.id;


--
-- Name: takaful_loans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.takaful_loans (
    id integer NOT NULL,
    courier_id text NOT NULL,
    principal_egp numeric(10,2) NOT NULL,
    principal_gold_grams numeric(10,4) NOT NULL,
    gold_price_at_loan numeric(10,2) NOT NULL,
    remaining_gold_grams numeric(10,4),
    monthly_deduction_gold numeric(10,4),
    purpose text,
    loan_type text,
    max_loan_amount numeric(10,2) DEFAULT 5000,
    status text DEFAULT 'pending'::text,
    approved_by text,
    approved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone
);


--
-- Name: takaful_loans_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.takaful_loans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: takaful_loans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.takaful_loans_id_seq OWNED BY public.takaful_loans.id;


--
-- Name: topup_audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.topup_audit_logs (
    id integer NOT NULL,
    topup_id integer NOT NULL,
    admin_id character varying(255) NOT NULL,
    action character varying(20) NOT NULL,
    details jsonb,
    ip_address inet,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: topup_audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.topup_audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: topup_audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.topup_audit_logs_id_seq OWNED BY public.topup_audit_logs.id;


--
-- Name: topups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.topups (
    id integer NOT NULL,
    user_id character varying(255) NOT NULL,
    amount numeric(20,2) NOT NULL,
    payment_method character varying(50) NOT NULL,
    transaction_reference character varying(100) NOT NULL,
    platform_wallet_id integer,
    status character varying(20) DEFAULT 'pending'::character varying,
    rejection_reason text,
    verified_by character varying(255),
    verified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT topups_valid_amount CHECK (((amount >= (10)::numeric) AND (amount <= (10000)::numeric))),
    CONSTRAINT topups_valid_status CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'verified'::character varying, 'rejected'::character varying])::text[])))
);


--
-- Name: topups_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.topups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: topups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.topups_id_seq OWNED BY public.topups.id;


--
-- Name: user_balances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_balances (
    user_id character varying(255) NOT NULL,
    currency character varying(10) DEFAULT 'EGP'::character varying,
    available_balance numeric(20,2) DEFAULT 0,
    pending_balance numeric(20,2) DEFAULT 0,
    held_balance numeric(20,2) DEFAULT 0,
    total_balance numeric(20,2) DEFAULT 0,
    daily_withdrawal_limit numeric(20,2) DEFAULT 10000,
    monthly_withdrawal_limit numeric(20,2) DEFAULT 50000,
    minimum_balance numeric(20,2) DEFAULT 0,
    auto_reload_threshold numeric(20,2),
    auto_reload_amount numeric(20,2),
    lifetime_deposits numeric(20,2) DEFAULT 0,
    lifetime_withdrawals numeric(20,2) DEFAULT 0,
    lifetime_earnings numeric(20,2) DEFAULT 0,
    total_transactions integer DEFAULT 0,
    is_active boolean DEFAULT true,
    is_frozen boolean DEFAULT false,
    freeze_reason text,
    frozen_at timestamp without time zone,
    frozen_by character varying(255),
    last_transaction_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone
);


--
-- Name: user_favorites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_favorites (
    user_id character varying(255) NOT NULL,
    favorite_user_id character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: user_payment_methods; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_payment_methods (
    id integer NOT NULL,
    user_id character varying(255) NOT NULL,
    payment_method_type character varying(50) NOT NULL,
    provider character varying(50) DEFAULT 'stripe'::character varying NOT NULL,
    provider_token character varying(255),
    last_four character varying(4),
    expiry_month integer,
    expiry_year integer,
    is_default boolean DEFAULT false,
    is_verified boolean DEFAULT false,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_payment_methods_payment_method_type_check CHECK (((payment_method_type)::text = ANY ((ARRAY['credit_card'::character varying, 'debit_card'::character varying, 'paypal'::character varying, 'bank_account'::character varying])::text[])))
);


--
-- Name: user_payment_methods_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_payment_methods_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_payment_methods_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_payment_methods_id_seq OWNED BY public.user_payment_methods.id;


--
-- Name: user_saved_addresses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_saved_addresses (
    id character varying(255) NOT NULL,
    user_id character varying(255) NOT NULL,
    label character varying(100) NOT NULL,
    address_data jsonb NOT NULL,
    lat numeric(10,7),
    lng numeric(10,7),
    is_default boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: vendor_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_categories (
    id integer NOT NULL,
    vendor_id character varying(255) NOT NULL,
    name character varying(100) NOT NULL
);


--
-- Name: vendor_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vendor_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vendor_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vendor_categories_id_seq OWNED BY public.vendor_categories.id;


--
-- Name: vendor_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_items (
    id character varying(255) NOT NULL,
    vendor_id character varying(255) NOT NULL,
    item_name character varying(255) NOT NULL,
    description text,
    price numeric(10,2) NOT NULL,
    image_url text,
    category character varying(100),
    stock_qty integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: vendor_payouts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_payouts (
    id integer NOT NULL,
    payout_number character varying(50),
    vendor_id character varying(255) NOT NULL,
    order_id integer NOT NULL,
    order_total numeric(10,2) DEFAULT 0 NOT NULL,
    commission_amount numeric(10,2) DEFAULT 0 NOT NULL,
    payout_amount numeric(10,2) DEFAULT 0 NOT NULL,
    currency character varying(10) DEFAULT 'EGP'::character varying,
    payout_method character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    payout_details jsonb,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    processed_by character varying(255),
    processed_at timestamp without time zone,
    completed_at timestamp without time zone,
    failed_at timestamp without time zone,
    cancelled_at timestamp without time zone,
    failure_reason text,
    cancellation_reason text,
    retry_count integer DEFAULT 0,
    reference_number character varying(255),
    notes text,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT vendor_payouts_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: vendor_payouts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vendor_payouts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vendor_payouts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vendor_payouts_id_seq OWNED BY public.vendor_payouts.id;


--
-- Name: vendors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendors (
    id character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    phone character varying(50),
    address text,
    city character varying(100),
    country character varying(100),
    latitude numeric(10,8),
    longitude numeric(11,8),
    rating numeric(3,2) DEFAULT 0.00,
    opening_hours jsonb,
    logo_url text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    owner_user_id character varying(255),
    review_count integer DEFAULT 0
);


--
-- Name: wallet_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallet_payments (
    id integer NOT NULL,
    order_id character varying(50) NOT NULL,
    wallet_type character varying(50) NOT NULL,
    amount numeric(10,2) NOT NULL,
    currency character varying(3) DEFAULT 'EGP'::character varying,
    sender_phone character varying(20),
    sender_name character varying(255),
    transaction_reference character varying(100),
    transfer_timestamp timestamp without time zone,
    recipient_phone character varying(20) NOT NULL,
    recipient_name character varying(255),
    status character varying(20) DEFAULT 'pending'::character varying,
    confirmed_by character varying(50),
    confirmed_at timestamp without time zone,
    rejection_reason text,
    sms_forwarded boolean DEFAULT false,
    sms_content text,
    auto_verified boolean DEFAULT false,
    notes text,
    screenshot_url character varying(500),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT positive_amount CHECK ((amount > (0)::numeric)),
    CONSTRAINT valid_status CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'confirmed'::character varying, 'rejected'::character varying, 'disputed'::character varying])::text[]))),
    CONSTRAINT valid_wallet_type CHECK (((wallet_type)::text = ANY ((ARRAY['vodafone_cash'::character varying, 'instapay'::character varying, 'orange_cash'::character varying, 'etisalat_cash'::character varying, 'we_pay'::character varying])::text[])))
);


--
-- Name: wallet_payments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.wallet_payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: wallet_payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.wallet_payments_id_seq OWNED BY public.wallet_payments.id;


--
-- Name: withdrawal_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.withdrawal_requests (
    id integer NOT NULL,
    request_number character varying(50) NOT NULL,
    user_id character varying(255) NOT NULL,
    amount numeric(20,2) NOT NULL,
    currency character varying(10) DEFAULT 'EGP'::character varying NOT NULL,
    withdrawal_method character varying(30) NOT NULL,
    destination_type character varying(30) NOT NULL,
    destination_details jsonb NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    requires_verification boolean DEFAULT true,
    verification_code character varying(10),
    verification_sent_at timestamp without time zone,
    verified_at timestamp without time zone,
    processed_at timestamp without time zone,
    processed_by character varying(255),
    transaction_reference character varying(255),
    rejection_reason text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone
);


--
-- Name: withdrawal_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.withdrawal_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: withdrawal_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.withdrawal_requests_id_seq OWNED BY public.withdrawal_requests.id;


--
-- Name: admin_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_logs ALTER COLUMN id SET DEFAULT nextval('public.admin_logs_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: balance_holds id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.balance_holds ALTER COLUMN id SET DEFAULT nextval('public.balance_holds_id_seq'::regclass);


--
-- Name: balance_transactions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.balance_transactions ALTER COLUMN id SET DEFAULT nextval('public.balance_transactions_id_seq'::regclass);


--
-- Name: bids id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bids ALTER COLUMN id SET DEFAULT nextval('public.bids_id_seq'::regclass);


--
-- Name: cart_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items ALTER COLUMN id SET DEFAULT nextval('public.cart_items_id_seq'::regclass);


--
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- Name: commission_config id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commission_config ALTER COLUMN id SET DEFAULT nextval('public.commission_config_id_seq'::regclass);


--
-- Name: coordinate_mappings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coordinate_mappings ALTER COLUMN id SET DEFAULT nextval('public.coordinate_mappings_id_seq'::regclass);


--
-- Name: driver_locations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.driver_locations ALTER COLUMN id SET DEFAULT nextval('public.driver_locations_id_seq'::regclass);


--
-- Name: emergency_transfer_notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emergency_transfer_notifications ALTER COLUMN id SET DEFAULT nextval('public.emergency_transfer_notifications_id_seq'::regclass);


--
-- Name: emergency_transfers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emergency_transfers ALTER COLUMN id SET DEFAULT nextval('public.emergency_transfers_id_seq'::regclass);


--
-- Name: fcm_tokens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fcm_tokens ALTER COLUMN id SET DEFAULT nextval('public.fcm_tokens_id_seq'::regclass);


--
-- Name: fsm_action_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fsm_action_log ALTER COLUMN id SET DEFAULT nextval('public.fsm_action_log_id_seq'::regclass);


--
-- Name: gold_prices id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gold_prices ALTER COLUMN id SET DEFAULT nextval('public.gold_prices_id_seq'::regclass);


--
-- Name: items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.items ALTER COLUMN id SET DEFAULT nextval('public.items_id_seq'::regclass);


--
-- Name: location_updates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.location_updates ALTER COLUMN id SET DEFAULT nextval('public.location_updates_id_seq'::regclass);


--
-- Name: locations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations ALTER COLUMN id SET DEFAULT nextval('public.locations_id_seq'::regclass);


--
-- Name: logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logs ALTER COLUMN id SET DEFAULT nextval('public.logs_id_seq'::regclass);


--
-- Name: marketplace_audit_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_audit_logs ALTER COLUMN id SET DEFAULT nextval('public.marketplace_audit_logs_id_seq'::regclass);


--
-- Name: marketplace_metrics id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_metrics ALTER COLUMN id SET DEFAULT nextval('public.marketplace_metrics_id_seq'::regclass);


--
-- Name: marketplace_order_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_order_items ALTER COLUMN id SET DEFAULT nextval('public.marketplace_order_items_id_seq'::regclass);


--
-- Name: marketplace_orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_orders ALTER COLUMN id SET DEFAULT nextval('public.marketplace_orders_id_seq'::regclass);


--
-- Name: marketplace_reviews id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_reviews ALTER COLUMN id SET DEFAULT nextval('public.marketplace_reviews_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: offers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offers ALTER COLUMN id SET DEFAULT nextval('public.offers_id_seq'::regclass);


--
-- Name: platform_revenue id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_revenue ALTER COLUMN id SET DEFAULT nextval('public.platform_revenue_id_seq'::regclass);


--
-- Name: platform_wallets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_wallets ALTER COLUMN id SET DEFAULT nextval('public.platform_wallets_id_seq'::regclass);


--
-- Name: referral_conversions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_conversions ALTER COLUMN id SET DEFAULT nextval('public.referral_conversions_id_seq'::regclass);


--
-- Name: referral_earnings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_earnings ALTER COLUMN id SET DEFAULT nextval('public.referral_earnings_id_seq'::regclass);


--
-- Name: referral_links id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_links ALTER COLUMN id SET DEFAULT nextval('public.referral_links_id_seq'::regclass);


--
-- Name: referral_payouts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_payouts ALTER COLUMN id SET DEFAULT nextval('public.referral_payouts_id_seq'::regclass);


--
-- Name: schema_migrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations ALTER COLUMN id SET DEFAULT nextval('public.schema_migrations_id_seq'::regclass);


--
-- Name: shopping_carts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shopping_carts ALTER COLUMN id SET DEFAULT nextval('public.shopping_carts_id_seq'::regclass);


--
-- Name: stores id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stores ALTER COLUMN id SET DEFAULT nextval('public.stores_id_seq'::regclass);


--
-- Name: system_health_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_health_logs ALTER COLUMN id SET DEFAULT nextval('public.system_health_logs_id_seq'::regclass);


--
-- Name: takaful_claims id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.takaful_claims ALTER COLUMN id SET DEFAULT nextval('public.takaful_claims_id_seq'::regclass);


--
-- Name: takaful_contributions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.takaful_contributions ALTER COLUMN id SET DEFAULT nextval('public.takaful_contributions_id_seq'::regclass);


--
-- Name: takaful_fund id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.takaful_fund ALTER COLUMN id SET DEFAULT nextval('public.takaful_fund_id_seq'::regclass);


--
-- Name: takaful_loan_payments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.takaful_loan_payments ALTER COLUMN id SET DEFAULT nextval('public.takaful_loan_payments_id_seq'::regclass);


--
-- Name: takaful_loans id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.takaful_loans ALTER COLUMN id SET DEFAULT nextval('public.takaful_loans_id_seq'::regclass);


--
-- Name: topup_audit_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.topup_audit_logs ALTER COLUMN id SET DEFAULT nextval('public.topup_audit_logs_id_seq'::regclass);


--
-- Name: topups id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.topups ALTER COLUMN id SET DEFAULT nextval('public.topups_id_seq'::regclass);


--
-- Name: user_payment_methods id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_payment_methods ALTER COLUMN id SET DEFAULT nextval('public.user_payment_methods_id_seq'::regclass);


--
-- Name: vendor_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_categories ALTER COLUMN id SET DEFAULT nextval('public.vendor_categories_id_seq'::regclass);


--
-- Name: vendor_payouts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_payouts ALTER COLUMN id SET DEFAULT nextval('public.vendor_payouts_id_seq'::regclass);


--
-- Name: wallet_payments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_payments ALTER COLUMN id SET DEFAULT nextval('public.wallet_payments_id_seq'::regclass);


--
-- Name: withdrawal_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.withdrawal_requests ALTER COLUMN id SET DEFAULT nextval('public.withdrawal_requests_id_seq'::regclass);


--
-- Name: admin_logs admin_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_logs
    ADD CONSTRAINT admin_logs_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: backups backups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backups
    ADD CONSTRAINT backups_pkey PRIMARY KEY (id);


--
-- Name: balance_holds balance_holds_hold_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.balance_holds
    ADD CONSTRAINT balance_holds_hold_id_key UNIQUE (hold_id);


--
-- Name: balance_holds balance_holds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.balance_holds
    ADD CONSTRAINT balance_holds_pkey PRIMARY KEY (id);


--
-- Name: balance_transactions balance_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.balance_transactions
    ADD CONSTRAINT balance_transactions_pkey PRIMARY KEY (id);


--
-- Name: balance_transactions balance_transactions_transaction_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.balance_transactions
    ADD CONSTRAINT balance_transactions_transaction_id_key UNIQUE (transaction_id);


--
-- Name: bids bids_order_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bids
    ADD CONSTRAINT bids_order_id_user_id_key UNIQUE (order_id, user_id);


--
-- Name: bids bids_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bids
    ADD CONSTRAINT bids_pkey PRIMARY KEY (id);


--
-- Name: cart_items cart_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: commission_config commission_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commission_config
    ADD CONSTRAINT commission_config_pkey PRIMARY KEY (id);


--
-- Name: coordinate_mappings coordinate_mappings_location_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coordinate_mappings
    ADD CONSTRAINT coordinate_mappings_location_key_key UNIQUE (location_key);


--
-- Name: coordinate_mappings coordinate_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coordinate_mappings
    ADD CONSTRAINT coordinate_mappings_pkey PRIMARY KEY (id);


--
-- Name: crypto_transactions crypto_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crypto_transactions
    ADD CONSTRAINT crypto_transactions_pkey PRIMARY KEY (id);


--
-- Name: crypto_transactions crypto_transactions_tx_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crypto_transactions
    ADD CONSTRAINT crypto_transactions_tx_hash_key UNIQUE (tx_hash);


--
-- Name: driver_locations driver_locations_driver_id_order_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.driver_locations
    ADD CONSTRAINT driver_locations_driver_id_order_id_key UNIQUE (driver_id, order_id);


--
-- Name: driver_locations driver_locations_driver_order_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.driver_locations
    ADD CONSTRAINT driver_locations_driver_order_unique UNIQUE (driver_id, order_id);


--
-- Name: driver_locations driver_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.driver_locations
    ADD CONSTRAINT driver_locations_pkey PRIMARY KEY (id);


--
-- Name: email_verification_tokens email_verification_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_verification_tokens
    ADD CONSTRAINT email_verification_tokens_pkey PRIMARY KEY (id);


--
-- Name: email_verification_tokens email_verification_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_verification_tokens
    ADD CONSTRAINT email_verification_tokens_token_key UNIQUE (token);


--
-- Name: emergency_transfer_notifications emergency_transfer_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emergency_transfer_notifications
    ADD CONSTRAINT emergency_transfer_notifications_pkey PRIMARY KEY (id);


--
-- Name: emergency_transfers emergency_transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emergency_transfers
    ADD CONSTRAINT emergency_transfers_pkey PRIMARY KEY (id);


--
-- Name: fcm_tokens fcm_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fcm_tokens
    ADD CONSTRAINT fcm_tokens_pkey PRIMARY KEY (id);


--
-- Name: fcm_tokens fcm_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fcm_tokens
    ADD CONSTRAINT fcm_tokens_token_key UNIQUE (token);


--
-- Name: fsm_action_log fsm_action_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fsm_action_log
    ADD CONSTRAINT fsm_action_log_pkey PRIMARY KEY (id);


--
-- Name: gold_prices gold_prices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gold_prices
    ADD CONSTRAINT gold_prices_pkey PRIMARY KEY (id);


--
-- Name: gold_prices gold_prices_recorded_at_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gold_prices
    ADD CONSTRAINT gold_prices_recorded_at_key UNIQUE (recorded_at);


--
-- Name: items items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_pkey PRIMARY KEY (id);


--
-- Name: location_cache location_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.location_cache
    ADD CONSTRAINT location_cache_pkey PRIMARY KEY (cache_key);


--
-- Name: location_updates location_updates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.location_updates
    ADD CONSTRAINT location_updates_pkey PRIMARY KEY (id);


--
-- Name: locations locations_country_city_area_street_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_country_city_area_street_key UNIQUE (country, city, area, street);


--
-- Name: locations locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_pkey PRIMARY KEY (id);


--
-- Name: logs logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logs
    ADD CONSTRAINT logs_pkey PRIMARY KEY (id);


--
-- Name: marketplace_audit_logs marketplace_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_audit_logs
    ADD CONSTRAINT marketplace_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: marketplace_metrics marketplace_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_metrics
    ADD CONSTRAINT marketplace_metrics_pkey PRIMARY KEY (id);


--
-- Name: marketplace_order_delivery_fsm marketplace_order_delivery_fsm_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_order_delivery_fsm
    ADD CONSTRAINT marketplace_order_delivery_fsm_pkey PRIMARY KEY (order_id);


--
-- Name: marketplace_order_items marketplace_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_order_items
    ADD CONSTRAINT marketplace_order_items_pkey PRIMARY KEY (id);


--
-- Name: marketplace_order_payment_fsm marketplace_order_payment_fsm_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_order_payment_fsm
    ADD CONSTRAINT marketplace_order_payment_fsm_pkey PRIMARY KEY (order_id);


--
-- Name: marketplace_order_vendor_fsm marketplace_order_vendor_fsm_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_order_vendor_fsm
    ADD CONSTRAINT marketplace_order_vendor_fsm_pkey PRIMARY KEY (order_id);


--
-- Name: marketplace_orders marketplace_orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_orders
    ADD CONSTRAINT marketplace_orders_order_number_key UNIQUE (order_number);


--
-- Name: marketplace_orders marketplace_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_orders
    ADD CONSTRAINT marketplace_orders_pkey PRIMARY KEY (id);


--
-- Name: marketplace_reviews marketplace_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_reviews
    ADD CONSTRAINT marketplace_reviews_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: offers offers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offers
    ADD CONSTRAINT offers_pkey PRIMARY KEY (id);


--
-- Name: orders orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key UNIQUE (token);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: platform_revenue platform_revenue_order_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_revenue
    ADD CONSTRAINT platform_revenue_order_id_key UNIQUE (order_id);


--
-- Name: platform_revenue platform_revenue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_revenue
    ADD CONSTRAINT platform_revenue_pkey PRIMARY KEY (id);


--
-- Name: platform_review_flags platform_review_flags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_review_flags
    ADD CONSTRAINT platform_review_flags_pkey PRIMARY KEY (review_id, user_id);


--
-- Name: platform_review_votes platform_review_votes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_review_votes
    ADD CONSTRAINT platform_review_votes_pkey PRIMARY KEY (review_id, user_id);


--
-- Name: platform_reviews platform_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_reviews
    ADD CONSTRAINT platform_reviews_pkey PRIMARY KEY (id);


--
-- Name: platform_wallets platform_wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_wallets
    ADD CONSTRAINT platform_wallets_pkey PRIMARY KEY (id);


--
-- Name: platform_wallets platform_wallets_wallet_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_wallets
    ADD CONSTRAINT platform_wallets_wallet_type_key UNIQUE (wallet_type);


--
-- Name: referral_conversions referral_conversions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_conversions
    ADD CONSTRAINT referral_conversions_pkey PRIMARY KEY (id);


--
-- Name: referral_conversions referral_conversions_referrer_id_referee_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_conversions
    ADD CONSTRAINT referral_conversions_referrer_id_referee_id_key UNIQUE (referrer_id, referee_id);


--
-- Name: referral_earnings referral_earnings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_earnings
    ADD CONSTRAINT referral_earnings_pkey PRIMARY KEY (id);


--
-- Name: referral_links referral_links_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_links
    ADD CONSTRAINT referral_links_code_key UNIQUE (code);


--
-- Name: referral_links referral_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_links
    ADD CONSTRAINT referral_links_pkey PRIMARY KEY (id);


--
-- Name: referral_payouts referral_payouts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_payouts
    ADD CONSTRAINT referral_payouts_pkey PRIMARY KEY (id);


--
-- Name: review_flags review_flags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_flags
    ADD CONSTRAINT review_flags_pkey PRIMARY KEY (review_id, user_id);


--
-- Name: review_votes review_votes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_votes
    ADD CONSTRAINT review_votes_pkey PRIMARY KEY (review_id, user_id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_migration_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_migration_name_key UNIQUE (migration_name);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (id);


--
-- Name: shopping_carts shopping_carts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shopping_carts
    ADD CONSTRAINT shopping_carts_pkey PRIMARY KEY (id);


--
-- Name: stores stores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stores
    ADD CONSTRAINT stores_pkey PRIMARY KEY (id);


--
-- Name: system_health_logs system_health_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_health_logs
    ADD CONSTRAINT system_health_logs_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (key);


--
-- Name: takaful_claims takaful_claims_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.takaful_claims
    ADD CONSTRAINT takaful_claims_pkey PRIMARY KEY (id);


--
-- Name: takaful_contributions takaful_contributions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.takaful_contributions
    ADD CONSTRAINT takaful_contributions_pkey PRIMARY KEY (id);


--
-- Name: takaful_fund takaful_fund_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.takaful_fund
    ADD CONSTRAINT takaful_fund_pkey PRIMARY KEY (id);


--
-- Name: takaful_loan_payments takaful_loan_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.takaful_loan_payments
    ADD CONSTRAINT takaful_loan_payments_pkey PRIMARY KEY (id);


--
-- Name: takaful_loans takaful_loans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.takaful_loans
    ADD CONSTRAINT takaful_loans_pkey PRIMARY KEY (id);


--
-- Name: topup_audit_logs topup_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.topup_audit_logs
    ADD CONSTRAINT topup_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: topups topups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.topups
    ADD CONSTRAINT topups_pkey PRIMARY KEY (id);


--
-- Name: topups topups_unique_reference_per_method; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.topups
    ADD CONSTRAINT topups_unique_reference_per_method UNIQUE (transaction_reference, payment_method);


--
-- Name: user_balances user_balances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_balances
    ADD CONSTRAINT user_balances_pkey PRIMARY KEY (user_id);


--
-- Name: user_favorites user_favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_favorites
    ADD CONSTRAINT user_favorites_pkey PRIMARY KEY (user_id, favorite_user_id);


--
-- Name: user_payment_methods user_payment_methods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_payment_methods
    ADD CONSTRAINT user_payment_methods_pkey PRIMARY KEY (id);


--
-- Name: user_payment_methods user_payment_methods_user_id_provider_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_payment_methods
    ADD CONSTRAINT user_payment_methods_user_id_provider_token_key UNIQUE (user_id, provider_token);


--
-- Name: user_saved_addresses user_saved_addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_saved_addresses
    ADD CONSTRAINT user_saved_addresses_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_wallet_address_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_wallet_address_key UNIQUE (wallet_address);


--
-- Name: vendor_categories vendor_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_categories
    ADD CONSTRAINT vendor_categories_pkey PRIMARY KEY (id);


--
-- Name: vendor_items vendor_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_items
    ADD CONSTRAINT vendor_items_pkey PRIMARY KEY (id);


--
-- Name: vendor_payouts vendor_payouts_payout_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_payouts
    ADD CONSTRAINT vendor_payouts_payout_number_key UNIQUE (payout_number);


--
-- Name: vendor_payouts vendor_payouts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_payouts
    ADD CONSTRAINT vendor_payouts_pkey PRIMARY KEY (id);


--
-- Name: vendors vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_pkey PRIMARY KEY (id);


--
-- Name: wallet_payments wallet_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_payments
    ADD CONSTRAINT wallet_payments_pkey PRIMARY KEY (id);


--
-- Name: withdrawal_requests withdrawal_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.withdrawal_requests
    ADD CONSTRAINT withdrawal_requests_pkey PRIMARY KEY (id);


--
-- Name: withdrawal_requests withdrawal_requests_request_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.withdrawal_requests
    ADD CONSTRAINT withdrawal_requests_request_number_key UNIQUE (request_number);


--
-- Name: idx_action_log_actor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_action_log_actor ON public.fsm_action_log USING btree (actor);


--
-- Name: idx_action_log_fsm_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_action_log_fsm_type ON public.fsm_action_log USING btree (fsm_type);


--
-- Name: idx_action_log_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_action_log_order_id ON public.fsm_action_log USING btree (order_id);


--
-- Name: idx_action_log_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_action_log_timestamp ON public.fsm_action_log USING btree ("timestamp");


--
-- Name: idx_admin_logs_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_logs_action ON public.admin_logs USING btree (action);


--
-- Name: idx_admin_logs_admin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_logs_admin ON public.admin_logs USING btree (admin_id);


--
-- Name: idx_admin_logs_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_logs_created ON public.admin_logs USING btree (created_at);


--
-- Name: idx_audit_logs_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_action ON public.audit_logs USING btree (action);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at DESC);


--
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);


--
-- Name: idx_balance_holds_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_balance_holds_expires ON public.balance_holds USING btree (expires_at) WHERE ((status)::text = 'active'::text);


--
-- Name: idx_balance_holds_hold_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_balance_holds_hold_id ON public.balance_holds USING btree (hold_id);


--
-- Name: idx_balance_holds_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_balance_holds_order ON public.balance_holds USING btree (order_id) WHERE (order_id IS NOT NULL);


--
-- Name: idx_balance_holds_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_balance_holds_status ON public.balance_holds USING btree (status);


--
-- Name: idx_balance_holds_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_balance_holds_user ON public.balance_holds USING btree (user_id);


--
-- Name: idx_balance_holds_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_balance_holds_user_id ON public.balance_holds USING btree (user_id);


--
-- Name: idx_balance_transactions_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_balance_transactions_created_at ON public.balance_transactions USING btree (created_at);


--
-- Name: idx_balance_transactions_transaction_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_balance_transactions_transaction_id ON public.balance_transactions USING btree (transaction_id);


--
-- Name: idx_balance_transactions_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_balance_transactions_type ON public.balance_transactions USING btree (type);


--
-- Name: idx_balance_transactions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_balance_transactions_user_id ON public.balance_transactions USING btree (user_id);


--
-- Name: idx_balance_tx_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_balance_tx_created ON public.balance_transactions USING btree (created_at DESC);


--
-- Name: idx_balance_tx_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_balance_tx_order ON public.balance_transactions USING btree (order_id) WHERE (order_id IS NOT NULL);


--
-- Name: idx_balance_tx_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_balance_tx_status ON public.balance_transactions USING btree (status);


--
-- Name: idx_balance_tx_transaction_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_balance_tx_transaction_id ON public.balance_transactions USING btree (transaction_id);


--
-- Name: idx_balance_tx_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_balance_tx_type ON public.balance_transactions USING btree (type);


--
-- Name: idx_balance_tx_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_balance_tx_user ON public.balance_transactions USING btree (user_id);


--
-- Name: idx_balance_tx_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_balance_tx_user_created ON public.balance_transactions USING btree (user_id, created_at DESC);


--
-- Name: idx_balance_tx_user_type_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_balance_tx_user_type_created ON public.balance_transactions USING btree (user_id, type, created_at DESC);


--
-- Name: idx_balance_tx_user_type_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_balance_tx_user_type_status ON public.balance_transactions USING btree (user_id, type, status);


--
-- Name: idx_bids_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bids_created_at ON public.bids USING btree (created_at DESC);


--
-- Name: idx_bids_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bids_order_id ON public.bids USING btree (order_id);


--
-- Name: idx_bids_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bids_status ON public.bids USING btree (status);


--
-- Name: idx_bids_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bids_user_id ON public.bids USING btree (user_id);


--
-- Name: idx_cart_items_cart_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cart_items_cart_id ON public.cart_items USING btree (cart_id);


--
-- Name: idx_cart_items_cart_item; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_cart_items_cart_item ON public.cart_items USING btree (cart_id, item_id);


--
-- Name: idx_cart_items_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cart_items_item_id ON public.cart_items USING btree (item_id);


--
-- Name: idx_categories_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_categories_name ON public.categories USING btree (name);


--
-- Name: idx_categories_parent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_categories_parent_id ON public.categories USING btree (parent_id);


--
-- Name: idx_crypto_tx_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crypto_tx_hash ON public.crypto_transactions USING btree (tx_hash);


--
-- Name: idx_crypto_tx_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crypto_tx_order ON public.crypto_transactions USING btree (order_id);


--
-- Name: idx_crypto_tx_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crypto_tx_status ON public.crypto_transactions USING btree (status);


--
-- Name: idx_crypto_tx_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crypto_tx_user ON public.crypto_transactions USING btree (user_id);


--
-- Name: idx_delivery_fsm_state; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_delivery_fsm_state ON public.marketplace_order_delivery_fsm USING btree (current_state);


--
-- Name: idx_driver_locations_driver_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_driver_locations_driver_id ON public.driver_locations USING btree (driver_id);


--
-- Name: idx_driver_locations_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_driver_locations_order ON public.driver_locations USING btree (order_id);


--
-- Name: idx_driver_locations_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_driver_locations_timestamp ON public.driver_locations USING btree ("timestamp" DESC);


--
-- Name: idx_email_verification_tokens_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_verification_tokens_expires_at ON public.email_verification_tokens USING btree (expires_at);


--
-- Name: idx_email_verification_tokens_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_verification_tokens_token ON public.email_verification_tokens USING btree (token);


--
-- Name: idx_email_verification_tokens_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_verification_tokens_user_id ON public.email_verification_tokens USING btree (user_id);


--
-- Name: idx_emergency_notif_driver; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emergency_notif_driver ON public.emergency_transfer_notifications USING btree (driver_id);


--
-- Name: idx_emergency_notif_transfer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emergency_notif_transfer ON public.emergency_transfer_notifications USING btree (transfer_id);


--
-- Name: idx_emergency_transfers_new_driver; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emergency_transfers_new_driver ON public.emergency_transfers USING btree (new_driver_id);


--
-- Name: idx_emergency_transfers_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emergency_transfers_order ON public.emergency_transfers USING btree (order_id);


--
-- Name: idx_emergency_transfers_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emergency_transfers_status ON public.emergency_transfers USING btree (status);


--
-- Name: idx_emergency_transfers_timeout; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emergency_transfers_timeout ON public.emergency_transfers USING btree (timeout_at) WHERE (status = 'pending'::text);


--
-- Name: idx_fcm_tokens_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fcm_tokens_active ON public.fcm_tokens USING btree (is_active);


--
-- Name: idx_fcm_tokens_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fcm_tokens_role ON public.fcm_tokens USING btree (role);


--
-- Name: idx_fcm_tokens_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fcm_tokens_user_id ON public.fcm_tokens USING btree (user_id);


--
-- Name: idx_health_logs_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_health_logs_timestamp ON public.system_health_logs USING btree ("timestamp" DESC);


--
-- Name: idx_items_category_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_items_category_id ON public.items USING btree (category_id);


--
-- Name: idx_items_inventory_quantity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_items_inventory_quantity ON public.items USING btree (inventory_quantity);


--
-- Name: idx_items_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_items_status ON public.items USING btree (status);


--
-- Name: idx_items_store_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_items_store_id ON public.items USING btree (store_id);


--
-- Name: idx_loan_payments_loan; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_loan_payments_loan ON public.takaful_loan_payments USING btree (loan_id);


--
-- Name: idx_location_updates_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_location_updates_created_at ON public.location_updates USING btree (created_at DESC);


--
-- Name: idx_location_updates_driver_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_location_updates_driver_id ON public.location_updates USING btree (driver_id);


--
-- Name: idx_location_updates_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_location_updates_order_id ON public.location_updates USING btree (order_id);


--
-- Name: idx_logs_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_logs_category ON public.logs USING btree (category);


--
-- Name: idx_logs_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_logs_level ON public.logs USING btree (level);


--
-- Name: idx_logs_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_logs_session_id ON public.logs USING btree (session_id);


--
-- Name: idx_logs_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_logs_source ON public.logs USING btree (source);


--
-- Name: idx_logs_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_logs_timestamp ON public.logs USING btree ("timestamp" DESC);


--
-- Name: idx_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_logs_user_id ON public.logs USING btree (user_id);


--
-- Name: idx_marketplace_audit_logs_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marketplace_audit_logs_action ON public.marketplace_audit_logs USING btree (action);


--
-- Name: idx_marketplace_audit_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marketplace_audit_logs_created_at ON public.marketplace_audit_logs USING btree (created_at);


--
-- Name: idx_marketplace_audit_logs_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marketplace_audit_logs_order_id ON public.marketplace_audit_logs USING btree (order_id);


--
-- Name: idx_marketplace_audit_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marketplace_audit_logs_user_id ON public.marketplace_audit_logs USING btree (user_id);


--
-- Name: idx_marketplace_audit_logs_vendor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marketplace_audit_logs_vendor_id ON public.marketplace_audit_logs USING btree (vendor_id);


--
-- Name: idx_marketplace_metrics_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marketplace_metrics_timestamp ON public.marketplace_metrics USING btree ("timestamp" DESC);


--
-- Name: idx_marketplace_metrics_type_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marketplace_metrics_type_timestamp ON public.marketplace_metrics USING btree (metric_type, "timestamp" DESC);


--
-- Name: idx_marketplace_order_items_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marketplace_order_items_item_id ON public.marketplace_order_items USING btree (item_id);


--
-- Name: idx_marketplace_order_items_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marketplace_order_items_order_id ON public.marketplace_order_items USING btree (order_id);


--
-- Name: idx_marketplace_orders_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marketplace_orders_created_at ON public.marketplace_orders USING btree (created_at);


--
-- Name: idx_marketplace_orders_order_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marketplace_orders_order_number ON public.marketplace_orders USING btree (order_number);


--
-- Name: idx_marketplace_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marketplace_orders_status ON public.marketplace_orders USING btree (status);


--
-- Name: idx_marketplace_orders_store_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marketplace_orders_store_id ON public.marketplace_orders USING btree (store_id);


--
-- Name: idx_marketplace_orders_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marketplace_orders_user_id ON public.marketplace_orders USING btree (user_id);


--
-- Name: idx_marketplace_orders_vendor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marketplace_orders_vendor_id ON public.marketplace_orders USING btree (vendor_id);


--
-- Name: idx_marketplace_reviews_approved; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marketplace_reviews_approved ON public.marketplace_reviews USING btree (is_approved);


--
-- Name: idx_marketplace_reviews_featured; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marketplace_reviews_featured ON public.marketplace_reviews USING btree (is_featured, created_at DESC);


--
-- Name: idx_marketplace_reviews_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_marketplace_reviews_order_id ON public.marketplace_reviews USING btree (order_id);


--
-- Name: idx_marketplace_reviews_reviewer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marketplace_reviews_reviewer ON public.marketplace_reviews USING btree (reviewer_user_id);


--
-- Name: idx_marketplace_reviews_vendor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marketplace_reviews_vendor_id ON public.marketplace_reviews USING btree (vendor_id);


--
-- Name: idx_messages_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_created_at ON public.messages USING btree (created_at DESC);


--
-- Name: idx_messages_is_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_is_read ON public.messages USING btree (is_read);


--
-- Name: idx_messages_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_order_id ON public.messages USING btree (order_id);


--
-- Name: idx_messages_recipient_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_recipient_id ON public.messages USING btree (recipient_id);


--
-- Name: idx_messages_sender_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_sender_id ON public.messages USING btree (sender_id);


--
-- Name: idx_migration_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_migration_name ON public.schema_migrations USING btree (migration_name);


--
-- Name: idx_notifications_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at DESC);


--
-- Name: idx_notifications_is_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_is_read ON public.notifications USING btree (is_read);


--
-- Name: idx_notifications_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_order_id ON public.notifications USING btree (order_id);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: idx_offers_date_range; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_offers_date_range ON public.offers USING btree (start_date, end_date);


--
-- Name: idx_offers_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_offers_item_id ON public.offers USING btree (item_id);


--
-- Name: idx_offers_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_offers_status ON public.offers USING btree (status);


--
-- Name: idx_orders_assigned_driver_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_assigned_driver_user_id ON public.orders USING btree (assigned_driver_user_id);


--
-- Name: idx_orders_blockchain_tx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_blockchain_tx ON public.orders USING btree (blockchain_tx_hash);


--
-- Name: idx_orders_completed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_completed_at ON public.orders USING btree (completed_at DESC);


--
-- Name: idx_orders_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_created_at ON public.orders USING btree (created_at DESC);


--
-- Name: idx_orders_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_customer_id ON public.orders USING btree (customer_id);


--
-- Name: idx_orders_driver_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_driver_status ON public.orders USING btree (assigned_driver_user_id, status) WHERE (assigned_driver_user_id IS NOT NULL);


--
-- Name: idx_orders_escrow_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_escrow_status ON public.orders USING btree (escrow_status) WHERE (escrow_status IS NOT NULL);


--
-- Name: idx_orders_order_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_order_number ON public.orders USING btree (order_number);


--
-- Name: idx_orders_payment_method; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_payment_method ON public.orders USING btree (payment_method);


--
-- Name: idx_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_status ON public.orders USING btree (status);


--
-- Name: idx_password_reset_tokens_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_password_reset_tokens_expires_at ON public.password_reset_tokens USING btree (expires_at);


--
-- Name: idx_password_reset_tokens_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_password_reset_tokens_token ON public.password_reset_tokens USING btree (token);


--
-- Name: idx_password_reset_tokens_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_password_reset_tokens_user_id ON public.password_reset_tokens USING btree (user_id);


--
-- Name: idx_payment_fsm_state; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_fsm_state ON public.marketplace_order_payment_fsm USING btree (current_state);


--
-- Name: idx_payments_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_created_at ON public.payments USING btree (created_at DESC);


--
-- Name: idx_payments_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_order_id ON public.payments USING btree (order_id);


--
-- Name: idx_payments_payer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_payer_id ON public.payments USING btree (payer_id);


--
-- Name: idx_payments_paymob_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_paymob_order ON public.payments USING btree (paymob_order_id);


--
-- Name: idx_payments_paymob_transaction; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_paymob_transaction ON public.payments USING btree (paymob_transaction_id);


--
-- Name: idx_payments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_status ON public.payments USING btree (status);


--
-- Name: idx_platform_revenue_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platform_revenue_created ON public.platform_revenue USING btree (created_at);


--
-- Name: idx_platform_revenue_payment_method; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platform_revenue_payment_method ON public.platform_revenue USING btree (payment_method);


--
-- Name: idx_platform_reviews_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platform_reviews_created_at ON public.platform_reviews USING btree (created_at);


--
-- Name: idx_platform_reviews_flag_count; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platform_reviews_flag_count ON public.platform_reviews USING btree (flag_count);


--
-- Name: idx_platform_reviews_is_approved; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platform_reviews_is_approved ON public.platform_reviews USING btree (is_approved);


--
-- Name: idx_platform_reviews_upvotes; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platform_reviews_upvotes ON public.platform_reviews USING btree (upvotes DESC);


--
-- Name: idx_platform_reviews_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platform_reviews_user_id ON public.platform_reviews USING btree (user_id);


--
-- Name: idx_platform_wallets_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platform_wallets_active ON public.platform_wallets USING btree (wallet_type) WHERE (is_active = true);


--
-- Name: idx_referral_conversions_referee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referral_conversions_referee ON public.referral_conversions USING btree (referee_id);


--
-- Name: idx_referral_conversions_referrer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referral_conversions_referrer ON public.referral_conversions USING btree (referrer_id);


--
-- Name: idx_referral_earnings_referrer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referral_earnings_referrer ON public.referral_earnings USING btree (referrer_id);


--
-- Name: idx_referral_earnings_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referral_earnings_status ON public.referral_earnings USING btree (status);


--
-- Name: idx_referral_links_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referral_links_code ON public.referral_links USING btree (code);


--
-- Name: idx_referral_links_referrer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referral_links_referrer ON public.referral_links USING btree (referrer_id);


--
-- Name: idx_referral_payouts_referrer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referral_payouts_referrer ON public.referral_payouts USING btree (referrer_id);


--
-- Name: idx_reviews_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_created_at ON public.reviews USING btree (created_at);


--
-- Name: idx_reviews_flag_count; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_flag_count ON public.reviews USING btree (flag_count);


--
-- Name: idx_reviews_is_approved; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_is_approved ON public.reviews USING btree (is_approved);


--
-- Name: idx_reviews_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_order_id ON public.reviews USING btree (order_id);


--
-- Name: idx_reviews_review_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_review_type ON public.reviews USING btree (review_type);


--
-- Name: idx_reviews_upvotes; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_upvotes ON public.reviews USING btree (upvotes DESC);


--
-- Name: idx_reviews_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_user_id ON public.reviews USING btree (user_id);


--
-- Name: idx_shopping_carts_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shopping_carts_expires_at ON public.shopping_carts USING btree (expires_at);


--
-- Name: idx_shopping_carts_store_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shopping_carts_store_id ON public.shopping_carts USING btree (store_id);


--
-- Name: idx_shopping_carts_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shopping_carts_user_id ON public.shopping_carts USING btree (user_id);


--
-- Name: idx_stores_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stores_location ON public.stores USING gist (location);


--
-- Name: idx_stores_vendor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stores_vendor_id ON public.stores USING btree (vendor_id);


--
-- Name: idx_takaful_claims_courier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_takaful_claims_courier ON public.takaful_claims USING btree (courier_id);


--
-- Name: idx_takaful_claims_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_takaful_claims_status ON public.takaful_claims USING btree (status);


--
-- Name: idx_takaful_claims_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_takaful_claims_type ON public.takaful_claims USING btree (claim_type);


--
-- Name: idx_takaful_contributions_courier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_takaful_contributions_courier ON public.takaful_contributions USING btree (courier_id);


--
-- Name: idx_takaful_contributions_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_takaful_contributions_date ON public.takaful_contributions USING btree (created_at);


--
-- Name: idx_takaful_contributions_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_takaful_contributions_order ON public.takaful_contributions USING btree (order_id);


--
-- Name: idx_takaful_loans_courier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_takaful_loans_courier ON public.takaful_loans USING btree (courier_id);


--
-- Name: idx_takaful_loans_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_takaful_loans_status ON public.takaful_loans USING btree (status);


--
-- Name: idx_topup_audit_logs_admin_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_topup_audit_logs_admin_id ON public.topup_audit_logs USING btree (admin_id);


--
-- Name: idx_topup_audit_logs_topup_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_topup_audit_logs_topup_id ON public.topup_audit_logs USING btree (topup_id);


--
-- Name: idx_topups_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_topups_created_at ON public.topups USING btree (created_at DESC);


--
-- Name: idx_topups_payment_method; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_topups_payment_method ON public.topups USING btree (payment_method);


--
-- Name: idx_topups_reference; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_topups_reference ON public.topups USING btree (transaction_reference);


--
-- Name: idx_topups_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_topups_status ON public.topups USING btree (status);


--
-- Name: idx_topups_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_topups_user_id ON public.topups USING btree (user_id);


--
-- Name: idx_user_balances_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_balances_active ON public.user_balances USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_user_balances_currency; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_balances_currency ON public.user_balances USING btree (currency);


--
-- Name: idx_user_balances_frozen; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_balances_frozen ON public.user_balances USING btree (is_frozen) WHERE (is_frozen = true);


--
-- Name: idx_user_balances_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_balances_user_id ON public.user_balances USING btree (user_id);


--
-- Name: idx_user_saved_addresses_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_saved_addresses_user ON public.user_saved_addresses USING btree (user_id);


--
-- Name: idx_users_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_created_at ON public.users USING btree (created_at DESC);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_is_available; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_is_available ON public.users USING btree (is_available);


--
-- Name: idx_users_is_verified; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_is_verified ON public.users USING btree (is_verified);


--
-- Name: idx_users_last_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_last_active ON public.users USING btree (last_active DESC);


--
-- Name: idx_users_primary_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_primary_role ON public.users USING btree (primary_role);


--
-- Name: idx_users_wallet; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_wallet ON public.users USING btree (wallet_address);


--
-- Name: idx_vendor_fsm_state; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_fsm_state ON public.marketplace_order_vendor_fsm USING btree (current_state);


--
-- Name: idx_vendor_items_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_items_category ON public.vendor_items USING btree (category);


--
-- Name: idx_vendor_items_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_items_created ON public.vendor_items USING btree (created_at);


--
-- Name: idx_vendor_items_price; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_items_price ON public.vendor_items USING btree (price);


--
-- Name: idx_vendor_items_vendor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_items_vendor ON public.vendor_items USING btree (vendor_id);


--
-- Name: idx_vendor_payouts_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_payouts_created ON public.vendor_payouts USING btree (created_at DESC);


--
-- Name: idx_vendor_payouts_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_payouts_order ON public.vendor_payouts USING btree (order_id);


--
-- Name: idx_vendor_payouts_payout_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_payouts_payout_number ON public.vendor_payouts USING btree (payout_number);


--
-- Name: idx_vendor_payouts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_payouts_status ON public.vendor_payouts USING btree (status);


--
-- Name: idx_vendor_payouts_unique_order; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_vendor_payouts_unique_order ON public.vendor_payouts USING btree (order_id);


--
-- Name: idx_vendor_payouts_vendor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_payouts_vendor ON public.vendor_payouts USING btree (vendor_id);


--
-- Name: idx_vendors_city; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendors_city ON public.vendors USING btree (city);


--
-- Name: idx_vendors_coords; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendors_coords ON public.vendors USING btree (latitude, longitude);


--
-- Name: idx_vendors_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendors_owner ON public.vendors USING btree (owner_user_id);


--
-- Name: idx_vendors_rating; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendors_rating ON public.vendors USING btree (rating);


--
-- Name: idx_wallet_payments_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallet_payments_created_at ON public.wallet_payments USING btree (created_at);


--
-- Name: idx_wallet_payments_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallet_payments_order_id ON public.wallet_payments USING btree (order_id);


--
-- Name: idx_wallet_payments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallet_payments_status ON public.wallet_payments USING btree (status);


--
-- Name: idx_wallet_payments_transaction_ref; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallet_payments_transaction_ref ON public.wallet_payments USING btree (transaction_reference);


--
-- Name: idx_wallet_payments_wallet_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallet_payments_wallet_type ON public.wallet_payments USING btree (wallet_type);


--
-- Name: idx_withdrawal_requests_request_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_withdrawal_requests_request_number ON public.withdrawal_requests USING btree (request_number);


--
-- Name: idx_withdrawal_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_withdrawal_requests_status ON public.withdrawal_requests USING btree (status);


--
-- Name: idx_withdrawal_requests_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_withdrawal_requests_user_id ON public.withdrawal_requests USING btree (user_id);


--
-- Name: balance_holds balance_holds_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER balance_holds_updated_at BEFORE UPDATE ON public.balance_holds FOR EACH ROW EXECUTE FUNCTION public.update_balance_transaction_timestamp();


--
-- Name: balance_transactions balance_transactions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER balance_transactions_updated_at BEFORE UPDATE ON public.balance_transactions FOR EACH ROW EXECUTE FUNCTION public.update_balance_transaction_timestamp();


--
-- Name: marketplace_order_delivery_fsm delivery_fsm_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delivery_fsm_updated BEFORE UPDATE ON public.marketplace_order_delivery_fsm FOR EACH ROW EXECUTE FUNCTION public.update_fsm_last_updated();


--
-- Name: marketplace_order_payment_fsm payment_fsm_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER payment_fsm_updated BEFORE UPDATE ON public.marketplace_order_payment_fsm FOR EACH ROW EXECUTE FUNCTION public.update_fsm_last_updated();


--
-- Name: topups topups_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER topups_updated_at BEFORE UPDATE ON public.topups FOR EACH ROW EXECUTE FUNCTION public.update_topups_timestamp();


--
-- Name: takaful_contributions trg_takaful_contribution; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_takaful_contribution AFTER INSERT ON public.takaful_contributions FOR EACH ROW EXECUTE FUNCTION public.update_takaful_fund_on_contribution();


--
-- Name: vendor_payouts trigger_set_payout_number; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_set_payout_number BEFORE INSERT ON public.vendor_payouts FOR EACH ROW EXECUTE FUNCTION public.set_payout_number();


--
-- Name: cart_items trigger_update_cart_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_cart_updated_at AFTER INSERT OR DELETE OR UPDATE ON public.cart_items FOR EACH ROW EXECUTE FUNCTION public.update_cart_updated_at();


--
-- Name: marketplace_order_items trigger_update_marketplace_order_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_marketplace_order_updated_at AFTER INSERT OR DELETE OR UPDATE ON public.marketplace_order_items FOR EACH ROW EXECUTE FUNCTION public.update_marketplace_order_updated_at();


--
-- Name: marketplace_reviews trigger_update_marketplace_review_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_marketplace_review_updated_at BEFORE UPDATE ON public.marketplace_reviews FOR EACH ROW EXECUTE FUNCTION public.update_marketplace_review_updated_at();


--
-- Name: vendor_payouts trigger_update_vendor_payout_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_vendor_payout_updated_at BEFORE UPDATE ON public.vendor_payouts FOR EACH ROW EXECUTE FUNCTION public.update_vendor_payout_updated_at();


--
-- Name: marketplace_reviews trigger_update_vendor_rating_on_review; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_vendor_rating_on_review AFTER INSERT OR DELETE OR UPDATE ON public.marketplace_reviews FOR EACH ROW EXECUTE FUNCTION public.update_vendor_rating_on_review();


--
-- Name: marketplace_order_vendor_fsm vendor_fsm_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER vendor_fsm_updated BEFORE UPDATE ON public.marketplace_order_vendor_fsm FOR EACH ROW EXECUTE FUNCTION public.update_fsm_last_updated();


--
-- Name: wallet_payments wallet_payments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER wallet_payments_updated_at BEFORE UPDATE ON public.wallet_payments FOR EACH ROW EXECUTE FUNCTION public.update_wallet_payment_timestamp();


--
-- Name: admin_logs admin_logs_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_logs
    ADD CONSTRAINT admin_logs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: backups backups_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backups
    ADD CONSTRAINT backups_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: balance_holds balance_holds_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.balance_holds
    ADD CONSTRAINT balance_holds_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.balance_transactions(id);


--
-- Name: balance_holds balance_holds_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.balance_holds
    ADD CONSTRAINT balance_holds_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: balance_transactions balance_transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.balance_transactions
    ADD CONSTRAINT balance_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: bids bids_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bids
    ADD CONSTRAINT bids_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: bids bids_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bids
    ADD CONSTRAINT bids_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: cart_items cart_items_cart_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES public.shopping_carts(id) ON DELETE CASCADE;


--
-- Name: cart_items cart_items_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;


--
-- Name: categories categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: crypto_transactions crypto_transactions_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crypto_transactions
    ADD CONSTRAINT crypto_transactions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: crypto_transactions crypto_transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crypto_transactions
    ADD CONSTRAINT crypto_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: driver_locations driver_locations_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.driver_locations
    ADD CONSTRAINT driver_locations_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: email_verification_tokens email_verification_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_verification_tokens
    ADD CONSTRAINT email_verification_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: emergency_transfer_notifications emergency_transfer_notifications_transfer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emergency_transfer_notifications
    ADD CONSTRAINT emergency_transfer_notifications_transfer_id_fkey FOREIGN KEY (transfer_id) REFERENCES public.emergency_transfers(id);


--
-- Name: emergency_transfers emergency_transfers_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emergency_transfers
    ADD CONSTRAINT emergency_transfers_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: fcm_tokens fcm_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fcm_tokens
    ADD CONSTRAINT fcm_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: takaful_contributions fk_contrib_order; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.takaful_contributions
    ADD CONSTRAINT fk_contrib_order FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;


--
-- Name: fsm_action_log fsm_action_log_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fsm_action_log
    ADD CONSTRAINT fsm_action_log_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.marketplace_orders(id) ON DELETE CASCADE;


--
-- Name: items items_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: items items_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: location_updates location_updates_driver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.location_updates
    ADD CONSTRAINT location_updates_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.users(id);


--
-- Name: location_updates location_updates_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.location_updates
    ADD CONSTRAINT location_updates_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: logs logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logs
    ADD CONSTRAINT logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: marketplace_audit_logs marketplace_audit_logs_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_audit_logs
    ADD CONSTRAINT marketplace_audit_logs_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.marketplace_orders(id) ON DELETE SET NULL;


--
-- Name: marketplace_audit_logs marketplace_audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_audit_logs
    ADD CONSTRAINT marketplace_audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: marketplace_audit_logs marketplace_audit_logs_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_audit_logs
    ADD CONSTRAINT marketplace_audit_logs_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE SET NULL;


--
-- Name: marketplace_order_delivery_fsm marketplace_order_delivery_fsm_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_order_delivery_fsm
    ADD CONSTRAINT marketplace_order_delivery_fsm_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.marketplace_orders(id) ON DELETE CASCADE;


--
-- Name: marketplace_order_items marketplace_order_items_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_order_items
    ADD CONSTRAINT marketplace_order_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;


--
-- Name: marketplace_order_items marketplace_order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_order_items
    ADD CONSTRAINT marketplace_order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.marketplace_orders(id) ON DELETE CASCADE;


--
-- Name: marketplace_order_payment_fsm marketplace_order_payment_fsm_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_order_payment_fsm
    ADD CONSTRAINT marketplace_order_payment_fsm_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.marketplace_orders(id) ON DELETE CASCADE;


--
-- Name: marketplace_order_vendor_fsm marketplace_order_vendor_fsm_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_order_vendor_fsm
    ADD CONSTRAINT marketplace_order_vendor_fsm_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.marketplace_orders(id) ON DELETE CASCADE;


--
-- Name: marketplace_orders marketplace_orders_cart_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_orders
    ADD CONSTRAINT marketplace_orders_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES public.shopping_carts(id) ON DELETE CASCADE;


--
-- Name: marketplace_orders marketplace_orders_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_orders
    ADD CONSTRAINT marketplace_orders_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: marketplace_orders marketplace_orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_orders
    ADD CONSTRAINT marketplace_orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: marketplace_orders marketplace_orders_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_orders
    ADD CONSTRAINT marketplace_orders_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;


--
-- Name: marketplace_reviews marketplace_reviews_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_reviews
    ADD CONSTRAINT marketplace_reviews_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.marketplace_orders(id) ON DELETE CASCADE;


--
-- Name: marketplace_reviews marketplace_reviews_reviewer_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_reviews
    ADD CONSTRAINT marketplace_reviews_reviewer_user_id_fkey FOREIGN KEY (reviewer_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: marketplace_reviews marketplace_reviews_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_reviews
    ADD CONSTRAINT marketplace_reviews_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;


--
-- Name: marketplace_reviews marketplace_reviews_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_reviews
    ADD CONSTRAINT marketplace_reviews_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;


--
-- Name: messages messages_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: messages messages_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.users(id);


--
-- Name: messages messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id);


--
-- Name: notifications notifications_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: offers offers_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offers
    ADD CONSTRAINT offers_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;


--
-- Name: orders orders_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.users(id);


--
-- Name: orders orders_emergency_transfer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_emergency_transfer_id_fkey FOREIGN KEY (emergency_transfer_id) REFERENCES public.emergency_transfers(id);


--
-- Name: password_reset_tokens password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: payments payments_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: payments payments_payer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_payer_id_fkey FOREIGN KEY (payer_id) REFERENCES public.users(id);


--
-- Name: platform_revenue platform_revenue_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_revenue
    ADD CONSTRAINT platform_revenue_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: platform_review_flags platform_review_flags_review_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_review_flags
    ADD CONSTRAINT platform_review_flags_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.platform_reviews(id) ON DELETE CASCADE;


--
-- Name: platform_review_flags platform_review_flags_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_review_flags
    ADD CONSTRAINT platform_review_flags_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: platform_review_votes platform_review_votes_review_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_review_votes
    ADD CONSTRAINT platform_review_votes_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.platform_reviews(id) ON DELETE CASCADE;


--
-- Name: platform_review_votes platform_review_votes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_review_votes
    ADD CONSTRAINT platform_review_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: platform_reviews platform_reviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_reviews
    ADD CONSTRAINT platform_reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: referral_conversions referral_conversions_referral_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_conversions
    ADD CONSTRAINT referral_conversions_referral_code_fkey FOREIGN KEY (referral_code) REFERENCES public.referral_links(code);


--
-- Name: referral_earnings referral_earnings_referrer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_earnings
    ADD CONSTRAINT referral_earnings_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES public.users(id);


--
-- Name: referral_payouts referral_payouts_referrer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_payouts
    ADD CONSTRAINT referral_payouts_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES public.users(id);


--
-- Name: review_flags review_flags_review_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_flags
    ADD CONSTRAINT review_flags_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.reviews(id) ON DELETE CASCADE;


--
-- Name: review_flags review_flags_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_flags
    ADD CONSTRAINT review_flags_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: review_votes review_votes_review_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_votes
    ADD CONSTRAINT review_votes_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.reviews(id) ON DELETE CASCADE;


--
-- Name: review_votes review_votes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_votes
    ADD CONSTRAINT review_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_reviewee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_reviewee_id_fkey FOREIGN KEY (reviewee_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: reviews reviews_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: reviews reviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: shopping_carts shopping_carts_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shopping_carts
    ADD CONSTRAINT shopping_carts_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: shopping_carts shopping_carts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shopping_carts
    ADD CONSTRAINT shopping_carts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: stores stores_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stores
    ADD CONSTRAINT stores_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;


--
-- Name: system_settings system_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: takaful_loan_payments takaful_loan_payments_loan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.takaful_loan_payments
    ADD CONSTRAINT takaful_loan_payments_loan_id_fkey FOREIGN KEY (loan_id) REFERENCES public.takaful_loans(id);


--
-- Name: topup_audit_logs topup_audit_logs_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.topup_audit_logs
    ADD CONSTRAINT topup_audit_logs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.users(id);


--
-- Name: topup_audit_logs topup_audit_logs_topup_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.topup_audit_logs
    ADD CONSTRAINT topup_audit_logs_topup_id_fkey FOREIGN KEY (topup_id) REFERENCES public.topups(id);


--
-- Name: topups topups_platform_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.topups
    ADD CONSTRAINT topups_platform_wallet_id_fkey FOREIGN KEY (platform_wallet_id) REFERENCES public.platform_wallets(id);


--
-- Name: topups topups_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.topups
    ADD CONSTRAINT topups_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: topups topups_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.topups
    ADD CONSTRAINT topups_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.users(id);


--
-- Name: user_balances user_balances_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_balances
    ADD CONSTRAINT user_balances_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_favorites user_favorites_favorite_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_favorites
    ADD CONSTRAINT user_favorites_favorite_user_id_fkey FOREIGN KEY (favorite_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_favorites user_favorites_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_favorites
    ADD CONSTRAINT user_favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_payment_methods user_payment_methods_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_payment_methods
    ADD CONSTRAINT user_payment_methods_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_saved_addresses user_saved_addresses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_saved_addresses
    ADD CONSTRAINT user_saved_addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: vendor_categories vendor_categories_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_categories
    ADD CONSTRAINT vendor_categories_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;


--
-- Name: vendor_items vendor_items_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_items
    ADD CONSTRAINT vendor_items_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;


--
-- Name: vendor_payouts vendor_payouts_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_payouts
    ADD CONSTRAINT vendor_payouts_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.marketplace_orders(id) ON DELETE CASCADE;


--
-- Name: vendor_payouts vendor_payouts_processed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_payouts
    ADD CONSTRAINT vendor_payouts_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES public.users(id);


--
-- Name: vendor_payouts vendor_payouts_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_payouts
    ADD CONSTRAINT vendor_payouts_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;


--
-- Name: vendors vendors_owner_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: wallet_payments wallet_payments_confirmed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_payments
    ADD CONSTRAINT wallet_payments_confirmed_by_fkey FOREIGN KEY (confirmed_by) REFERENCES public.users(id);


--
-- Name: wallet_payments wallet_payments_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_payments
    ADD CONSTRAINT wallet_payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: withdrawal_requests withdrawal_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.withdrawal_requests
    ADD CONSTRAINT withdrawal_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 7gHmWKTlsw5cS4LDddzL0w25bblhb6D7xxUNIrgCuDGDwr8Cb12V20Q2cXAnZst

