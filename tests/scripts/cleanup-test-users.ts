/**
 * Cleanup Test Users Script
 *
 * Deletes all test users from Supabase Auth and Profiles
 * Run with: npx ts-node tests/scripts/cleanup-test-users.ts
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function cleanupTestUsers() {
  console.log('🧹 Starting cleanup of test users...\n');

  try {
    // Step 1: Get all test users from profiles table
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .like('email', 'test.%@example.com');

    if (profileError) {
      throw new Error(`Failed to fetch profiles: ${profileError.message}`);
    }

    if (!profiles || profiles.length === 0) {
      console.log('✅ No test users found. Database is clean!');
      return;
    }

    console.log(`Found ${profiles.length} test users to delete:\n`);
    profiles.forEach((profile, index) => {
      console.log(`${index + 1}. ${profile.email} (${profile.full_name})`);
    });
    console.log('');

    // Step 2: Delete each user using Admin API
    let successCount = 0;
    let errorCount = 0;

    for (const profile of profiles) {
      try {
        // Delete user from auth.users (will cascade to profiles via RLS)
        const { error: deleteError } = await supabase.auth.admin.deleteUser(profile.id);

        if (deleteError) {
          console.error(`❌ Failed to delete ${profile.email}: ${deleteError.message}`);
          errorCount++;
        } else {
          console.log(`✅ Deleted: ${profile.email}`);
          successCount++;
        }
      } catch (error: any) {
        console.error(`❌ Error deleting ${profile.email}: ${error.message}`);
        errorCount++;
      }
    }

    console.log(`\n📊 Cleanup Summary:`);
    console.log(`   ✅ Successfully deleted: ${successCount}`);
    console.log(`   ❌ Failed: ${errorCount}`);
    console.log(`   📝 Total: ${profiles.length}`);

    if (errorCount > 0) {
      console.log('\n⚠️  Some users failed to delete. Check RLS policies or foreign key constraints.');
    }

  } catch (error: any) {
    console.error('❌ Cleanup failed:', error.message);
    process.exit(1);
  }
}

// Run cleanup
cleanupTestUsers()
  .then(() => {
    console.log('\n✅ Cleanup completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
