-- Migration: Simplify wallet balance update trigger
-- 'payment' transactions represent explicit wallet balance debits and will debit the wallet.
-- 'recharge' transactions represent the mobile recharge record and will not affect the wallet balance.

CREATE OR REPLACE FUNCTION app_update_wallet_balance()
RETURNS TRIGGER AS $$
DECLARE
  w_id UUID;
  net_amount NUMERIC;
BEGIN
  -- We only act if status changes to 'completed'
  IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR OLD.status IS NULL OR OLD.status <> 'completed') THEN
    IF NEW.user_id IS NOT NULL THEN
      -- Find or create wallet for the user
      INSERT INTO wallets (user_id, currency, balance)
      VALUES (NEW.user_id, NEW.currency, 0)
      ON CONFLICT (user_id, currency) DO UPDATE SET updated_at = now()
      RETURNING id INTO w_id;

      -- Determine net amount to add to wallet (credits are positive, debits are negative)
      IF NEW.type IN ('topup', 'refund', 'commission') THEN
        net_amount := NEW.amount;
      ELSIF NEW.type = 'payment' THEN
        net_amount := -NEW.amount;
      ELSE
        net_amount := 0;
      END IF;

      -- Update wallet balance
      IF net_amount <> 0 THEN
        UPDATE wallets
        SET balance = balance + net_amount,
            updated_at = now()
        WHERE id = w_id;

        -- Insert into wallet_ledger
        INSERT INTO wallet_ledger (wallet_id, transaction_id, direction, amount, currency, balance_after, reason)
        SELECT w_id, NEW.id,
               CASE WHEN net_amount > 0 THEN 'credit' ELSE 'debit' END,
               ABS(net_amount), NEW.currency, wallets.balance, NEW.description
        FROM wallets
        WHERE wallets.id = w_id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
