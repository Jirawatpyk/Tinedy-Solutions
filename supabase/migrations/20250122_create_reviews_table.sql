-- Create reviews table for staff ratings
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- Ensure one review per booking
    UNIQUE(booking_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_reviews_staff_id ON public.reviews(staff_id);
CREATE INDEX IF NOT EXISTS idx_reviews_customer_id ON public.reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_booking_id ON public.reviews(booking_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON public.reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Allow staff to view their own reviews
CREATE POLICY "Staff can view their own reviews"
    ON public.reviews
    FOR SELECT
    TO authenticated
    USING (
        staff_id = auth.uid()
        OR
        -- Admin can view all reviews
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Allow customers to view reviews they created
CREATE POLICY "Customers can view their own reviews"
    ON public.reviews
    FOR SELECT
    TO authenticated
    USING (customer_id IN (
        SELECT id FROM public.customers WHERE id = customer_id
    ));

-- Allow customers to create reviews for their completed bookings
CREATE POLICY "Customers can create reviews for completed bookings"
    ON public.reviews
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.bookings
            WHERE id = booking_id
            AND customer_id = reviews.customer_id
            AND status = 'completed'
        )
        AND NOT EXISTS (
            SELECT 1 FROM public.reviews
            WHERE booking_id = reviews.booking_id
        )
    );

-- Allow customers to update their own reviews
CREATE POLICY "Customers can update their own reviews"
    ON public.reviews
    FOR UPDATE
    TO authenticated
    USING (customer_id IN (
        SELECT id FROM public.customers WHERE id = customer_id
    ))
    WITH CHECK (customer_id IN (
        SELECT id FROM public.customers WHERE id = customer_id
    ));

-- Allow customers to delete their own reviews
CREATE POLICY "Customers can delete their own reviews"
    ON public.reviews
    FOR DELETE
    TO authenticated
    USING (customer_id IN (
        SELECT id FROM public.customers WHERE id = customer_id
    ));

-- Admin can do everything
CREATE POLICY "Admin can manage all reviews"
    ON public.reviews
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.reviews
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Comment on table
COMMENT ON TABLE public.reviews IS 'Customer reviews and ratings for completed bookings';
COMMENT ON COLUMN public.reviews.rating IS 'Rating from 1 to 5 stars';
COMMENT ON COLUMN public.reviews.booking_id IS 'Reference to the booking being reviewed (one review per booking)';
