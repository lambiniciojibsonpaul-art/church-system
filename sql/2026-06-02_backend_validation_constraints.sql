-- Backend validation guardrails for user/profile/request fields.
-- Run this in Supabase SQL Editor.
--
-- These CHECK constraints are marked NOT VALID so existing historical rows do
-- not block the migration, but all new inserts/updates must follow the rules.

do $$
declare
  rec record;
  constraint_name text;
  request_tables text[] := array[
    'profiles',
    'baptisms',
    'confirmations',
    'holy_communions',
    'weddings',
    'mass_intentions',
    'facilities_bookings',
    'certification_requests',
    'sacraments_liturgical',
    'attendance'
  ];
  name_part_columns text[] := array[
    'first_name', 'middle_name', 'last_name', 'surname',
    'child_first_name', 'child_middle_name', 'child_last_name', 'child_surname',
    'groom_first_name', 'groom_middle_name', 'groom_last_name', 'groom_surname',
    'bride_first_name', 'bride_middle_name', 'bride_last_name', 'bride_surname',
    'requestor_first_name', 'requestor_middle_name', 'requestor_surname',
    'record_holder_first_name', 'record_holder_middle_name', 'record_holder_surname',
    'full_name_first', 'full_name_middle', 'full_name_last',
    'requested_by_first', 'requested_by_middle', 'requested_by_last'
  ];
  full_name_columns text[] := array[
    'full_name',
    'father_name',
    'mother_maiden_name',
    'godfather_name',
    'godmother_name',
    'submitter_name',
    'submitter_signature',
    'requested_by',
    'guest_name',
    'name'
  ];
  free_text_columns text[] := array[
    'address',
    'complete_address',
    'groom_address',
    'bride_address',
    'sponsor1_address',
    'sponsor2_address',
    'description',
    'notes',
    'additional_notes',
    'setup_requirements',
    'equipment_needed',
    'event_purpose',
    'purpose',
    'purpose_other',
    'special_prayer_request',
    'request_specify',
    'rejection_remarks',
    'cancellation_remarks'
  ];
begin
  -- Email fields.
  for rec in
    select table_name, column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name = any(request_tables)
      and data_type in ('text', 'character varying')
      and column_name like '%email%'
  loop
    constraint_name := 'chk_' || substr(md5(rec.table_name || '_' || rec.column_name || '_email'), 1, 24);
    if not exists (
      select 1 from pg_constraint
      where conname = constraint_name
        and conrelid = format('public.%I', rec.table_name)::regclass
    ) then
      execute format(
        'alter table public.%I add constraint %I check (%I is null or btrim(%I) = '''' or %I ~ %L) not valid',
        rec.table_name,
        constraint_name,
        rec.column_name,
        rec.column_name,
        rec.column_name,
        '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      );
    end if;
  end loop;

  -- Contact/phone fields: exactly 11 digits when provided.
  for rec in
    select table_name, column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name = any(request_tables)
      and data_type in ('text', 'character varying')
      and (column_name like '%contact%' or column_name like '%phone%')
  loop
    constraint_name := 'chk_' || substr(md5(rec.table_name || '_' || rec.column_name || '_contact'), 1, 24);
    if not exists (
      select 1 from pg_constraint
      where conname = constraint_name
        and conrelid = format('public.%I', rec.table_name)::regclass
    ) then
      execute format(
        'alter table public.%I add constraint %I check (%I is null or btrim(%I) = '''' or regexp_replace(%I, ''[[:space:]]'', '''', ''g'') ~ %L) not valid',
        rec.table_name,
        constraint_name,
        rec.column_name,
        rec.column_name,
        rec.column_name,
        '^[0-9]{11}$'
      );
    end if;
  end loop;

  -- Split name fields: letters/spaces/apostrophe/dot/hyphen, max 60.
  for rec in
    select table_name, column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name = any(request_tables)
      and data_type in ('text', 'character varying')
      and column_name = any(name_part_columns)
  loop
    constraint_name := 'chk_' || substr(md5(rec.table_name || '_' || rec.column_name || '_namepart'), 1, 24);
    if not exists (
      select 1 from pg_constraint
      where conname = constraint_name
        and conrelid = format('public.%I', rec.table_name)::regclass
    ) then
      execute format(
        'alter table public.%I add constraint %I check (%I is null or btrim(%I) = '''' or (char_length(%I) <= 60 and %I ~ %L)) not valid',
        rec.table_name,
        constraint_name,
        rec.column_name,
        rec.column_name,
        rec.column_name,
        rec.column_name,
        '^[A-Za-zÀ-ÖØ-öø-ÿÑñ'' .-]+$'
      );
    end if;
  end loop;

  -- Combined name fields: same allowed characters, max 120.
  for rec in
    select table_name, column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name = any(request_tables)
      and data_type in ('text', 'character varying')
      and column_name = any(full_name_columns)
  loop
    constraint_name := 'chk_' || substr(md5(rec.table_name || '_' || rec.column_name || '_fullname'), 1, 24);
    if not exists (
      select 1 from pg_constraint
      where conname = constraint_name
        and conrelid = format('public.%I', rec.table_name)::regclass
    ) then
      execute format(
        'alter table public.%I add constraint %I check (%I is null or btrim(%I) = '''' or (char_length(%I) <= 120 and %I ~ %L)) not valid',
        rec.table_name,
        constraint_name,
        rec.column_name,
        rec.column_name,
        rec.column_name,
        rec.column_name,
        '^[A-Za-zÀ-ÖØ-öø-ÿÑñ'' .-]+$'
      );
    end if;
  end loop;

  -- Status fields: restrict to the values used by the application.
  for rec in
    select table_name, column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name = any(array_append(request_tables, 'events'))
      and data_type in ('text', 'character varying')
      and column_name = 'status'
  loop
    constraint_name := 'chk_' || substr(md5(rec.table_name || '_' || rec.column_name || '_status'), 1, 24);
    if not exists (
      select 1 from pg_constraint
      where conname = constraint_name
        and conrelid = format('public.%I', rec.table_name)::regclass
    ) then
      execute format(
        'alter table public.%I add constraint %I check (%I is null or %I in (''Pending'', ''Approved'', ''Rejected'', ''Cancelled'', ''Active'', ''Draft'', ''Published'', ''Archived'')) not valid',
        rec.table_name,
        constraint_name,
        rec.column_name,
        rec.column_name
      );
    end if;
  end loop;

  -- Numeric counts/ages/amount-like integer fields: keep positive and bounded.
  for rec in
    select table_name, column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name = any(request_tables)
      and data_type in ('integer', 'smallint', 'bigint')
      and column_name in ('expected_attendees', 'number_of_copies', 'current_age', 'groom_age', 'bride_age')
  loop
    constraint_name := 'chk_' || substr(md5(rec.table_name || '_' || rec.column_name || '_positive_int'), 1, 24);
    if not exists (
      select 1 from pg_constraint
      where conname = constraint_name
        and conrelid = format('public.%I', rec.table_name)::regclass
    ) then
      execute format(
        'alter table public.%I add constraint %I check (%I is null or (%I >= 0 and %I <= 10000)) not valid',
        rec.table_name,
        constraint_name,
        rec.column_name,
        rec.column_name,
        rec.column_name
      );
    end if;
  end loop;

  -- Attachment arrays: limit count and make sure arrays are not absurdly large.
  for rec in
    select table_name, column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name = any(request_tables)
      and column_name = 'attached_documents'
  loop
    constraint_name := 'chk_' || substr(md5(rec.table_name || '_' || rec.column_name || '_attachments'), 1, 24);
    if not exists (
      select 1 from pg_constraint
      where conname = constraint_name
        and conrelid = format('public.%I', rec.table_name)::regclass
    ) then
      execute format(
        'alter table public.%I add constraint %I check (%I is null or cardinality(%I) <= 10) not valid',
        rec.table_name,
        constraint_name,
        rec.column_name,
        rec.column_name
      );
    end if;
  end loop;

  -- Free text: do not over-restrict content, only prevent runaway payload sizes.
  for rec in
    select table_name, column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name = any(array_append(request_tables, 'events'))
      and data_type in ('text', 'character varying')
      and column_name = any(free_text_columns)
  loop
    constraint_name := 'chk_' || substr(md5(rec.table_name || '_' || rec.column_name || '_text_len'), 1, 24);
    if not exists (
      select 1 from pg_constraint
      where conname = constraint_name
        and conrelid = format('public.%I', rec.table_name)::regclass
    ) then
      execute format(
        'alter table public.%I add constraint %I check (%I is null or char_length(%I) <= 2000) not valid',
        rec.table_name,
        constraint_name,
        rec.column_name,
        rec.column_name
      );
    end if;
  end loop;
end $$;
