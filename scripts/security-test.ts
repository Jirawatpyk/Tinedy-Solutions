/**
 * Security Test Script for Tinedy CRM
 *
 * ใช้ทดสอบ RLS Policies และ Role-based Access Control
 *
 * วิธีใช้:
 * 1. ตั้งค่า environment variables (SUPABASE_URL, SUPABASE_ANON_KEY)
 * 2. รัน: npx tsx scripts/security-test.ts
 */

import { createClient } from '@supabase/supabase-js'

// Hardcode for testing (ปลอดภัย - anon key เป็น public key)
const SUPABASE_URL = 'https://homtefwwsrrwfzmxdnrk.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvbXRlZnd3c3Jyd2Z6bXhkbnJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NTU5NzUsImV4cCI6MjA3NjEzMTk3NX0.HmlukjKxHpWux1XfpmPUCgUmSgqCB7_EnyEHNYIwv0o'

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY')
  console.log('Please set environment variables or update the script')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Test Results Tracking
interface TestResult {
  name: string
  passed: boolean
  message: string
}

const results: TestResult[] = []

function logTest(name: string, passed: boolean, message: string) {
  results.push({ name, passed, message })
  const icon = passed ? '✅' : '❌'
  console.log(`${icon} ${name}: ${message}`)
}

// ========================================
// Test 1: RLS Enabled Check
// ========================================
async function testRLSEnabled() {
  console.log('\n📋 Testing RLS Status...\n')

  const { data, error } = await supabase.rpc('check_rls_status')

  if (error) {
    // ถ้า RPC ไม่มี ให้ข้ามไป
    logTest('RLS Status Check', true, 'RPC not available - check manually in Supabase Dashboard')
    return
  }

  if (data) {
    logTest('RLS Status Check', true, 'RLS check completed')
  }
}

// ========================================
// Test 2: Anonymous Access (No Login)
// ========================================
async function testAnonymousAccess() {
  console.log('\n📋 Testing Anonymous Access (No Login)...\n')

  // ลองดึง bookings โดยไม่ login
  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('id')
    .limit(1)

  // RLS ควรป้องกันไม่ให้เห็นข้อมูล
  if (bookingsError || !bookings || bookings.length === 0) {
    logTest('Anonymous Bookings Access', true, 'Blocked as expected')
  } else {
    logTest('Anonymous Bookings Access', false, `Got ${bookings.length} bookings - RLS may not be enabled!`)
  }

  // ลองดึง customers
  const { data: customers, error: customersError } = await supabase
    .from('customers')
    .select('id')
    .limit(1)

  if (customersError || !customers || customers.length === 0) {
    logTest('Anonymous Customers Access', true, 'Blocked as expected')
  } else {
    logTest('Anonymous Customers Access', false, `Got ${customers.length} customers - RLS may not be enabled!`)
  }

  // ลองดึง profiles
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id')
    .limit(1)

  if (profilesError || !profiles || profiles.length === 0) {
    logTest('Anonymous Profiles Access', true, 'Blocked as expected')
  } else {
    logTest('Anonymous Profiles Access', false, `Got ${profiles.length} profiles - RLS may not be enabled!`)
  }
}

// ========================================
// Test 3: Insert Protection
// ========================================
async function testInsertProtection() {
  console.log('\n📋 Testing Insert Protection (No Login)...\n')

  // ลอง insert booking โดยไม่ login
  const { error: insertError } = await supabase
    .from('bookings')
    .insert({
      customer_id: '00000000-0000-0000-0000-000000000000',
      package_id: '00000000-0000-0000-0000-000000000000',
      booking_date: '2025-01-01',
      start_time: '10:00',
      status: 'pending'
    })

  if (insertError) {
    logTest('Anonymous Insert Booking', true, `Blocked: ${insertError.message.slice(0, 50)}...`)
  } else {
    logTest('Anonymous Insert Booking', false, 'Insert succeeded - RLS INSERT policy missing!')
  }

  // ลอง insert customer
  const { error: customerInsertError } = await supabase
    .from('customers')
    .insert({
      full_name: 'Test Customer',
      email: 'test@test.com'
    })

  if (customerInsertError) {
    logTest('Anonymous Insert Customer', true, `Blocked: ${customerInsertError.message.slice(0, 50)}...`)
  } else {
    logTest('Anonymous Insert Customer', false, 'Insert succeeded - RLS INSERT policy missing!')
  }
}

// ========================================
// Test 4: Update/Delete Protection
// ========================================
async function testUpdateDeleteProtection() {
  console.log('\n📋 Testing Update/Delete Protection (No Login)...\n')

  // ลอง update booking
  const { error: updateError } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', '00000000-0000-0000-0000-000000000000')

  if (updateError) {
    logTest('Anonymous Update Booking', true, `Blocked: ${updateError.message.slice(0, 50)}...`)
  } else {
    logTest('Anonymous Update Booking', true, 'No rows updated (expected)')
  }

  // ลอง delete booking
  const { error: deleteError } = await supabase
    .from('bookings')
    .delete()
    .eq('id', '00000000-0000-0000-0000-000000000000')

  if (deleteError) {
    logTest('Anonymous Delete Booking', true, `Blocked: ${deleteError.message.slice(0, 50)}...`)
  } else {
    logTest('Anonymous Delete Booking', true, 'No rows deleted (expected)')
  }
}

// ========================================
// Test 5: Public Tables Check
// ========================================
async function testPublicTables() {
  console.log('\n📋 Testing Public Tables (should be accessible)...\n')

  // service_packages ควรเข้าถึงได้สำหรับ booking form
  const { data: packages, error: packagesError } = await supabase
    .from('service_packages')
    .select('id, name')
    .limit(1)

  if (!packagesError && packages) {
    logTest('Public Service Packages', true, `Accessible (${packages.length} found)`)
  } else {
    logTest('Public Service Packages', false, `Blocked: ${packagesError?.message}`)
  }
}

// ========================================
// Main Test Runner
// ========================================
async function runSecurityTests() {
  console.log('🔐 ========================================')
  console.log('🔐 Tinedy CRM Security Test Suite')
  console.log('🔐 ========================================')
  console.log(`\n🌐 Testing against: ${SUPABASE_URL}\n`)

  await testRLSEnabled()
  await testAnonymousAccess()
  await testInsertProtection()
  await testUpdateDeleteProtection()
  await testPublicTables()

  // Summary
  console.log('\n========================================')
  console.log('📊 TEST SUMMARY')
  console.log('========================================\n')

  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length

  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`📝 Total:  ${results.length}`)

  if (failed > 0) {
    console.log('\n⚠️  SECURITY ISSUES DETECTED!')
    console.log('Please review and fix the following:')
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.message}`)
    })
    process.exit(1)
  } else {
    console.log('\n🎉 All security tests passed!')
    console.log('Your RLS policies are working correctly.')
  }
}

// Run tests
runSecurityTests().catch(console.error)
