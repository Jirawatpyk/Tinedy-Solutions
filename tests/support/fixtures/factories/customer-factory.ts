/**
 * Customer Factory for Test Data Generation
 *
 * Creates test customers using Supabase API and tracks them for cleanup.
 *
 * Uses:
 * - @faker-js/faker for realistic test data
 * - Supabase client for API calls (tests real API path)
 */
import { faker } from '@faker-js/faker';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface CreateCustomerOptions {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  tags?: string[];
  notes?: string;
}

interface CreatedCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
}

export class CustomerFactory {
  private supabase: SupabaseClient;
  private createdCustomerIds: string[] = [];
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
   * Set authentication token (call this before creating customers)
   */
  setAuthToken(token: string): void {
    this.adminAuthToken = token;
    // Set the session for authenticated requests
    if (token) {
      this.supabase.auth.setSession({ access_token: token, refresh_token: '' } as any);
    }
  }

  /**
   * Create a customer with random data
   */
  async createCustomer(overrides: Partial<CreateCustomerOptions> = {}): Promise<CreatedCustomer> {
    const customerData = {
      name: overrides.name || faker.person.fullName(),
      email: overrides.email || faker.internet.email(),
      phone: overrides.phone || faker.phone.number('##########'),
      address: overrides.address || faker.location.streetAddress(),
      city: overrides.city || faker.location.city(),
      state: overrides.state || faker.location.state(),
      zip_code: overrides.zip_code || faker.location.zipCode(),
      tags: overrides.tags || [],
      notes: overrides.notes || '',
    };

    const { data, error } = await this.supabase
      .from('customers')
      .insert(customerData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create customer: ${error.message}`);
    }

    if (!data) {
      throw new Error('Customer creation failed: No data returned');
    }

    // Track for cleanup
    this.createdCustomerIds.push(data.id);

    return data as CreatedCustomer;
  }

  /**
   * Create multiple customers at once
   */
  async createCustomers(count: number, overrides: Partial<CreateCustomerOptions> = {}): Promise<CreatedCustomer[]> {
    const customers: CreatedCustomer[] = [];
    for (let i = 0; i < count; i++) {
      customers.push(await this.createCustomer(overrides));
    }
    return customers;
  }

  /**
   * Create a VIP customer with specific tags
   */
  async createVIPCustomer(overrides: Partial<CreateCustomerOptions> = {}): Promise<CreatedCustomer> {
    return this.createCustomer({
      ...overrides,
      tags: ['VIP', 'Priority', ...(overrides.tags || [])],
    });
  }

  /**
   * Cleanup all created customers
   * Called automatically by fixture after test completion
   */
  async cleanup(): Promise<void> {
    if (this.createdCustomerIds.length === 0) return;

    try {
      // Hard delete customers (admin only)
      const { error } = await this.supabase
        .from('customers')
        .delete()
        .in('id', this.createdCustomerIds);

      if (error) {
        console.error('Failed to delete customers:', error);
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }

    this.createdCustomerIds = [];
  }
}
