--
-- PostgreSQL database dump
--

\restrict xV4OJk5ZsGKJwa5q43U9qSseA7Kq2chk54CfiZSSss87LxV9BmXtSvAYMYLZioM

-- Dumped from database version 15.14
-- Dumped by pg_dump version 15.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


--
-- Name: topology; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA topology;


ALTER SCHEMA topology OWNER TO postgres;

--
-- Name: SCHEMA topology; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA topology IS 'PostGIS Topology schema';


--
-- Name: postgis; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;


--
-- Name: EXTENSION postgis; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION postgis IS 'PostGIS geometry and geography spatial types and functions';


--
-- Name: postgis_raster; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis_raster WITH SCHEMA public;


--
-- Name: EXTENSION postgis_raster; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION postgis_raster IS 'PostGIS raster types and functions';


--
-- Name: postgis_topology; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis_topology WITH SCHEMA topology;


--
-- Name: EXTENSION postgis_topology; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION postgis_topology IS 'PostGIS topology spatial types and functions';


--
-- Name: enum_bids_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.enum_bids_status AS ENUM (
    'pending',
    'accepted',
    'rejected'
);


ALTER TYPE public.enum_bids_status OWNER TO postgres;

--
-- Name: enum_orders_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.enum_orders_status AS ENUM (
    'pending_bids',
    'accepted',
    'picked_up',
    'in_transit',
    'delivered',
    'cancelled'
);


ALTER TYPE public.enum_orders_status OWNER TO postgres;

--
-- Name: enum_payments_payment_method; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.enum_payments_payment_method AS ENUM (
    'credit_card',
    'debit_card',
    'paypal',
    'bank_transfer',
    'cash'
);


ALTER TYPE public.enum_payments_payment_method OWNER TO postgres;

--
-- Name: enum_payments_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.enum_payments_status AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed',
    'refunded',
    'cancelled'
);


ALTER TYPE public.enum_payments_status OWNER TO postgres;

--
-- Name: enum_reviews_review_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.enum_reviews_review_type AS ENUM (
    'customer_to_driver',
    'driver_to_customer',
    'customer_to_platform',
    'driver_to_platform'
);


ALTER TYPE public.enum_reviews_review_type OWNER TO postgres;

--
-- Name: enum_users_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.enum_users_role AS ENUM (
    'customer',
    'driver',
    'admin',
    'vendor'
);


ALTER TYPE public.enum_users_role OWNER TO postgres;

--
-- Name: cleanup_old_health_logs(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.cleanup_old_health_logs() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    DELETE FROM system_health_logs WHERE timestamp < NOW() - INTERVAL '3 days';
END;
$$;


ALTER FUNCTION public.cleanup_old_health_logs() OWNER TO postgres;

--
-- Name: update_balance_transaction_timestamp(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_balance_transaction_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_balance_transaction_timestamp() OWNER TO postgres;

--
-- Name: update_timestamp(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_timestamp() OWNER TO postgres;

--
-- Name: update_wallet_payment_timestamp(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_wallet_payment_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_wallet_payment_timestamp() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: SequelizeMeta; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SequelizeMeta" (
    name character varying(255) NOT NULL
);


ALTER TABLE public."SequelizeMeta" OWNER TO postgres;

--
-- Name: admin_logs; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.admin_logs OWNER TO postgres;

--
-- Name: admin_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.admin_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.admin_logs_id_seq OWNER TO postgres;

--
-- Name: admin_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.admin_logs_id_seq OWNED BY public.admin_logs.id;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.audit_logs_id_seq OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: backups; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.backups OWNER TO postgres;

--
-- Name: balance_holds; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.balance_holds (
    id integer NOT NULL,
    hold_id character varying(50) NOT NULL,
    user_id character varying(255) NOT NULL,
    amount numeric(12,2) NOT NULL,
    currency character varying(3) DEFAULT 'EGP'::character varying NOT NULL,
    reason character varying(100) NOT NULL,
    order_id character varying(255),
    dispute_id integer,
    transaction_id bigint,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    held_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at timestamp without time zone,
    released_at timestamp without time zone,
    released_by character varying(255),
    description text,
    notes text,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT positive_amount CHECK ((amount > (0)::numeric)),
    CONSTRAINT valid_status CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'released'::character varying, 'captured'::character varying, 'expired'::character varying, 'cancelled'::character varying])::text[])))
);


ALTER TABLE public.balance_holds OWNER TO postgres;

--
-- Name: TABLE balance_holds; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.balance_holds IS 'Tracks temporary holds on user balances for pending transactions';


--
-- Name: balance_holds_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.balance_holds_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.balance_holds_id_seq OWNER TO postgres;

--
-- Name: balance_holds_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.balance_holds_id_seq OWNED BY public.balance_holds.id;


--
-- Name: balance_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.balance_transactions (
    id bigint NOT NULL,
    transaction_id character varying(50) NOT NULL,
    user_id character varying(255) NOT NULL,
    type character varying(30) NOT NULL,
    amount numeric(12,2) NOT NULL,
    currency character varying(3) DEFAULT 'EGP'::character varying NOT NULL,
    balance_before numeric(12,2) NOT NULL,
    balance_after numeric(12,2) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    order_id character varying(255),
    wallet_payment_id integer,
    withdrawal_request_id integer,
    related_transaction_id bigint,
    processed_at timestamp without time zone,
    processed_by character varying(255),
    processing_method character varying(50),
    description text NOT NULL,
    metadata jsonb,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    ip_address inet,
    user_agent text,
    CONSTRAINT non_zero_amount CHECK ((amount <> (0)::numeric)),
    CONSTRAINT valid_status CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'completed'::character varying, 'failed'::character varying, 'reversed'::character varying, 'cancelled'::character varying])::text[]))),
    CONSTRAINT valid_transaction_type CHECK (((type)::text = ANY ((ARRAY['deposit'::character varying, 'withdrawal'::character varying, 'order_payment'::character varying, 'order_refund'::character varying, 'earnings'::character varying, 'commission_deduction'::character varying, 'bonus'::character varying, 'cashback'::character varying, 'penalty'::character varying, 'adjustment'::character varying, 'hold'::character varying, 'release'::character varying, 'fee'::character varying, 'reversal'::character varying])::text[])))
);


ALTER TABLE public.balance_transactions OWNER TO postgres;

--
-- Name: TABLE balance_transactions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.balance_transactions IS 'Records all balance-related transactions for audit trail and history';


--
-- Name: COLUMN balance_transactions.transaction_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.balance_transactions.transaction_id IS 'Unique UUID for each transaction';


--
-- Name: COLUMN balance_transactions.balance_before; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.balance_transactions.balance_before IS 'Snapshot of balance before transaction';


--
-- Name: COLUMN balance_transactions.balance_after; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.balance_transactions.balance_after IS 'Snapshot of balance after transaction';


--
-- Name: balance_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.balance_transactions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.balance_transactions_id_seq OWNER TO postgres;

--
-- Name: balance_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.balance_transactions_id_seq OWNED BY public.balance_transactions.id;


--
-- Name: bids; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bids (
    id integer NOT NULL,
    order_id character varying(255),
    user_id character varying(255),
    driver_name character varying(255),
    bid_price numeric(10,2),
    estimated_pickup_time timestamp without time zone,
    estimated_delivery_time timestamp without time zone,
    message text,
    driver_location_lat numeric(10,8),
    driver_location_lng numeric(10,8),
    status character varying(20) DEFAULT 'pending'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.bids OWNER TO postgres;

--
-- Name: bids_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.bids_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.bids_id_seq OWNER TO postgres;

--
-- Name: bids_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.bids_id_seq OWNED BY public.bids.id;


--
-- Name: coordinate_mappings; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.coordinate_mappings OWNER TO postgres;

--
-- Name: coordinate_mappings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.coordinate_mappings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.coordinate_mappings_id_seq OWNER TO postgres;

--
-- Name: coordinate_mappings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.coordinate_mappings_id_seq OWNED BY public.coordinate_mappings.id;


--
-- Name: crypto_transactions; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.crypto_transactions OWNER TO postgres;

--
-- Name: TABLE crypto_transactions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.crypto_transactions IS 'All cryptocurrency transactions';


--
-- Name: delivery_agent_preferences; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.delivery_agent_preferences (
    id integer NOT NULL,
    agent_id character varying(255) NOT NULL,
    max_distance_km numeric(10,2) DEFAULT 50.00,
    accept_remote_areas boolean DEFAULT false,
    accept_international boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.delivery_agent_preferences OWNER TO postgres;

--
-- Name: delivery_agent_preferences_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.delivery_agent_preferences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.delivery_agent_preferences_id_seq OWNER TO postgres;

--
-- Name: delivery_agent_preferences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.delivery_agent_preferences_id_seq OWNED BY public.delivery_agent_preferences.id;


--
-- Name: driver_locations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.driver_locations (
    id integer NOT NULL,
    driver_id character varying(255) NOT NULL,
    latitude numeric(10,8) NOT NULL,
    longitude numeric(11,8) NOT NULL,
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    order_id character varying(255),
    heading numeric(5,2),
    speed_kmh numeric(5,2),
    accuracy_meters numeric(8,2),
    context character varying(50) DEFAULT 'idle'::character varying
);


ALTER TABLE public.driver_locations OWNER TO postgres;

--
-- Name: driver_locations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.driver_locations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.driver_locations_id_seq OWNER TO postgres;

--
-- Name: driver_locations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.driver_locations_id_seq OWNED BY public.driver_locations.id;


--
-- Name: email_verification_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.email_verification_tokens (
    id character varying(255) NOT NULL,
    user_id character varying(255) NOT NULL,
    token character varying(255) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    used boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.email_verification_tokens OWNER TO postgres;

--
-- Name: emergency_transfer_notifications; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.emergency_transfer_notifications OWNER TO postgres;

--
-- Name: emergency_transfer_notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.emergency_transfer_notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.emergency_transfer_notifications_id_seq OWNER TO postgres;

--
-- Name: emergency_transfer_notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.emergency_transfer_notifications_id_seq OWNED BY public.emergency_transfer_notifications.id;


--
-- Name: emergency_transfers; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.emergency_transfers OWNER TO postgres;

--
-- Name: TABLE emergency_transfers; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.emergency_transfers IS 'Tracks order transfers when drivers cannot complete after pickup';


--
-- Name: COLUMN emergency_transfers.emergency_bonus; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.emergency_transfers.emergency_bonus IS '20% of original fee, paid from Takaful fund';


--
-- Name: COLUMN emergency_transfers.timeout_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.emergency_transfers.timeout_at IS '30 minutes from creation - after which escalates to admin';


--
-- Name: emergency_transfers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.emergency_transfers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.emergency_transfers_id_seq OWNER TO postgres;

--
-- Name: emergency_transfers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.emergency_transfers_id_seq OWNED BY public.emergency_transfers.id;


--
-- Name: location_cache; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.location_cache (
    cache_key character varying(255) NOT NULL,
    payload jsonb NOT NULL,
    expires_at timestamp without time zone NOT NULL
);


ALTER TABLE public.location_cache OWNER TO postgres;

--
-- Name: location_updates; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.location_updates OWNER TO postgres;

--
-- Name: location_updates_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.location_updates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.location_updates_id_seq OWNER TO postgres;

--
-- Name: location_updates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.location_updates_id_seq OWNED BY public.location_updates.id;


--
-- Name: locations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.locations (
    id integer NOT NULL,
    country character varying(100) NOT NULL,
    city character varying(100) NOT NULL,
    area character varying(100) NOT NULL,
    street character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.locations OWNER TO postgres;

--
-- Name: locations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.locations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.locations_id_seq OWNER TO postgres;

--
-- Name: locations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.locations_id_seq OWNED BY public.locations.id;


--
-- Name: logs; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.logs OWNER TO postgres;

--
-- Name: logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.logs_id_seq OWNER TO postgres;

--
-- Name: logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.logs_id_seq OWNED BY public.logs.id;


--
-- Name: messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.messages (
    id character varying(255) NOT NULL,
    order_id character varying(255) NOT NULL,
    sender_id character varying(255) NOT NULL,
    recipient_id character varying(255) NOT NULL,
    content text NOT NULL,
    message_type character varying(50) DEFAULT 'text'::character varying,
    is_read boolean DEFAULT false,
    read_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    media_url text,
    media_type character varying(50),
    media_size integer,
    media_duration integer,
    thumbnail_url text
);


ALTER TABLE public.messages OWNER TO postgres;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id character varying(255),
    order_id character varying(255),
    type character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.notifications_id_seq OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orders (
    id character varying(255) NOT NULL,
    customer_id character varying(255),
    driver_id character varying(255),
    total_amount numeric(10,2),
    status character varying(50),
    title character varying(255),
    description text,
    pickup_address text,
    delivery_address text,
    from_lat numeric(10,8),
    from_lng numeric(10,8),
    to_lat numeric(10,8),
    to_lng numeric(10,8),
    from_coordinates character varying(100),
    to_coordinates character varying(100),
    pickup_coordinates jsonb,
    delivery_coordinates jsonb,
    package_description text,
    package_weight numeric(10,2),
    estimated_value numeric(10,2),
    special_instructions text,
    price numeric(10,2),
    order_number character varying(50),
    assigned_driver_user_id character varying(255),
    assigned_driver_name character varying(255),
    assigned_driver_bid_price numeric(10,2),
    accepted_at timestamp without time zone,
    picked_up_at timestamp without time zone,
    delivered_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    pickup_location_link text,
    delivery_location_link text,
    estimated_distance_km numeric(10,2),
    estimated_duration_minutes integer,
    route_polyline text,
    is_remote_area boolean DEFAULT false,
    is_international boolean DEFAULT false,
    pickup_contact_name character varying(255),
    pickup_contact_phone character varying(50),
    dropoff_contact_name character varying(255),
    dropoff_contact_phone character varying(50),
    customer_name character varying(255),
    estimated_delivery_date timestamp without time zone,
    completed_at timestamp without time zone,
    cancelled_at timestamp without time zone,
    is_emergency_transfer boolean DEFAULT false,
    emergency_transfer_id integer,
    upfront_payment numeric(10,2) DEFAULT 0,
    escrow_amount numeric(10,2),
    escrow_status text DEFAULT 'none'::text,
    driver_distance_traveled_km numeric(10,3),
    cancellation_reason text,
    cancellation_fee numeric(10,2) DEFAULT 0,
    cancelled_by text,
    upfront_paid_by_driver boolean DEFAULT false
);


ALTER TABLE public.orders OWNER TO postgres;

--
-- Name: COLUMN orders.upfront_payment; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.orders.upfront_payment IS 'Amount customer pays upfront for driver to purchase items (default 0)';


--
-- Name: COLUMN orders.escrow_amount; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.orders.escrow_amount IS 'Total amount held in escrow (upfront + delivery fee)';


--
-- Name: COLUMN orders.escrow_status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.orders.escrow_status IS 'Status of escrow: none, held, released, forfeited';


--
-- Name: COLUMN orders.driver_distance_traveled_km; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.orders.driver_distance_traveled_km IS 'Distance driver traveled (used for compensation on cancellation)';


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.password_reset_tokens (
    id character varying(255) NOT NULL,
    user_id character varying(255) NOT NULL,
    token character varying(255) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    used boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.password_reset_tokens OWNER TO postgres;

--
-- Name: payments; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.payments OWNER TO postgres;

--
-- Name: COLUMN payments.paymob_transaction_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.payments.paymob_transaction_id IS 'Paymob transaction ID for tracking';


--
-- Name: COLUMN payments.paymob_order_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.payments.paymob_order_id IS 'Paymob order ID for reference';


--
-- Name: platform_revenue; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.platform_revenue OWNER TO postgres;

--
-- Name: TABLE platform_revenue; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.platform_revenue IS 'Tracks platform commission revenue from all payment methods';


--
-- Name: platform_revenue_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.platform_revenue_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.platform_revenue_id_seq OWNER TO postgres;

--
-- Name: platform_revenue_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.platform_revenue_id_seq OWNED BY public.platform_revenue.id;


--
-- Name: platform_review_flags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.platform_review_flags (
    review_id uuid NOT NULL,
    user_id character varying(255) NOT NULL,
    reason character varying(255),
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.platform_review_flags OWNER TO postgres;

--
-- Name: platform_review_votes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.platform_review_votes (
    review_id uuid NOT NULL,
    user_id character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.platform_review_votes OWNER TO postgres;

--
-- Name: platform_reviews; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.platform_reviews OWNER TO postgres;

--
-- Name: platform_wallets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.platform_wallets (
    id integer NOT NULL,
    wallet_type character varying(50) NOT NULL,
    phone_number character varying(20) NOT NULL,
    wallet_name character varying(255) NOT NULL,
    is_active boolean DEFAULT true,
    daily_limit numeric(10,2),
    monthly_limit numeric(10,2),
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.platform_wallets OWNER TO postgres;

--
-- Name: platform_wallets_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.platform_wallets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.platform_wallets_id_seq OWNER TO postgres;

--
-- Name: platform_wallets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.platform_wallets_id_seq OWNED BY public.platform_wallets.id;


--
-- Name: review_flags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.review_flags (
    review_id uuid NOT NULL,
    user_id character varying(255) NOT NULL,
    reason character varying(255),
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.review_flags OWNER TO postgres;

--
-- Name: review_votes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.review_votes (
    review_id uuid NOT NULL,
    user_id character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.review_votes OWNER TO postgres;

--
-- Name: reviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reviews (
    id integer NOT NULL,
    order_id character varying(255),
    reviewer_id character varying(255),
    reviewee_id character varying(255),
    rating integer,
    comment text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    upvotes integer DEFAULT 0,
    flag_count integer DEFAULT 0,
    user_id character varying(255),
    is_approved boolean DEFAULT true,
    is_featured boolean DEFAULT false,
    professionalism_rating integer,
    communication_rating integer,
    timeliness_rating integer,
    package_condition_rating integer,
    review_type character varying(50) NOT NULL,
    reviewer_role character varying(50) NOT NULL,
    CONSTRAINT reviews_communication_rating_check CHECK (((communication_rating >= 1) AND (communication_rating <= 5))),
    CONSTRAINT reviews_package_condition_rating_check CHECK (((package_condition_rating >= 1) AND (package_condition_rating <= 5))),
    CONSTRAINT reviews_professionalism_rating_check CHECK (((professionalism_rating >= 1) AND (professionalism_rating <= 5))),
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5))),
    CONSTRAINT reviews_review_type_check CHECK (((review_type)::text = ANY ((ARRAY['customer_to_driver'::character varying, 'driver_to_customer'::character varying, 'customer_to_platform'::character varying, 'driver_to_platform'::character varying])::text[]))),
    CONSTRAINT reviews_timeliness_rating_check CHECK (((timeliness_rating >= 1) AND (timeliness_rating <= 5)))
);


ALTER TABLE public.reviews OWNER TO postgres;

--
-- Name: reviews_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.reviews_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.reviews_id_seq OWNER TO postgres;

--
-- Name: reviews_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.reviews_id_seq OWNED BY public.reviews.id;


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.schema_migrations (
    id integer NOT NULL,
    migration_name character varying(255) NOT NULL,
    applied_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    checksum character varying(64),
    execution_time_ms integer
);


ALTER TABLE public.schema_migrations OWNER TO postgres;

--
-- Name: schema_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.schema_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.schema_migrations_id_seq OWNER TO postgres;

--
-- Name: schema_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.schema_migrations_id_seq OWNED BY public.schema_migrations.id;


--
-- Name: system_health_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_health_logs (
    id integer NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now(),
    memory_percent numeric(5,2),
    memory_used_mb integer,
    memory_available_mb integer,
    pm2_total_memory_mb integer,
    pm2_processes jsonb,
    active_ws_connections integer DEFAULT 0
);


ALTER TABLE public.system_health_logs OWNER TO postgres;

--
-- Name: system_health_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.system_health_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.system_health_logs_id_seq OWNER TO postgres;

--
-- Name: system_health_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.system_health_logs_id_seq OWNED BY public.system_health_logs.id;


--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_settings (
    key character varying(100) NOT NULL,
    value text NOT NULL,
    type character varying(50) DEFAULT 'string'::character varying,
    description text,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by character varying(255)
);


ALTER TABLE public.system_settings OWNER TO postgres;

--
-- Name: user_balances; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_balances (
    user_id character varying(255) NOT NULL,
    available_balance numeric(12,2) DEFAULT 0.00 NOT NULL,
    pending_balance numeric(12,2) DEFAULT 0.00 NOT NULL,
    held_balance numeric(12,2) DEFAULT 0.00 NOT NULL,
    total_balance numeric(12,2) GENERATED ALWAYS AS (((available_balance + pending_balance) + held_balance)) STORED,
    currency character varying(3) DEFAULT 'EGP'::character varying NOT NULL,
    daily_withdrawal_limit numeric(12,2) DEFAULT 5000.00,
    monthly_withdrawal_limit numeric(12,2) DEFAULT 50000.00,
    minimum_balance numeric(12,2) DEFAULT 0.00,
    auto_reload_threshold numeric(12,2),
    auto_reload_amount numeric(12,2),
    lifetime_deposits numeric(12,2) DEFAULT 0.00 NOT NULL,
    lifetime_withdrawals numeric(12,2) DEFAULT 0.00 NOT NULL,
    lifetime_earnings numeric(12,2) DEFAULT 0.00 NOT NULL,
    total_transactions integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_frozen boolean DEFAULT false NOT NULL,
    freeze_reason text,
    frozen_at timestamp without time zone,
    frozen_by character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_transaction_at timestamp without time zone,
    CONSTRAINT positive_held_balance CHECK ((held_balance >= (0)::numeric)),
    CONSTRAINT positive_pending_balance CHECK ((pending_balance >= (0)::numeric)),
    CONSTRAINT valid_currency CHECK (((currency)::text = ANY ((ARRAY['EGP'::character varying, 'USD'::character varying, 'EUR'::character varying, 'SAR'::character varying, 'AED'::character varying])::text[]))),
    CONSTRAINT valid_limits CHECK (((daily_withdrawal_limit >= (0)::numeric) AND (monthly_withdrawal_limit >= daily_withdrawal_limit)))
);


ALTER TABLE public.user_balances OWNER TO postgres;

--
-- Name: user_favorites; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_favorites (
    user_id character varying(255) NOT NULL,
    favorite_user_id character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_favorites OWNER TO postgres;

--
-- Name: user_payment_methods; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.user_payment_methods OWNER TO postgres;

--
-- Name: user_payment_methods_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_payment_methods_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.user_payment_methods_id_seq OWNER TO postgres;

--
-- Name: user_payment_methods_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_payment_methods_id_seq OWNED BY public.user_payment_methods.id;


--
-- Name: user_saved_addresses; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.user_saved_addresses OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255),
    phone character varying(20),
    primary_role character varying(20) NOT NULL,
    granted_roles character varying(20)[] DEFAULT ARRAY[]::character varying[],
    is_verified boolean DEFAULT false,
    is_available boolean DEFAULT true,
    country character varying(100),
    city character varying(100),
    area character varying(100),
    vehicle_type character varying(50),
    gender character varying(10) DEFAULT 'male'::character varying,
    rating numeric(3,2) DEFAULT 0.00,
    completed_deliveries integer DEFAULT 0,
    total_ratings integer DEFAULT 0,
    language character varying(10) DEFAULT 'en'::character varying,
    theme character varying(20) DEFAULT 'light'::character varying,
    license_number character varying(50),
    service_area_zone character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_active timestamp without time zone,
    profile_picture_url text,
    preferences jsonb,
    notification_prefs jsonb,
    two_factor_methods jsonb,
    document_verification_status character varying(50),
    available_cash numeric(10,2) DEFAULT 0,
    cash_currency text DEFAULT 'EGP'::text
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: COLUMN users.available_cash; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.available_cash IS 'Cash the driver has available for upfront payments';


--
-- Name: users_backup_role_migration; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users_backup_role_migration (
    id character varying(255),
    name character varying(255),
    email character varying(255),
    password character varying(255),
    phone character varying(50),
    role character varying(50),
    roles text[],
    vehicle_type character varying(100),
    rating numeric(3,2),
    completed_deliveries integer,
    is_available boolean,
    is_verified boolean,
    last_login_at timestamp without time zone,
    preferences jsonb,
    notification_prefs jsonb,
    metadata jsonb,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    profile_picture_url text,
    license_number character varying(100),
    service_area_zone character varying(255),
    two_factor_methods jsonb,
    language character varying(20),
    theme character varying(20),
    document_verification_status character varying(50),
    verified_at timestamp without time zone,
    country character varying(100),
    city character varying(100),
    area character varying(100),
    wallet_address character varying(255),
    wallet_verified boolean,
    wallet_connected_at timestamp without time zone
);


ALTER TABLE public.users_backup_role_migration OWNER TO postgres;

--
-- Name: vendor_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vendor_categories (
    id integer NOT NULL,
    vendor_id character varying(255) NOT NULL,
    name character varying(100) NOT NULL
);


ALTER TABLE public.vendor_categories OWNER TO postgres;

--
-- Name: vendor_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.vendor_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.vendor_categories_id_seq OWNER TO postgres;

--
-- Name: vendor_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.vendor_categories_id_seq OWNED BY public.vendor_categories.id;


--
-- Name: vendor_items; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.vendor_items OWNER TO postgres;

--
-- Name: vendors; Type: TABLE; Schema: public; Owner: postgres
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
    owner_user_id character varying(255)
);


ALTER TABLE public.vendors OWNER TO postgres;

--
-- Name: wallet_payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wallet_payments (
    id integer NOT NULL,
    order_id character varying(255),
    amount numeric(10,2),
    status character varying(20),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    wallet_type character varying(50) DEFAULT 'vodafone_cash'::character varying NOT NULL,
    transaction_reference character varying(100),
    currency character varying(3) DEFAULT 'EGP'::character varying,
    screenshot_url character varying(500),
    CONSTRAINT valid_wallet_type CHECK (((wallet_type)::text = ANY ((ARRAY['vodafone_cash'::character varying, 'instapay'::character varying, 'orange_cash'::character varying, 'etisalat_cash'::character varying, 'we_pay'::character varying])::text[])))
);


ALTER TABLE public.wallet_payments OWNER TO postgres;

--
-- Name: wallet_payments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.wallet_payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.wallet_payments_id_seq OWNER TO postgres;

--
-- Name: wallet_payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.wallet_payments_id_seq OWNED BY public.wallet_payments.id;


--
-- Name: admin_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_logs ALTER COLUMN id SET DEFAULT nextval('public.admin_logs_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: balance_holds id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.balance_holds ALTER COLUMN id SET DEFAULT nextval('public.balance_holds_id_seq'::regclass);


--
-- Name: balance_transactions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.balance_transactions ALTER COLUMN id SET DEFAULT nextval('public.balance_transactions_id_seq'::regclass);


--
-- Name: bids id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bids ALTER COLUMN id SET DEFAULT nextval('public.bids_id_seq'::regclass);


--
-- Name: coordinate_mappings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coordinate_mappings ALTER COLUMN id SET DEFAULT nextval('public.coordinate_mappings_id_seq'::regclass);


--
-- Name: delivery_agent_preferences id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_agent_preferences ALTER COLUMN id SET DEFAULT nextval('public.delivery_agent_preferences_id_seq'::regclass);


--
-- Name: driver_locations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.driver_locations ALTER COLUMN id SET DEFAULT nextval('public.driver_locations_id_seq'::regclass);


--
-- Name: emergency_transfer_notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emergency_transfer_notifications ALTER COLUMN id SET DEFAULT nextval('public.emergency_transfer_notifications_id_seq'::regclass);


--
-- Name: emergency_transfers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emergency_transfers ALTER COLUMN id SET DEFAULT nextval('public.emergency_transfers_id_seq'::regclass);


--
-- Name: location_updates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.location_updates ALTER COLUMN id SET DEFAULT nextval('public.location_updates_id_seq'::regclass);


--
-- Name: locations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.locations ALTER COLUMN id SET DEFAULT nextval('public.locations_id_seq'::regclass);


--
-- Name: logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.logs ALTER COLUMN id SET DEFAULT nextval('public.logs_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: platform_revenue id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.platform_revenue ALTER COLUMN id SET DEFAULT nextval('public.platform_revenue_id_seq'::regclass);


--
-- Name: platform_wallets id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.platform_wallets ALTER COLUMN id SET DEFAULT nextval('public.platform_wallets_id_seq'::regclass);


--
-- Name: reviews id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews ALTER COLUMN id SET DEFAULT nextval('public.reviews_id_seq'::regclass);


--
-- Name: schema_migrations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schema_migrations ALTER COLUMN id SET DEFAULT nextval('public.schema_migrations_id_seq'::regclass);


--
-- Name: system_health_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_health_logs ALTER COLUMN id SET DEFAULT nextval('public.system_health_logs_id_seq'::regclass);


--
-- Name: user_payment_methods id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_payment_methods ALTER COLUMN id SET DEFAULT nextval('public.user_payment_methods_id_seq'::regclass);


--
-- Name: vendor_categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendor_categories ALTER COLUMN id SET DEFAULT nextval('public.vendor_categories_id_seq'::regclass);


--
-- Name: wallet_payments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallet_payments ALTER COLUMN id SET DEFAULT nextval('public.wallet_payments_id_seq'::regclass);


--
-- Name: SequelizeMeta SequelizeMeta_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SequelizeMeta"
    ADD CONSTRAINT "SequelizeMeta_pkey" PRIMARY KEY (name);


--
-- Name: admin_logs admin_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_logs
    ADD CONSTRAINT admin_logs_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: backups backups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.backups
    ADD CONSTRAINT backups_pkey PRIMARY KEY (id);


--
-- Name: balance_holds balance_holds_hold_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.balance_holds
    ADD CONSTRAINT balance_holds_hold_id_key UNIQUE (hold_id);


--
-- Name: balance_holds balance_holds_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.balance_holds
    ADD CONSTRAINT balance_holds_pkey PRIMARY KEY (id);


--
-- Name: balance_transactions balance_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.balance_transactions
    ADD CONSTRAINT balance_transactions_pkey PRIMARY KEY (id);


--
-- Name: balance_transactions balance_transactions_transaction_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.balance_transactions
    ADD CONSTRAINT balance_transactions_transaction_id_key UNIQUE (transaction_id);


--
-- Name: bids bids_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bids
    ADD CONSTRAINT bids_pkey PRIMARY KEY (id);


--
-- Name: coordinate_mappings coordinate_mappings_location_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coordinate_mappings
    ADD CONSTRAINT coordinate_mappings_location_key_key UNIQUE (location_key);


--
-- Name: coordinate_mappings coordinate_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coordinate_mappings
    ADD CONSTRAINT coordinate_mappings_pkey PRIMARY KEY (id);


--
-- Name: crypto_transactions crypto_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crypto_transactions
    ADD CONSTRAINT crypto_transactions_pkey PRIMARY KEY (id);


--
-- Name: crypto_transactions crypto_transactions_tx_hash_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crypto_transactions
    ADD CONSTRAINT crypto_transactions_tx_hash_key UNIQUE (tx_hash);


--
-- Name: delivery_agent_preferences delivery_agent_preferences_agent_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_agent_preferences
    ADD CONSTRAINT delivery_agent_preferences_agent_id_key UNIQUE (agent_id);


--
-- Name: delivery_agent_preferences delivery_agent_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_agent_preferences
    ADD CONSTRAINT delivery_agent_preferences_pkey PRIMARY KEY (id);


--
-- Name: driver_locations driver_locations_driver_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.driver_locations
    ADD CONSTRAINT driver_locations_driver_id_key UNIQUE (driver_id);


--
-- Name: driver_locations driver_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.driver_locations
    ADD CONSTRAINT driver_locations_pkey PRIMARY KEY (id);


--
-- Name: email_verification_tokens email_verification_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_verification_tokens
    ADD CONSTRAINT email_verification_tokens_pkey PRIMARY KEY (id);


--
-- Name: email_verification_tokens email_verification_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_verification_tokens
    ADD CONSTRAINT email_verification_tokens_token_key UNIQUE (token);


--
-- Name: emergency_transfer_notifications emergency_transfer_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emergency_transfer_notifications
    ADD CONSTRAINT emergency_transfer_notifications_pkey PRIMARY KEY (id);


--
-- Name: emergency_transfers emergency_transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emergency_transfers
    ADD CONSTRAINT emergency_transfers_pkey PRIMARY KEY (id);


--
-- Name: location_cache location_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.location_cache
    ADD CONSTRAINT location_cache_pkey PRIMARY KEY (cache_key);


--
-- Name: location_updates location_updates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.location_updates
    ADD CONSTRAINT location_updates_pkey PRIMARY KEY (id);


--
-- Name: locations locations_country_city_area_street_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_country_city_area_street_key UNIQUE (country, city, area, street);


--
-- Name: locations locations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_pkey PRIMARY KEY (id);


--
-- Name: logs logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.logs
    ADD CONSTRAINT logs_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key UNIQUE (token);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: platform_revenue platform_revenue_order_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.platform_revenue
    ADD CONSTRAINT platform_revenue_order_id_key UNIQUE (order_id);


--
-- Name: platform_revenue platform_revenue_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.platform_revenue
    ADD CONSTRAINT platform_revenue_pkey PRIMARY KEY (id);


--
-- Name: platform_review_flags platform_review_flags_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.platform_review_flags
    ADD CONSTRAINT platform_review_flags_pkey PRIMARY KEY (review_id, user_id);


--
-- Name: platform_review_votes platform_review_votes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.platform_review_votes
    ADD CONSTRAINT platform_review_votes_pkey PRIMARY KEY (review_id, user_id);


--
-- Name: platform_reviews platform_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.platform_reviews
    ADD CONSTRAINT platform_reviews_pkey PRIMARY KEY (id);


--
-- Name: platform_wallets platform_wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.platform_wallets
    ADD CONSTRAINT platform_wallets_pkey PRIMARY KEY (id);


--
-- Name: platform_wallets platform_wallets_wallet_type_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.platform_wallets
    ADD CONSTRAINT platform_wallets_wallet_type_key UNIQUE (wallet_type);


--
-- Name: review_flags review_flags_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.review_flags
    ADD CONSTRAINT review_flags_pkey PRIMARY KEY (review_id, user_id);


--
-- Name: review_votes review_votes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.review_votes
    ADD CONSTRAINT review_votes_pkey PRIMARY KEY (review_id, user_id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_migration_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_migration_name_key UNIQUE (migration_name);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (id);


--
-- Name: system_health_logs system_health_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_health_logs
    ADD CONSTRAINT system_health_logs_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (key);


--
-- Name: user_balances user_balances_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_balances
    ADD CONSTRAINT user_balances_pkey PRIMARY KEY (user_id);


--
-- Name: user_favorites user_favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_favorites
    ADD CONSTRAINT user_favorites_pkey PRIMARY KEY (user_id, favorite_user_id);


--
-- Name: user_payment_methods user_payment_methods_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_payment_methods
    ADD CONSTRAINT user_payment_methods_pkey PRIMARY KEY (id);


--
-- Name: user_payment_methods user_payment_methods_user_id_provider_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_payment_methods
    ADD CONSTRAINT user_payment_methods_user_id_provider_token_key UNIQUE (user_id, provider_token);


--
-- Name: user_saved_addresses user_saved_addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_saved_addresses
    ADD CONSTRAINT user_saved_addresses_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: vendor_categories vendor_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendor_categories
    ADD CONSTRAINT vendor_categories_pkey PRIMARY KEY (id);


--
-- Name: vendor_items vendor_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendor_items
    ADD CONSTRAINT vendor_items_pkey PRIMARY KEY (id);


--
-- Name: vendors vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_pkey PRIMARY KEY (id);


--
-- Name: wallet_payments wallet_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallet_payments
    ADD CONSTRAINT wallet_payments_pkey PRIMARY KEY (id);


--
-- Name: idx_admin_logs_action; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_admin_logs_action ON public.admin_logs USING btree (action);


--
-- Name: idx_admin_logs_admin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_admin_logs_admin ON public.admin_logs USING btree (admin_id);


--
-- Name: idx_admin_logs_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_admin_logs_created ON public.admin_logs USING btree (created_at);


--
-- Name: idx_audit_logs_action; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_action ON public.audit_logs USING btree (action);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at DESC);


--
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);


--
-- Name: idx_balance_holds_expires; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_balance_holds_expires ON public.balance_holds USING btree (expires_at) WHERE ((status)::text = 'active'::text);


--
-- Name: idx_balance_holds_expires_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_balance_holds_expires_at ON public.balance_holds USING btree (expires_at) WHERE ((status)::text = 'active'::text);


--
-- Name: idx_balance_holds_hold_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_balance_holds_hold_id ON public.balance_holds USING btree (hold_id);


--
-- Name: idx_balance_holds_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_balance_holds_order ON public.balance_holds USING btree (order_id) WHERE (order_id IS NOT NULL);


--
-- Name: idx_balance_holds_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_balance_holds_order_id ON public.balance_holds USING btree (order_id) WHERE (order_id IS NOT NULL);


--
-- Name: idx_balance_holds_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_balance_holds_status ON public.balance_holds USING btree (status);


--
-- Name: idx_balance_holds_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_balance_holds_user ON public.balance_holds USING btree (user_id);


--
-- Name: idx_balance_holds_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_balance_holds_user_id ON public.balance_holds USING btree (user_id);


--
-- Name: idx_balance_transactions_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_balance_transactions_created_at ON public.balance_transactions USING btree (created_at DESC);


--
-- Name: idx_balance_transactions_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_balance_transactions_order_id ON public.balance_transactions USING btree (order_id) WHERE (order_id IS NOT NULL);


--
-- Name: idx_balance_transactions_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_balance_transactions_status ON public.balance_transactions USING btree (status);


--
-- Name: idx_balance_transactions_transaction_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_balance_transactions_transaction_id ON public.balance_transactions USING btree (transaction_id);


--
-- Name: idx_balance_transactions_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_balance_transactions_type ON public.balance_transactions USING btree (type);


--
-- Name: idx_balance_transactions_user_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_balance_transactions_user_created ON public.balance_transactions USING btree (user_id, created_at DESC);


--
-- Name: idx_balance_transactions_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_balance_transactions_user_id ON public.balance_transactions USING btree (user_id);


--
-- Name: idx_balance_transactions_user_type_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_balance_transactions_user_type_created ON public.balance_transactions USING btree (user_id, type, created_at DESC);


--
-- Name: idx_balance_transactions_user_type_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_balance_transactions_user_type_status ON public.balance_transactions USING btree (user_id, type, status);


--
-- Name: idx_balance_tx_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_balance_tx_created ON public.balance_transactions USING btree (created_at DESC);


--
-- Name: idx_balance_tx_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_balance_tx_order ON public.balance_transactions USING btree (order_id) WHERE (order_id IS NOT NULL);


--
-- Name: idx_balance_tx_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_balance_tx_status ON public.balance_transactions USING btree (status);


--
-- Name: idx_balance_tx_transaction_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_balance_tx_transaction_id ON public.balance_transactions USING btree (transaction_id);


--
-- Name: idx_balance_tx_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_balance_tx_type ON public.balance_transactions USING btree (type);


--
-- Name: idx_balance_tx_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_balance_tx_user ON public.balance_transactions USING btree (user_id);


--
-- Name: idx_balance_tx_user_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_balance_tx_user_created ON public.balance_transactions USING btree (user_id, created_at DESC);


--
-- Name: idx_balance_tx_user_type_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_balance_tx_user_type_created ON public.balance_transactions USING btree (user_id, type, created_at DESC);


--
-- Name: idx_balance_tx_user_type_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_balance_tx_user_type_status ON public.balance_transactions USING btree (user_id, type, status);


--
-- Name: idx_bids_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bids_created_at ON public.bids USING btree (created_at DESC);


--
-- Name: idx_bids_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bids_order_id ON public.bids USING btree (order_id);


--
-- Name: idx_bids_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bids_status ON public.bids USING btree (status);


--
-- Name: idx_bids_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bids_user_id ON public.bids USING btree (user_id);


--
-- Name: idx_crypto_tx_hash; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_crypto_tx_hash ON public.crypto_transactions USING btree (tx_hash);


--
-- Name: idx_crypto_tx_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_crypto_tx_order ON public.crypto_transactions USING btree (order_id);


--
-- Name: idx_crypto_tx_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_crypto_tx_status ON public.crypto_transactions USING btree (status);


--
-- Name: idx_crypto_tx_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_crypto_tx_user ON public.crypto_transactions USING btree (user_id);


--
-- Name: idx_driver_locations_driver_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_driver_locations_driver_id ON public.driver_locations USING btree (driver_id);


--
-- Name: idx_driver_locations_driver_timestamp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_driver_locations_driver_timestamp ON public.driver_locations USING btree (driver_id, "timestamp" DESC);


--
-- Name: idx_driver_locations_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_driver_locations_order ON public.driver_locations USING btree (order_id);


--
-- Name: idx_driver_locations_timestamp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_driver_locations_timestamp ON public.driver_locations USING btree ("timestamp" DESC);


--
-- Name: idx_email_verification_tokens_expires_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_email_verification_tokens_expires_at ON public.email_verification_tokens USING btree (expires_at);


--
-- Name: idx_email_verification_tokens_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_email_verification_tokens_token ON public.email_verification_tokens USING btree (token);


--
-- Name: idx_email_verification_tokens_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_email_verification_tokens_user_id ON public.email_verification_tokens USING btree (user_id);


--
-- Name: idx_emergency_notif_driver; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_emergency_notif_driver ON public.emergency_transfer_notifications USING btree (driver_id);


--
-- Name: idx_emergency_notif_transfer; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_emergency_notif_transfer ON public.emergency_transfer_notifications USING btree (transfer_id);


--
-- Name: idx_emergency_transfers_new_driver; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_emergency_transfers_new_driver ON public.emergency_transfers USING btree (new_driver_id);


--
-- Name: idx_emergency_transfers_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_emergency_transfers_order ON public.emergency_transfers USING btree (order_id);


--
-- Name: idx_emergency_transfers_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_emergency_transfers_status ON public.emergency_transfers USING btree (status);


--
-- Name: idx_emergency_transfers_timeout; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_emergency_transfers_timeout ON public.emergency_transfers USING btree (timeout_at) WHERE (status = 'pending'::text);


--
-- Name: idx_health_logs_timestamp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_health_logs_timestamp ON public.system_health_logs USING btree ("timestamp" DESC);


--
-- Name: idx_location_updates_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_location_updates_created_at ON public.location_updates USING btree (created_at DESC);


--
-- Name: idx_location_updates_driver_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_location_updates_driver_id ON public.location_updates USING btree (driver_id);


--
-- Name: idx_location_updates_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_location_updates_order ON public.location_updates USING btree (order_id);


--
-- Name: idx_location_updates_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_location_updates_order_id ON public.location_updates USING btree (order_id);


--
-- Name: idx_logs_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_logs_category ON public.logs USING btree (category);


--
-- Name: idx_logs_level; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_logs_level ON public.logs USING btree (level);


--
-- Name: idx_logs_session_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_logs_session_id ON public.logs USING btree (session_id);


--
-- Name: idx_logs_source; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_logs_source ON public.logs USING btree (source);


--
-- Name: idx_logs_timestamp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_logs_timestamp ON public.logs USING btree ("timestamp" DESC);


--
-- Name: idx_logs_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_logs_user_id ON public.logs USING btree (user_id);


--
-- Name: idx_messages_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_created ON public.messages USING btree (created_at);


--
-- Name: idx_messages_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_created_at ON public.messages USING btree (created_at DESC);


--
-- Name: idx_messages_is_read; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_is_read ON public.messages USING btree (is_read);


--
-- Name: idx_messages_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_order ON public.messages USING btree (order_id);


--
-- Name: idx_messages_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_order_id ON public.messages USING btree (order_id);


--
-- Name: idx_messages_recipient; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_recipient ON public.messages USING btree (recipient_id);


--
-- Name: idx_messages_recipient_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_recipient_id ON public.messages USING btree (recipient_id);


--
-- Name: idx_messages_sender; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_sender ON public.messages USING btree (sender_id);


--
-- Name: idx_messages_sender_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_sender_id ON public.messages USING btree (sender_id);


--
-- Name: idx_migration_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_migration_name ON public.schema_migrations USING btree (migration_name);


--
-- Name: idx_notifications_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at DESC);


--
-- Name: idx_notifications_is_read; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_is_read ON public.notifications USING btree (is_read);


--
-- Name: idx_notifications_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_order_id ON public.notifications USING btree (order_id);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: idx_orders_assigned_driver_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_assigned_driver_user_id ON public.orders USING btree (assigned_driver_user_id);


--
-- Name: idx_orders_completed_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_completed_at ON public.orders USING btree (completed_at DESC);


--
-- Name: idx_orders_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_created_at ON public.orders USING btree (created_at DESC);


--
-- Name: idx_orders_customer_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_customer_id ON public.orders USING btree (customer_id);


--
-- Name: idx_orders_escrow_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_escrow_status ON public.orders USING btree (escrow_status) WHERE (escrow_status IS NOT NULL);


--
-- Name: idx_orders_order_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_order_number ON public.orders USING btree (order_number);


--
-- Name: idx_orders_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_status ON public.orders USING btree (status);


--
-- Name: idx_password_reset_tokens_expires_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_password_reset_tokens_expires_at ON public.password_reset_tokens USING btree (expires_at);


--
-- Name: idx_password_reset_tokens_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_password_reset_tokens_token ON public.password_reset_tokens USING btree (token);


--
-- Name: idx_password_reset_tokens_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_password_reset_tokens_user_id ON public.password_reset_tokens USING btree (user_id);


--
-- Name: idx_payments_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_created_at ON public.payments USING btree (created_at DESC);


--
-- Name: idx_payments_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_order_id ON public.payments USING btree (order_id);


--
-- Name: idx_payments_payer_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_payer_id ON public.payments USING btree (payer_id);


--
-- Name: idx_payments_paymob_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_paymob_order ON public.payments USING btree (paymob_order_id);


--
-- Name: idx_payments_paymob_transaction; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_paymob_transaction ON public.payments USING btree (paymob_transaction_id);


--
-- Name: idx_payments_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_status ON public.payments USING btree (status);


--
-- Name: idx_platform_revenue_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_platform_revenue_created ON public.platform_revenue USING btree (created_at);


--
-- Name: idx_platform_revenue_payment_method; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_platform_revenue_payment_method ON public.platform_revenue USING btree (payment_method);


--
-- Name: idx_platform_reviews_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_platform_reviews_created_at ON public.platform_reviews USING btree (created_at);


--
-- Name: idx_platform_reviews_flag_count; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_platform_reviews_flag_count ON public.platform_reviews USING btree (flag_count);


--
-- Name: idx_platform_reviews_is_approved; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_platform_reviews_is_approved ON public.platform_reviews USING btree (is_approved);


--
-- Name: idx_platform_reviews_upvotes; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_platform_reviews_upvotes ON public.platform_reviews USING btree (upvotes DESC);


--
-- Name: idx_platform_reviews_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_platform_reviews_user_id ON public.platform_reviews USING btree (user_id);


--
-- Name: idx_reviews_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reviews_created_at ON public.reviews USING btree (created_at);


--
-- Name: idx_reviews_flag_count; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reviews_flag_count ON public.reviews USING btree (flag_count);


--
-- Name: idx_reviews_is_approved; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reviews_is_approved ON public.reviews USING btree (is_approved);


--
-- Name: idx_reviews_upvotes; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reviews_upvotes ON public.reviews USING btree (upvotes DESC);


--
-- Name: idx_reviews_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reviews_user_id ON public.reviews USING btree (user_id);


--
-- Name: idx_user_balances_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_balances_active ON public.user_balances USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_user_balances_currency; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_balances_currency ON public.user_balances USING btree (currency);


--
-- Name: idx_user_balances_frozen; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_balances_frozen ON public.user_balances USING btree (is_frozen) WHERE (is_frozen = true);


--
-- Name: idx_user_balances_last_transaction; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_balances_last_transaction ON public.user_balances USING btree (last_transaction_at DESC);


--
-- Name: idx_user_saved_addresses_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_saved_addresses_user ON public.user_saved_addresses USING btree (user_id);


--
-- Name: idx_users_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_created_at ON public.users USING btree (created_at DESC);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_granted_roles; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_granted_roles ON public.users USING gin (granted_roles);


--
-- Name: idx_users_is_available; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_is_available ON public.users USING btree (is_available);


--
-- Name: idx_users_is_verified; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_is_verified ON public.users USING btree (is_verified);


--
-- Name: idx_users_last_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_last_active ON public.users USING btree (last_active DESC);


--
-- Name: idx_users_primary_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_primary_role ON public.users USING btree (primary_role);


--
-- Name: idx_vendor_items_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_vendor_items_category ON public.vendor_items USING btree (category);


--
-- Name: idx_vendor_items_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_vendor_items_created ON public.vendor_items USING btree (created_at);


--
-- Name: idx_vendor_items_price; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_vendor_items_price ON public.vendor_items USING btree (price);


--
-- Name: idx_vendor_items_vendor; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_vendor_items_vendor ON public.vendor_items USING btree (vendor_id);


--
-- Name: idx_vendors_city; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_vendors_city ON public.vendors USING btree (city);


--
-- Name: idx_vendors_coords; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_vendors_coords ON public.vendors USING btree (latitude, longitude);


--
-- Name: idx_vendors_owner; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_vendors_owner ON public.vendors USING btree (owner_user_id);


--
-- Name: idx_vendors_rating; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_vendors_rating ON public.vendors USING btree (rating);


--
-- Name: idx_wallet_payments_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_wallet_payments_created_at ON public.wallet_payments USING btree (created_at);


--
-- Name: idx_wallet_payments_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_wallet_payments_order_id ON public.wallet_payments USING btree (order_id);


--
-- Name: idx_wallet_payments_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_wallet_payments_status ON public.wallet_payments USING btree (status);


--
-- Name: idx_wallet_payments_transaction_ref; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_wallet_payments_transaction_ref ON public.wallet_payments USING btree (transaction_reference);


--
-- Name: idx_wallet_payments_wallet_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_wallet_payments_wallet_type ON public.wallet_payments USING btree (wallet_type);


--
-- Name: balance_holds balance_holds_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER balance_holds_updated_at BEFORE UPDATE ON public.balance_holds FOR EACH ROW EXECUTE FUNCTION public.update_balance_transaction_timestamp();


--
-- Name: balance_transactions balance_transactions_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER balance_transactions_updated_at BEFORE UPDATE ON public.balance_transactions FOR EACH ROW EXECUTE FUNCTION public.update_balance_transaction_timestamp();


--
-- Name: user_balances user_balances_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER user_balances_updated_at BEFORE UPDATE ON public.user_balances FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();


--
-- Name: users users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();


--
-- Name: balance_holds balance_holds_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.balance_holds
    ADD CONSTRAINT balance_holds_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: balance_holds balance_holds_released_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.balance_holds
    ADD CONSTRAINT balance_holds_released_by_fkey FOREIGN KEY (released_by) REFERENCES public.users(id);


--
-- Name: balance_holds balance_holds_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.balance_holds
    ADD CONSTRAINT balance_holds_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.balance_transactions(id);


--
-- Name: balance_holds balance_holds_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.balance_holds
    ADD CONSTRAINT balance_holds_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: balance_transactions balance_transactions_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.balance_transactions
    ADD CONSTRAINT balance_transactions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: balance_transactions balance_transactions_processed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.balance_transactions
    ADD CONSTRAINT balance_transactions_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES public.users(id);


--
-- Name: balance_transactions balance_transactions_related_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.balance_transactions
    ADD CONSTRAINT balance_transactions_related_transaction_id_fkey FOREIGN KEY (related_transaction_id) REFERENCES public.balance_transactions(id);


--
-- Name: balance_transactions balance_transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.balance_transactions
    ADD CONSTRAINT balance_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: balance_transactions balance_transactions_wallet_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.balance_transactions
    ADD CONSTRAINT balance_transactions_wallet_payment_id_fkey FOREIGN KEY (wallet_payment_id) REFERENCES public.wallet_payments(id);


--
-- Name: bids bids_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bids
    ADD CONSTRAINT bids_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: bids bids_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bids
    ADD CONSTRAINT bids_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: driver_locations driver_locations_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.driver_locations
    ADD CONSTRAINT driver_locations_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: emergency_transfer_notifications emergency_transfer_notifications_transfer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emergency_transfer_notifications
    ADD CONSTRAINT emergency_transfer_notifications_transfer_id_fkey FOREIGN KEY (transfer_id) REFERENCES public.emergency_transfers(id);


--
-- Name: emergency_transfers emergency_transfers_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emergency_transfers
    ADD CONSTRAINT emergency_transfers_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: notifications notifications_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: orders orders_assigned_driver_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_assigned_driver_user_id_fkey FOREIGN KEY (assigned_driver_user_id) REFERENCES public.users(id);


--
-- Name: orders orders_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.users(id);


--
-- Name: orders orders_driver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.users(id);


--
-- Name: orders orders_emergency_transfer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_emergency_transfer_id_fkey FOREIGN KEY (emergency_transfer_id) REFERENCES public.emergency_transfers(id);


--
-- Name: platform_review_flags platform_review_flags_review_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.platform_review_flags
    ADD CONSTRAINT platform_review_flags_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.platform_reviews(id) ON DELETE CASCADE;


--
-- Name: platform_review_flags platform_review_flags_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.platform_review_flags
    ADD CONSTRAINT platform_review_flags_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: platform_review_votes platform_review_votes_review_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.platform_review_votes
    ADD CONSTRAINT platform_review_votes_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.platform_reviews(id) ON DELETE CASCADE;


--
-- Name: platform_review_votes platform_review_votes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.platform_review_votes
    ADD CONSTRAINT platform_review_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: platform_reviews platform_reviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.platform_reviews
    ADD CONSTRAINT platform_reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_reviewee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_reviewee_id_fkey FOREIGN KEY (reviewee_id) REFERENCES public.users(id);


--
-- Name: reviews reviews_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.users(id);


--
-- Name: reviews reviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_balances user_balances_frozen_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_balances
    ADD CONSTRAINT user_balances_frozen_by_fkey FOREIGN KEY (frozen_by) REFERENCES public.users(id);


--
-- Name: user_balances user_balances_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_balances
    ADD CONSTRAINT user_balances_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_saved_addresses user_saved_addresses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_saved_addresses
    ADD CONSTRAINT user_saved_addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: vendor_categories vendor_categories_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendor_categories
    ADD CONSTRAINT vendor_categories_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;


--
-- Name: vendor_items vendor_items_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendor_items
    ADD CONSTRAINT vendor_items_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;


--
-- Name: wallet_payments wallet_payments_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallet_payments
    ADD CONSTRAINT wallet_payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict xV4OJk5ZsGKJwa5q43U9qSseA7Kq2chk54CfiZSSss87LxV9BmXtSvAYMYLZioM

