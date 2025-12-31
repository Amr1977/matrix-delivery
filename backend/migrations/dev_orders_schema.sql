--
-- PostgreSQL database dump
--



-- Dumped from database version 15.14
-- Dumped by pg_dump version 15.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
-- SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS public.orders (
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
    cancelled_at timestamp without time zone
);


-- OWNER statement removed (requires superuser privileges)
-- ALTER TABLE public.orders OWNER TO postgres;

--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

-- PK constraint skipped to avoid conflict
-- ALTER TABLE ONLY public.orders
--     ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: idx_orders_assigned_driver_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX IF NOT EXISTS idx_orders_assigned_driver_user_id ON public.orders USING btree (assigned_driver_user_id);
CREATE INDEX IF NOT EXISTS idx_orders_completed_at ON public.orders USING btree (completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders USING btree (customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders USING btree (order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders USING btree (status);

--
-- Name: orders orders_assigned_driver_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders DROP CONSTRAINT IF EXISTS orders_assigned_driver_user_id_fkey;
ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_assigned_driver_user_id_fkey FOREIGN KEY (assigned_driver_user_id) REFERENCES public.users(id);

--
-- Name: orders orders_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders DROP CONSTRAINT IF EXISTS orders_customer_id_fkey;
ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.users(id);


--
-- Name: orders orders_driver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders DROP CONSTRAINT IF EXISTS orders_driver_id_fkey;
ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--



