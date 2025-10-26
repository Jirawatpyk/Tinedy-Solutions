-- Drop old trigger and function
DROP TRIGGER IF EXISTS trigger_send_payment_confirmation ON bookings;
DROP FUNCTION IF EXISTS send_payment_confirmation_email();

-- Enable pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

-- Create simplified function that uses net.http_post
CREATE OR REPLACE FUNCTION send_payment_confirmation_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if payment_status changed to 'paid'
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid') THEN

    -- Call Edge Function using pg_net
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-payment-confirmation',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key', true)
      ),
      body := jsonb_build_object('bookingId', NEW.id)
    );

    RAISE NOTICE 'Payment confirmation email triggered for booking: %', NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER trigger_send_payment_confirmation
  AFTER UPDATE OF payment_status ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION send_payment_confirmation_email();

-- Grant permissions
GRANT USAGE ON SCHEMA net TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA net TO postgres, anon, authenticated, service_role;
