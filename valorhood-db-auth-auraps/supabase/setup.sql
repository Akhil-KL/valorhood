-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add aura_points column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name='users' AND column_name='aura_points'
    ) THEN
        ALTER TABLE auth.users ADD COLUMN aura_points INTEGER DEFAULT 0;
    END IF;
END $$;

-- Create transaction error log table
CREATE TABLE IF NOT EXISTS aura_transaction_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    amount INTEGER NOT NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('INCREMENT', 'DECREMENT')),
    reference_type TEXT,
    reference_id TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create or replace the transaction function
CREATE OR REPLACE FUNCTION handle_aura_transaction(
    user_id UUID,
    amount INTEGER,
    action_type TEXT,
    min_balance INTEGER DEFAULT 0,
    reference_type TEXT DEFAULT NULL,
    reference_id TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    current_balance INTEGER;
    new_balance INTEGER;
BEGIN
    -- Validate inputs
    IF amount <= 0 THEN
        RAISE EXCEPTION 'Amount must be positive';
    END IF;

    IF action_type NOT IN ('INCREMENT', 'DECREMENT') THEN
        RAISE EXCEPTION 'Invalid action type';
    END IF;

    -- Lock user row for transaction safety
    PERFORM 1 FROM auth.users WHERE id = user_id FOR UPDATE;

    -- Get current balance
    SELECT COALESCE(aura_points, 0) INTO current_balance
    FROM auth.users
    WHERE id = user_id;

    -- Validate decrement
    IF action_type = 'DECREMENT' AND (current_balance - amount) < min_balance THEN
        INSERT INTO aura_transaction_logs (
            user_id, amount, action_type,
            reference_type, reference_id,
            error_message
        ) VALUES (
            user_id, amount, action_type,
            reference_type, reference_id,
            CONCAT('Insufficient balance. Current:', current_balance, ' Required:', amount)
        );

        RAISE EXCEPTION 'AURA_ERR_INSUFFICIENT_BALANCE';
    END IF;

    -- Update balance
    UPDATE auth.users
    SET aura_points = CASE
        WHEN action_type = 'INCREMENT' THEN COALESCE(aura_points, 0) + amount
        ELSE COALESCE(aura_points, 0) - amount
    END
    WHERE id = user_id
    RETURNING aura_points INTO new_balance;

    -- Log successful transaction
    INSERT INTO aura_transaction_logs (
        user_id, amount, action_type,
        reference_type, reference_id
    ) VALUES (
        user_id, amount, action_type,
        reference_type, reference_id
    );

    RETURN new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_aura_transaction_user ON aura_transaction_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_aura_transaction_time ON aura_transaction_logs(created_at);
