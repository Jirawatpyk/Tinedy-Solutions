-- Create function to send payment confirmation email via Edge Function
CREATE OR REPLACE FUNCTION send_payment_confirmation_email()
RETURNS TRIGGER AS $$
DECLARE
  function_url TEXT;
  supabase_anon_key TEXT;
BEGIN
  -- Only proceed if payment_status changed to 'paid'
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid') THEN

    -- Get Supabase project URL and anon key from environment
    -- You'll need to set these as Supabase secrets
    function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-payment-confirmation';
    supabase_anon_key := current_setting('app.settings.supabase_anon_key', true);

    -- Call Edge Function asynchronously using pg_net extension
    PERFORM
      net.http_post(
        url := function_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || supabase_anon_key
        ),
        body := jsonb_build_object(
          'bookingId', NEW.id
        )
      );

    -- Log the trigger execution
    RAISE NOTICE 'Payment confirmation email triggered for booking: %', NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on bookings table
DROP TRIGGER IF EXISTS trigger_send_payment_confirmation ON bookings;

CREATE TRIGGER trigger_send_payment_confirmation
  AFTER UPDATE OF payment_status ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION send_payment_confirmation_email();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA net TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA net TO postgres, anon, authenticated, service_role;
