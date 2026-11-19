-- AMANAH Front Desk role
-- Front Desk Officers are separate authenticated staff accounts.
-- This adds the role value only; permissions remain deny-by-default until
-- the dedicated product-code issuance RPCs and dashboard are deployed.

begin;

alter type public.amanah_role
  add value if not exists 'front_desk';

commit;
