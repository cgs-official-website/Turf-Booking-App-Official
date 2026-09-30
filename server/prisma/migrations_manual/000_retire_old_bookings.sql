-- 000_retire_old_bookings.sql
-- Safely renames legacy unused empty bookings table to bookings_old_backup
-- and renames any primary key constraint/index and sequence to avoid clashes with 001

DO $$
DECLARE
    table_exists BOOLEAN;
    has_booking_status BOOLEAN;
    row_count BIGINT;
BEGIN
    -- 1. Check if public.bookings exists
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'bookings'
    ) INTO table_exists;

    IF NOT table_exists THEN
        RAISE NOTICE 'Table public.bookings does not exist. Nothing to retire.';
        RETURN;
    END IF;

    -- 2. Check if it already has the new column 'booking_status'
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'bookings'
          AND column_name = 'booking_status'
    ) INTO has_booking_status;

    IF has_booking_status THEN
        RAISE EXCEPTION 'Table public.bookings already has column "booking_status" (already the new table). Aborting retirement.';
    END IF;

    -- 3. Check row count of the old table
    EXECUTE 'SELECT count(*) FROM public.bookings' INTO row_count;

    IF row_count > 0 THEN
        RAISE EXCEPTION 'Table public.bookings contains % rows (expected 0). Aborting retirement to prevent data loss.', row_count;
    END IF;

    -- 4. Check if target backup table already exists
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'bookings_old_backup'
    ) THEN
        RAISE EXCEPTION 'Target table public.bookings_old_backup already exists. Please inspect and resolve manually.';
    END IF;

    -- 5. Safe to rename table
    EXECUTE 'ALTER TABLE public.bookings RENAME TO bookings_old_backup';
    RAISE NOTICE 'Old empty table public.bookings has been renamed to bookings_old_backup.';

    -- 6. Rename leftover primary key index/constraint if it exists
    IF EXISTS (
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'bookings_pkey' AND n.nspname = 'public'
    ) THEN
        ALTER INDEX public.bookings_pkey RENAME TO bookings_old_backup_pkey;
        RAISE NOTICE 'Renamed index bookings_pkey to bookings_old_backup_pkey.';
    END IF;

    -- 7. Rename leftover sequence if it exists
    IF EXISTS (
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'bookings_id_seq' AND n.nspname = 'public' AND c.relkind = 'S'
    ) THEN
        ALTER SEQUENCE public.bookings_id_seq RENAME TO bookings_old_backup_id_seq;
        RAISE NOTICE 'Renamed sequence bookings_id_seq to bookings_old_backup_id_seq.';
    END IF;
END $$;
