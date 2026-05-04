-- Optional seed (adjust rows to match your catalog).

insert into countries (country_iso, name, dial_prefix, min_length, max_length)
values
  ('IN', 'India', '+91', 10, 10),
  ('NG', 'Nigeria', '+234', 10, 11)
on conflict (country_iso) do nothing;

insert into operators (country_iso, code, name, short_name, is_default, validation_regex)
values
  ('IN', 'IN_AIRTEL', 'Bharti Airtel', 'Airtel', true, null),
  ('IN', 'IN_JIO', 'Reliance Jio', 'Jio', false, '^[6-9][0-9]{9}$'),
  ('NG', 'NG_MTN', 'MTN Nigeria', 'MTN', true, null)
on conflict (country_iso, code) do nothing;

insert into plans (
  sku_code, country_iso, operator_code, price_inr, price_eur, validity, plan_type, tag,
  benefits, data_label, calls_label, sms_label, plan_name,
  benefits_json, min_receive_amount, max_receive_amount, receive_currency, min_send_amount, max_send_amount, send_currency,
  commission_rate, processing_mode
)
values
  (
    'IN-AIRTEL-199',
    'IN',
    'IN_AIRTEL',
    199,
    2.45,
    '28 days',
    'combo',
    'popular',
    '1.5 GB/day • Unlimited calls • 100 SMS/day',
    '1.5 GB/day',
    'Unlimited',
    '100 SMS/day',
    'Unlimited 5G',
    '[{"Type":"Data","Value":1.5,"Unit":"GB/day"},{"Type":"Voice","AdditionalInformation":"Unlimited calls"},{"Type":"SMS","Value":100,"Unit":"SMS/day"}]'::jsonb,
    199, 199, 'INR', 2.45, 2.45, 'EUR', 0.02, 'Instant'
  ),
  (
    'IN-AIRTEL-349',
    'IN',
    'IN_AIRTEL',
    349,
    4.1,
    '28 days',
    'data',
    'none',
    '2 GB/day • Unlimited calls',
    '2 GB/day',
    'Unlimited',
    null,
    'Heavy data pack',
    '[{"Type":"Data","Value":2,"Unit":"GB/day"},{"Type":"Voice","AdditionalInformation":"Unlimited calls"}]'::jsonb,
    349, 349, 'INR', 4.1, 4.1, 'EUR', 0.02, 'Instant'
  ),
  (
    'NG-MTN-500',
    'NG',
    'NG_MTN',
    500,
    1.2,
    '30 days',
    'topup',
    'none',
    'Airtime 500',
    null,
    null,
    null,
    'MTN 500',
    '[{"Type":"Airtime","Value":500,"Unit":"NGN"}]'::jsonb,
    500, 500, 'NGN', 1.2, 1.2, 'EUR', 0.02, 'Instant'
  )
on conflict (sku_code) do nothing;
