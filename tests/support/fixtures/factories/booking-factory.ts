/**
 * Booking Factory for Test Data Generation
 *
 * Creates test bookings using Supabase API and tracks them for cleanup.
 * Supports both staff and team assignment.
 *
 * Uses:
 * - @faker-js/faker for realistic test data
 * - Supabase client for API calls (tests real API path)
 */
import { faker } from '@faker-js/faker';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

type BookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
type PaymentStatus = 'pending' | 'paid' | 'refunded';

interface CreateBookingOptions {
  customer_id?: string;
  staff_id?: string | null;
  team_id?: string | null;
  service_package_id?: string;
  start_time?: string;
  end_time?: string;
  date?: string;
  duration?: number;
  total_price?: number;
  status?: BookingStatus;
  payment_status?: PaymentStatus;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  notes?: string;
}

interface CreatedBooking {
  id: string;
  customer_id: string;
  staff_id: string | null;
  team_id: string | null;
  service_package_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  payment_status: PaymentStatus;
  total_price: number;
}

export class BookingFactory {
  private supabase: SupabaseClient;
  private createdBookingIds: string[] = [];
  private adminAuthToken: string | null = null;

  constructor() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Set authentication token (call this before creating bookings)
   */
  setAuthToken(token: string): void {
    this.adminAuthToken = token;
    if (token) {
      this.supabase.auth.setSession({ access_token: token, refresh_token: '' } as any);
    }
  }

  /**
   * Create a booking with random or specified data
   */
  async createBooking(overrides: Partial<CreateBookingOptions> = {}): Promise<CreatedBooking> {
    // Generate realistic booking times
    const startDate = overrides.date || faker.date.future().toISOString().split('T')[0];
    const startHour = faker.number.int({ min: 9, max: 17 });
    const startTime = overrides.start_time || `${String(startHour).padStart(2, '0')}:00:00`;
    const duration = overrides.duration || faker.number.int({ min: 60, max: 240 });
    const endHour = startHour + Math.floor(duration / 60);
    const endTime = overrides.end_time || `${String(endHour).padStart(2, '0')}:00:00`;

    // CRITICAL: Cannot have both staff_id AND team_id
    const hasStaffId = overrides.staff_id !== undefined;
    const hasTeamId = overrides.team_id !== undefined;

    if (hasStaffId && hasTeamId && overrides.staff_id && overrides.team_id) {
      throw new Error('Booking cannot be assigned to both staff_id AND team_id');
    }

    const bookingData = {
      customer_id: overrides.customer_id || faker.string.uuid(),
      staff_id: hasStaffId ? overrides.staff_id : faker.string.uuid(),
      team_id: hasTeamId ? overrides.team_id : null,
      service_package_id: overrides.service_package_id || faker.string.uuid(),
      date: startDate,
      start_time: startTime,
      end_time: endTime,
      duration: duration,
      total_price: overrides.total_price || faker.number.int({ min: 500, max: 5000 }),
      status: overrides.status || 'pending',
      payment_status: overrides.payment_status || 'pending',
      address: overrides.address || faker.location.streetAddress(),
      city: overrides.city || faker.location.city(),
      state: overrides.state || faker.location.state(),
      zip_code: overrides.zip_code || faker.location.zipCode(),
      notes: overrides.notes || '',
    };

    const { data, error } = await this.supabase
      .from('bookings')
      .insert(bookingData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create booking: ${error.message}`);
    }

    if (!data) {
      throw new Error('Booking creation failed: No data returned');
    }

    // Track for cleanup
    this.createdBookingIds.push(data.id);

    return data as CreatedBooking;
  }

  /**
   * Create a confirmed booking (common test scenario)
   */
  async createConfirmedBooking(overrides: Partial<CreateBookingOptions> = {}): Promise<CreatedBooking> {
    return this.createBooking({
      ...overrides,
      status: 'confirmed',
    });
  }

  /**
   * Create a paid booking
   */
  async createPaidBooking(overrides: Partial<CreateBookingOptions> = {}): Promise<CreatedBooking> {
    return this.createBooking({
      ...overrides,
      status: 'confirmed',
      payment_status: 'paid',
    });
  }

  /**
   * Create a completed booking
   */
  async createCompletedBooking(overrides: Partial<CreateBookingOptions> = {}): Promise<CreatedBooking> {
    return this.createBooking({
      ...overrides,
      status: 'completed',
      payment_status: 'paid',
    });
  }

  /**
   * Create a team booking (assigned to team, not individual staff)
   */
  async createTeamBooking(
    team_id: string,
    overrides: Partial<CreateBookingOptions> = {}
  ): Promise<CreatedBooking> {
    return this.createBooking({
      ...overrides,
      staff_id: null, // CRITICAL: Must be null for team booking
      team_id: team_id,
    });
  }

  /**
   * Create multiple bookings at once
   */
  async createBookings(count: number, overrides: Partial<CreateBookingOptions> = {}): Promise<CreatedBooking[]> {
    const bookings: CreatedBooking[] = [];
    for (let i = 0; i < count; i++) {
      bookings.push(await this.createBooking(overrides));
    }
    return bookings;
  }

  /**
   * Cleanup all created bookings
   * Called automatically by fixture after test completion
   */
  async cleanup(): Promise<void> {
    if (this.createdBookingIds.length === 0) return;

    try {
      // Hard delete bookings (admin only)
      const { error } = await this.supabase
        .from('bookings')
        .delete()
        .in('id', this.createdBookingIds);

      if (error) {
        console.error('Failed to delete bookings:', error);
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }

    this.createdBookingIds = [];
  }
}
