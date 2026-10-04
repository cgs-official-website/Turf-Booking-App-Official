-- 000_rollback.sql
-- Restores bookings_old_backup back to bookings, including primary key index and sequence

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'bookings_old_backup'
    ) THEN
        RAISE NOTICE 'Table public.bookings_old_backup does not exist. Nothing to restore.';
        RETURN;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'bookings'
    ) THEN
        RAISE EXCEPTION 'Cannot rollback: table public.bookings already exists. Drop or rename it first.';
    END IF;

    -- 1. Restore table name
    ALTER TABLE public.bookings_old_backup RENAME TO bookings;
    RAISE NOTICE 'Restored table bookings_old_backup to bookings.';

    -- 2. Restore primary key index/constraint if it exists
    IF EXISTS (
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'bookings_old_backup_pkey' AND n.nspname = 'public'
    ) THEN
        ALTER INDEX public.bookings_old_backup_pkey RENAME TO bookings_pkey;
        RAISE NOTICE 'Restored index bookings_old_backup_pkey to bookings_pkey.';
    END IF;

    -- 3. Restore sequence if it exists
    IF EXISTS (
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'bookings_old_backup_id_seq' AND n.nspname = 'public' AND c.relkind = 'S'
    ) THEN
        ALTER SEQUENCE public.bookings_old_backup_id_seq RENAME TO bookings_id_seq;
        RAISE NOTICE 'Restored sequence bookings_old_backup_id_seq to bookings_id_seq.';
    END IF;
END $$;
