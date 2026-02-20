import { formatCurrency } from '@/lib/utils'
import { PricingModel } from '@/types'
import type { WizardState } from './index'

interface Step3Props {
  values: WizardState
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-4 py-1.5">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  )
}

export function Step3Confirm({ values }: Step3Props) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Review the details below before creating the package.
      </p>

      {/* Basic Info */}
      <div className="rounded-lg border divide-y">
        <div className="px-4 py-2.5 bg-muted/50">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Basic Info
          </p>
        </div>
        <div className="px-4">
          <SummaryRow label="Package Name" value={values.name} />
          {values.description && (
            <SummaryRow label="Description" value={values.description} />
          )}
          <SummaryRow
            label="Service Type"
            value={values.service_type === 'cleaning' ? 'Cleaning' : 'Training'}
          />
        </div>
      </div>

      {/* Pricing */}
      <div className="rounded-lg border divide-y">
        <div className="px-4 py-2.5 bg-muted/50">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Pricing
          </p>
        </div>
        <div className="px-4">
          <SummaryRow
            label="Pricing Type"
            value={
              values.pricing_model === PricingModel.Fixed
                ? 'Fixed Price (Legacy)'
                : 'Tiered — Area & Frequency Based'
            }
          />

          {values.pricing_model === PricingModel.Fixed && (
            <>
              {values.duration_minutes != null && (
                <SummaryRow
                  label="Duration"
                  value={`${values.duration_minutes} minutes`}
                />
              )}
              {values.base_price != null && (
                <SummaryRow
                  label="Base Price"
                  value={formatCurrency(values.base_price)}
                />
              )}
            </>
          )}

          {values.pricing_model === PricingModel.Tiered && (
            <>
              {values.category && (
                <SummaryRow label="Category" value={values.category} />
              )}
              <SummaryRow
                label="Pricing Tiers"
                value={`${values.tiers.length} tier${values.tiers.length !== 1 ? 's' : ''} defined`}
              />
            </>
          )}
        </div>
      </div>

      {/* Tiers table (tiered only) */}
      {values.pricing_model === PricingModel.Tiered && values.tiers.length > 0 && (
        <div className="rounded-lg border overflow-hidden">
          <div className="px-4 py-2.5 bg-muted/50">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Pricing Tiers Summary
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Tier</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Area (sqm)</th>
                  <th className="text-right px-3 py-2 font-medium text-muted-foreground">1×</th>
                  <th className="text-right px-3 py-2 font-medium text-muted-foreground">4×</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {values.tiers.map((tier, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 text-muted-foreground">Tier {i + 1}</td>
                    <td className="px-3 py-2">
                      {tier.area_min}–{tier.area_max}
                    </td>
                    <td className="px-3 py-2 text-right">{formatCurrency(tier.price_1_time)}</td>
                    <td className="px-3 py-2 text-right">
                      {tier.price_4_times != null
                        ? formatCurrency(tier.price_4_times)
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
