// ─── Available quotation variables ───────────────────────────
export const QUOTATION_VARIABLES = [
  { key: 'client_name',         label: 'Client Name',           example: 'Spice Garden Restaurants' },
  { key: 'client_address',      label: 'Client Address',         example: '123 Main St, Karachi' },
  { key: 'client_email',        label: 'Client Email',           example: 'ahmed@spice.pk' },
  { key: 'quotation_date',      label: 'Quotation Date',         example: '1 January 2026' },
  { key: 'valid_until',         label: 'Valid Until',            example: '1 February 2026' },
  { key: 'scope_summary',       label: 'Scope Summary',          example: 'NTG Reach CRM subscription for 5 users' },
  { key: 'setup_fee',           label: 'Setup Fee',              example: '50,000' },
  { key: 'recurring_fee',       label: 'Recurring Fee',          example: '15,000' },
  { key: 'payment_frequency',   label: 'Payment Frequency',      example: 'month' },
  { key: 'discount',            label: 'Discount Amount',        example: '5,000' },
  { key: 'discount_note',       label: 'Discount Note',          example: 'Introductory offer' },
  { key: 'total_first_payment', label: 'Total First Payment',    example: '60,000' },
  { key: 'currency',            label: 'Currency',               example: 'PKR' },
  { key: 'tax',                 label: 'Tax Amount',             example: '0' },
  { key: 'tax_note',            label: 'Tax Note',               example: 'Prices are exclusive of applicable taxes' },
]

// ─── Substitute variables in HTML content ─────────────────────
export function substituteQuotationVariables(
  content:   string,
  variables: Record<string, string>
): string {
  let result = content
  for (const [key, value] of Object.entries(variables)) {
    result = result.replaceAll(`{{${key}}}`, value || `[${key}]`)
  }
  result = result.replace(
    /\{\{([^}]+)\}\}/g,
    '<span style="background:#fef3c7;color:#92400e;padding:1px 4px;border-radius:3px;">{{$1}}</span>'
  )
  return result
}

// ─── Pre-fill variables from a lead ───────────────────────────
export function prefillQuotationFromLead(lead: {
  contact_name:       string
  company_name:       string
  email?:             string | null
  address?:           string | null
  quoted_setup_fee?:  number | null
  quoted_mrr?:        number | null
  payment_frequency?: string | null
  deal_currency?:     string | null
}, inputCurrency: string): Record<string, string> {
  const today = new Date()
  const validUntil = new Date(today)
  validUntil.setDate(validUntil.getDate() + 30)

  const fmt = (d: Date) => d.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric'
  })

  const setupFee    = lead.quoted_setup_fee ?? 0
  const recurring   = lead.quoted_mrr ?? 0
  const discount    = 0
  const totalFirst  = setupFee + recurring - discount

  return {
    client_name:         lead.company_name,
    client_address:      lead.address ?? '',
    client_email:        lead.email ?? '',
    quotation_date:      fmt(today),
    valid_until:         fmt(validUntil),
    scope_summary:       'NTG Reach CRM platform subscription and onboarding',
    setup_fee:           setupFee ? setupFee.toLocaleString() : '',
    recurring_fee:       recurring ? recurring.toLocaleString() : '',
    payment_frequency:   lead.payment_frequency === 'annual' ? 'year' : 'month',
    discount:            '0',
    discount_note:       '',
    total_first_payment: totalFirst ? totalFirst.toLocaleString() : '',
    currency:            lead.deal_currency ?? inputCurrency,
    tax:                 '0',
    tax_note:            'Prices are exclusive of applicable taxes',
  }
}
