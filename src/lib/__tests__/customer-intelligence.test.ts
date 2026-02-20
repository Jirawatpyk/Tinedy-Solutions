import { vi, describe, it, expect, beforeEach } from 'vitest'
import { supabase } from '@/lib/supabase'

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}))

vi.mock('@/lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils')>()
  return { ...actual, getBangkokDateString: vi.fn(() => '2026-02-20') }
})

import { checkAndUpdateCustomerIntelligence } from '@/lib/customer-intelligence'

const mockFrom = vi.mocked(supabase.from)

function mockCustomerCall(customer: object) {
  mockFrom.mockImplementationOnce(
    () =>
      ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: customer, error: null }),
      }) as any
  )
}

function mockStatsCall(rows: { total_price: number | null }[]) {
  const result = { data: rows, error: null }
  mockFrom.mockImplementationOnce(
    () =>
      ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: (
          resolve: (v: typeof result) => unknown,
          _reject?: (reason?: unknown) => unknown
        ) => Promise.resolve(result).then(resolve as any),
      }) as any
  )
}

function mockUpdateCall() {
  const update = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: null }),
  })
  mockFrom.mockImplementationOnce(() => ({ update }) as any)
  return update
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('checkAndUpdateCustomerIntelligence', () => {
  it('upgrades new → regular on first paid booking', async () => {
    mockCustomerCall({
      relationship_level: 'new',
      relationship_level_locked: false,
      tags: [],
      notes: null,
    })
    mockStatsCall([{ total_price: 1000 }])
    const update = mockUpdateCall()

    await checkAndUpdateCustomerIntelligence('cust-1')

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ relationship_level: 'regular' })
    )
  })

  it('upgrades regular → vip on 5th paid booking', async () => {
    mockCustomerCall({
      relationship_level: 'regular',
      relationship_level_locked: false,
      tags: [],
      notes: null,
    })
    mockStatsCall([
      { total_price: 1000 },
      { total_price: 1000 },
      { total_price: 1000 },
      { total_price: 1000 },
      { total_price: 1000 },
    ])
    const update = mockUpdateCall()

    await checkAndUpdateCustomerIntelligence('cust-1')

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ relationship_level: 'vip' })
    )
  })

  it('upgrades regular → vip when spend reaches ฿15,000 (3 bookings)', async () => {
    mockCustomerCall({
      relationship_level: 'regular',
      relationship_level_locked: false,
      tags: [],
      notes: null,
    })
    mockStatsCall([
      { total_price: 5000 },
      { total_price: 5000 },
      { total_price: 5000 },
    ])
    const update = mockUpdateCall()

    await checkAndUpdateCustomerIntelligence('cust-1')

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ relationship_level: 'vip' })
    )
  })

  it('skips all updates when relationship_level_locked is true', async () => {
    mockCustomerCall({
      relationship_level: 'new',
      relationship_level_locked: true,
      tags: [],
      notes: null,
    })

    await checkAndUpdateCustomerIntelligence('cust-1')

    // Only one call: customer fetch. No stats fetch, no update.
    expect(mockFrom).toHaveBeenCalledTimes(1)
  })

  it('adds "High Value" tag when spend reaches ฿15,000', async () => {
    mockCustomerCall({
      relationship_level: 'regular',
      relationship_level_locked: false,
      tags: [],
      notes: null,
    })
    mockStatsCall([
      { total_price: 5000 },
      { total_price: 5000 },
      { total_price: 5000 },
    ])
    const update = mockUpdateCall()

    await checkAndUpdateCustomerIntelligence('cust-1')

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ tags: expect.arrayContaining(['High Value']) })
    )
  })

  it('appends correctly formatted auto-note on new → regular upgrade', async () => {
    mockCustomerCall({
      relationship_level: 'new',
      relationship_level_locked: false,
      tags: [],
      notes: null,
    })
    // total_price: 0 so spendStr is omitted from the auto-note
    mockStatsCall([{ total_price: 0 }])
    const update = mockUpdateCall()

    await checkAndUpdateCustomerIntelligence('cust-1')

    const callArgs = update.mock.calls[0][0] as { notes: string }
    expect(callArgs.notes).toContain(
      '[Auto] 2026-02-20 — Relationship upgraded: new → regular (1 completed booking)'
    )
  })

  it('keeps vip level unchanged regardless of low stats', async () => {
    mockCustomerCall({
      relationship_level: 'vip',
      relationship_level_locked: false,
      tags: [],
      notes: null,
    })
    mockStatsCall([{ total_price: 500 }])

    await checkAndUpdateCustomerIntelligence('cust-1')

    // No update: level stays vip, no new tags, no note
    expect(mockFrom).toHaveBeenCalledTimes(2) // customer + stats only
  })

  it('stays regular on 4 bookings (boundary — not yet vip)', async () => {
    mockCustomerCall({
      relationship_level: 'regular',
      relationship_level_locked: false,
      tags: [],
      notes: null,
    })
    mockStatsCall([
      { total_price: 1000 },
      { total_price: 1000 },
      { total_price: 1000 },
      { total_price: 1000 },
    ])

    await checkAndUpdateCustomerIntelligence('cust-1')

    // Level unchanged, no auto-tags triggered → no update
    expect(mockFrom).toHaveBeenCalledTimes(2) // customer + stats only
  })
})
