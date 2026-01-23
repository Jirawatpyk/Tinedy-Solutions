/**
 * User Factory for Test Data Generation
 *
 * Creates test users (Admin, Manager, Staff) using Supabase Admin API
 * and tracks created users for automatic cleanup.
 *
 * NOTE: This uses Service Role Key for testing purposes.
 * In production, use Edge Functions with proper authentication.
 *
 * Uses:
 * - @faker-js/faker for realistic test data
 * - Supabase Admin API (with Service Role Key)
 */
import { faker } from '@faker-js/faker';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

type UserRole = 'admin' | 'manager' | 'staff';

interface CreateUserOptions {
  email?: string;
  full_name?: string;
  phone?: string;
  role?: UserRole;
  skills?: string[];
}

interface CreatedUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  staff_number?: string;
}

export class UserFactory {
  private supabase: SupabaseClient;
  private createdUserIds: string[] = [];

  constructor() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    // Use Service Role Key for test environment (has admin privileges)
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ||
                        process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
                        process.env.VITE_SUPABASE_ANON_KEY ||
                        process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables. Need VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for testing.');
    }

    // Create admin client (bypasses RLS for testing)
    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  /**
   * Create a Staff user (role: staff)
   */
  async createStaff(overrides: Partial<CreateUserOptions> = {}): Promise<CreatedUser> {
    return this.createUser({ role: 'staff', ...overrides });
  }

  /**
   * Create a Manager user (role: manager)
   */
  async createManager(overrides: Partial<CreateUserOptions> = {}): Promise<CreatedUser> {
    return this.createUser({ role: 'manager', ...overrides });
  }

  /**
   * Create an Admin user (role: admin)
   */
  async createAdmin(overrides: Partial<CreateUserOptions> = {}): Promise<CreatedUser> {
    return this.createUser({ role: 'admin', ...overrides });
  }

  /**
   * Create a user with specified role using Admin API
   */
  private async createUser(options: CreateUserOptions): Promise<CreatedUser> {
    // Generate unique email with UUID to avoid collisions (especially in parallel test execution)
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    const email = options.email || `test.${uniqueId}@example.com`;
    const password = 'Test1234!'; // Default test password
    const full_name = options.full_name || faker.person.fullName();
    const phone = options.phone || faker.phone.number('##########');
    const role = options.role || 'staff';
    const skills = options.skills || ['General'];

    try {
      // Step 1: Create auth user using Admin API
      const { data: authData, error: authError } = await this.supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email for testing
        user_metadata: {
          full_name,
        },
      });

      if (authError || !authData.user) {
        throw new Error(`Failed to create auth user: ${authError?.message || 'Unknown error'}`);
      }

      const userId = authData.user.id;

      // Step 2: Create profile record
      const { error: profileError } = await this.supabase
        .from('profiles')
        .insert({
          id: userId,
          email,
          full_name,
          phone,
          role,
          skills,
        });

      if (profileError) {
        // Cleanup: Delete auth user if profile creation fails
        await this.supabase.auth.admin.deleteUser(userId);
        throw new Error(`Failed to create profile: ${profileError.message}`);
      }

      // Step 3: Get the created profile (with auto-generated staff_number)
      const { data: profile } = await this.supabase
        .from('profiles')
        .select('staff_number')
        .eq('id', userId)
        .single();

      // Track created user for cleanup
      this.createdUserIds.push(userId);

      return {
        id: userId,
        email,
        full_name,
        role,
        staff_number: profile?.staff_number,
      };
    } catch (error: any) {
      throw new Error(`UserFactory.createUser failed: ${error.message}`);
    }
  }

  /**
   * Cleanup all created users
   * Called automatically by fixture after test completion
   */
  async cleanup(): Promise<void> {
    for (const userId of this.createdUserIds) {
      try {
        // Delete user using Admin API
        await this.supabase.auth.admin.deleteUser(userId);
      } catch (error: any) {
        console.warn(`Failed to delete test user ${userId}:`, error.message);
        // Continue cleanup even if one fails
      }
    }
    this.createdUserIds = [];
  }

  /**
   * Get a specific user's credentials for login
   */
  getUserCredentials(user: CreatedUser) {
    return {
      email: user.email,
      password: 'Test1234!',
    };
  }
}
