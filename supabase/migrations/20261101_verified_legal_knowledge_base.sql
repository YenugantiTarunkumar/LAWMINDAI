-- Milestone 8.1: versioned, human-approved Indian legal knowledge base.
-- This migration only defines database objects. It does not collect source
-- documents, create reviewer assignments, or approve any legal material.
--
-- Supabase requirements: auth.users/auth.uid(), storage.buckets/objects,
-- authenticated, anon, and service_role roles. SHA-256 values are calculated
-- from the uploaded object by a future trusted server-side ingestion service.
-- The database accepts artifact attestations only from service_role; until
-- that server boundary is implemented and deployed, versions cannot advance.

begin;

create extension if not exists pgcrypto with schema extensions;

do $migration$
begin
  if not exists (
    select 1
    from pg_catalog.pg_extension as ext
    join pg_catalog.pg_namespace as ns
      on ns.oid = ext.extnamespace
    where ext.extname = 'pgcrypto'
      and ns.nspname = 'extensions'
  ) then
    raise exception 'pgcrypto must be installed in the extensions schema for deterministic legal snapshot hashing';
  end if;
end;
$migration$;

create table public.legal_sources (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique
    check (source_key ~ '^[a-z0-9][a-z0-9._-]{0,127}$'),
  instrument_title text not null check (length(btrim(instrument_title)) > 0),
  instrument_type text not null
    check (instrument_type ~ '^[a-z][a-z0-9_]{0,63}$'),
  jurisdiction text not null check (jurisdiction = 'IN'),
  scope_description text not null check (length(btrim(scope_description)) > 0),
  issuing_authority text not null check (length(btrim(issuing_authority)) > 0),
  canonical_official_url text not null
    check (canonical_official_url ~ '^https://[^[:space:]]+$'),
  current_approved_version_id uuid,
  created_by uuid not null references auth.users(id) on delete restrict
    default auth.uid(),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);

create table public.legal_source_versions (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.legal_sources(id) on delete restrict,
  version_number integer not null check (version_number > 0),
  predecessor_version_id uuid,
  document_title text not null check (length(btrim(document_title)) > 0),
  instrument_type text not null
    check (instrument_type ~ '^[a-z][a-z0-9_]{0,63}$'),
  jurisdiction text not null check (jurisdiction = 'IN'),
  issuing_authority text not null check (length(btrim(issuing_authority)) > 0),
  official_source_url text not null
    check (official_source_url ~ '^https://[^[:space:]]+$'),
  publication_date date,
  publication_date_certainty text not null default 'unknown'
    check (publication_date_certainty in ('known', 'uncertain', 'unknown')),
  amendment_date date,
  amendment_date_certainty text not null default 'unknown'
    check (amendment_date_certainty in ('known', 'uncertain', 'unknown')),
  effective_date date,
  effective_date_certainty text not null default 'unknown'
    check (effective_date_certainty in ('known', 'uncertain', 'unknown')),
  lifecycle_status text not null default 'collected'
    check (lifecycle_status in (
      'collected',
      'extracted',
      'ai_reviewed',
      'pending_human_approval',
      'approved',
      'rejected',
      'superseded'
    )),
  content_sha256 text not null
    check (content_sha256 ~ '^[0-9a-f]{64}$'),
  artifact_integrity_status text not null default 'unverified'
    check (artifact_integrity_status in ('unverified', 'verified')),
  artifact_verified_at timestamptz,
  artifact_verified_by_service text,
  provision_snapshot_sha256 text
    check (
      provision_snapshot_sha256 is null
      or provision_snapshot_sha256 ~ '^[0-9a-f]{64}$'
    ),
  provision_snapshot_created_at timestamptz,
  storage_bucket text not null default 'legal-source-originals'
    check (storage_bucket = 'legal-source-originals'),
  storage_object_key text not null unique
    check (
      length(storage_object_key) > 0
      and storage_object_key !~ '(^/|(^|/)\.\.?(/|$)|\\)'
    ),
  mime_type text not null check (length(btrim(mime_type)) > 0),
  content_size_bytes bigint not null check (content_size_bytes > 0),
  captured_by uuid not null references auth.users(id) on delete restrict
    default auth.uid(),
  captured_at timestamptz not null default clock_timestamp(),
  extracted_at timestamptz,
  ai_reviewed_at timestamptz,
  submitted_for_approval_at timestamptz,
  approved_by uuid references auth.users(id) on delete restrict,
  approved_at timestamptz,
  approval_reason text,
  approval_hash text,
  approval_snapshot_sha256 text,
  approval_review_run_id uuid,
  approval_decision_run_id uuid,
  rejected_by uuid references auth.users(id) on delete restrict,
  rejected_at timestamptz,
  rejection_reason text,
  rejection_hash text,
  rejection_snapshot_sha256 text,
  rejection_review_run_id uuid,
  rejection_decision_run_id uuid,
  superseded_by_version_id uuid,
  superseded_at timestamptz,
  superseded_reason text,
  updated_at timestamptz not null default clock_timestamp(),
  constraint legal_source_versions_source_version_unique
    unique (source_id, version_number),
  constraint legal_source_versions_source_id_unique
    unique (source_id, id),
  constraint legal_source_versions_predecessor_same_source
    foreign key (source_id, predecessor_version_id)
    references public.legal_source_versions(source_id, id)
    on delete restrict,
  constraint legal_source_versions_superseded_same_source
    foreign key (source_id, superseded_by_version_id)
    references public.legal_source_versions(source_id, id)
    on delete restrict,
  constraint legal_source_versions_predecessor_order
    check (
      (version_number = 1 and predecessor_version_id is null)
      or (version_number > 1 and predecessor_version_id is not null)
    ),
  constraint legal_source_versions_effective_date_certainty
    check (
      (effective_date_certainty = 'known' and effective_date is not null)
      or (effective_date_certainty <> 'known')
    ),
  constraint legal_source_versions_artifact_attestation
    check (
      (
        artifact_integrity_status = 'verified'
        and artifact_verified_at is not null
        and artifact_verified_by_service = 'law-mind-ingestion-v1'
      )
      or (
        artifact_integrity_status = 'unverified'
        and artifact_verified_at is null
        and artifact_verified_by_service is null
      )
    ),
  constraint legal_source_versions_snapshot_attestation
    check (
      (
        provision_snapshot_sha256 is null
        and provision_snapshot_created_at is null
      )
      or (
        provision_snapshot_sha256 is not null
        and provision_snapshot_created_at is not null
        and lifecycle_status in (
          'ai_reviewed', 'pending_human_approval', 'approved',
          'rejected', 'superseded'
        )
      )
    ),
  constraint legal_source_versions_publication_date_certainty
    check (
      (publication_date_certainty = 'known' and publication_date is not null)
      or (publication_date_certainty <> 'known')
    ),
  constraint legal_source_versions_amendment_date_certainty
    check (
      (amendment_date_certainty = 'known' and amendment_date is not null)
      or (amendment_date_certainty <> 'known')
    ),
  constraint legal_source_versions_lifecycle_timestamps
    check (
      (
        lifecycle_status = 'collected'
        and extracted_at is null
        and ai_reviewed_at is null
        and submitted_for_approval_at is null
      )
      or (
        lifecycle_status = 'extracted'
        and extracted_at is not null
        and ai_reviewed_at is null
        and submitted_for_approval_at is null
      )
      or (
        lifecycle_status = 'ai_reviewed'
        and extracted_at is not null
        and ai_reviewed_at is not null
        and submitted_for_approval_at is null
      )
      or (
        lifecycle_status in (
          'pending_human_approval', 'approved', 'rejected', 'superseded'
        )
        and extracted_at is not null
        and ai_reviewed_at is not null
        and submitted_for_approval_at is not null
      )
    ),
  constraint legal_source_versions_approval_fields
    check (
      (
        lifecycle_status in ('approved', 'superseded')
        and approved_by is not null
        and approved_at is not null
        and approval_reason is not null
        and length(btrim(approval_reason)) >= 10
        and approval_hash is not null
        and approval_hash = content_sha256
        and approval_snapshot_sha256 is not null
        and approval_snapshot_sha256 = provision_snapshot_sha256
        and approval_review_run_id is not null
        and approval_decision_run_id is not null
      )
      or (
        lifecycle_status not in ('approved', 'superseded')
        and approved_by is null
        and approved_at is null
        and approval_reason is null
        and approval_hash is null
        and approval_snapshot_sha256 is null
        and approval_review_run_id is null
        and approval_decision_run_id is null
      )
    ),
  constraint legal_source_versions_rejection_fields
    check (
      (
        lifecycle_status = 'rejected'
        and rejected_by is not null
        and rejected_at is not null
        and rejection_reason is not null
        and length(btrim(rejection_reason)) >= 10
        and rejection_hash is not null
        and rejection_hash = content_sha256
        and rejection_snapshot_sha256 is not null
        and rejection_snapshot_sha256 = provision_snapshot_sha256
        and rejection_review_run_id is not null
        and rejection_decision_run_id is not null
      )
      or (
        lifecycle_status <> 'rejected'
        and rejected_by is null
        and rejected_at is null
        and rejection_reason is null
        and rejection_hash is null
        and rejection_snapshot_sha256 is null
        and rejection_review_run_id is null
        and rejection_decision_run_id is null
      )
    ),
  constraint legal_source_versions_superseded_fields
    check (
      (
        lifecycle_status = 'superseded'
        and superseded_by_version_id is not null
        and superseded_at is not null
        and superseded_reason is not null
        and length(btrim(superseded_reason)) >= 10
      )
      or (
        lifecycle_status <> 'superseded'
        and superseded_by_version_id is null
        and superseded_at is null
        and superseded_reason is null
      )
    )
);

alter table public.legal_sources
  add constraint legal_sources_current_version_same_source
  foreign key (id, current_approved_version_id)
  references public.legal_source_versions(source_id, id)
  on delete restrict;

create table public.legal_provisions (
  id uuid primary key default gen_random_uuid(),
  source_version_id uuid not null
    references public.legal_source_versions(id) on delete restrict,
  provision_identifier text not null
    check (length(btrim(provision_identifier)) > 0),
  revision_number integer not null default 1 check (revision_number > 0),
  supersedes_provision_id uuid,
  provision_title text,
  extracted_text text,
  text_sha256 text
    check (text_sha256 is null or text_sha256 ~ '^[0-9a-f]{64}$'),
  effective_date date,
  effective_date_certainty text not null default 'unknown'
    check (effective_date_certainty in ('known', 'uncertain', 'unknown')),
  extraction_status text not null
    check (extraction_status in ('extracted', 'partial', 'needs_ocr')),
  page_start integer check (page_start is null or page_start > 0),
  page_end integer check (page_end is null or page_end > 0),
  paragraph_start integer
    check (paragraph_start is null or paragraph_start > 0),
  paragraph_end integer
    check (paragraph_end is null or paragraph_end > 0),
  provenance jsonb not null default '{}'::jsonb
    check (jsonb_typeof(provenance) = 'object'),
  created_by uuid not null references auth.users(id) on delete restrict
    default auth.uid(),
  created_at timestamptz not null default clock_timestamp(),
  constraint legal_provisions_version_identifier_unique
    unique (source_version_id, provision_identifier, revision_number),
  constraint legal_provisions_source_version_id_unique
    unique (source_version_id, id),
  constraint legal_provisions_superseded_revision_same_version
    foreign key (source_version_id, supersedes_provision_id)
    references public.legal_provisions(source_version_id, id)
    on delete restrict,
  constraint legal_provisions_revision_order
    check (
      (revision_number = 1 and supersedes_provision_id is null)
      or (revision_number > 1 and supersedes_provision_id is not null)
    ),
  constraint legal_provisions_effective_date_certainty
    check (
      (effective_date_certainty = 'known' and effective_date is not null)
      or (effective_date_certainty <> 'known')
    ),
  constraint legal_provisions_page_range
    check (page_start is null or page_end is null or page_end >= page_start),
  constraint legal_provisions_paragraph_range
    check (
      paragraph_start is null
      or paragraph_end is null
      or paragraph_end >= paragraph_start
    ),
  constraint legal_provisions_extracted_content
    check (
      (
        extraction_status = 'needs_ocr'
        and extracted_text is null
        and text_sha256 is null
      )
      or (
        extraction_status in ('extracted', 'partial')
        and extracted_text is not null
        and length(btrim(extracted_text)) > 0
        and text_sha256 is not null
      )
    )
);

create table public.legal_review_runs (
  id uuid primary key default gen_random_uuid(),
  source_version_id uuid not null
    references public.legal_source_versions(id) on delete restrict,
  content_sha256 text not null
    check (content_sha256 ~ '^[0-9a-f]{64}$'),
  artifact_readback_sha256 text
    check (
      artifact_readback_sha256 is null
      or artifact_readback_sha256 ~ '^[0-9a-f]{64}$'
    ),
  artifact_readback_at timestamptz,
  provision_snapshot_sha256 text not null
    check (provision_snapshot_sha256 ~ '^[0-9a-f]{64}$'),
  run_type text not null
    check (run_type in ('ai_extraction', 'ai_verification', 'human_review')),
  run_status text not null check (run_status in ('completed', 'failed')),
  provider text check (provider is null or provider in ('openai', 'anthropic')),
  model text,
  prompt_version text,
  schema_version text not null,
  findings jsonb not null default '{}'::jsonb
    check (jsonb_typeof(findings) = 'object'),
  evidence jsonb not null default '[]'::jsonb
    check (jsonb_typeof(evidence) = 'array'),
  confidence numeric(4, 3)
    check (confidence is null or confidence between 0 and 1),
  limitations text[] not null default '{}',
  created_by uuid references auth.users(id) on delete restrict
    default auth.uid(),
  attested_by uuid references auth.users(id) on delete restrict,
  trusted_service_actor text,
  trusted_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  completed_at timestamptz,
  constraint legal_review_runs_snapshot_binding
    unique (source_version_id, id, content_sha256, provision_snapshot_sha256),
  constraint legal_review_runs_ai_metadata
    check (
      (
        run_type in ('ai_extraction', 'ai_verification')
        and provider is not null
        and model is not null
        and length(btrim(model)) > 0
        and prompt_version is not null
        and length(btrim(prompt_version)) > 0
        and schema_version is not null
        and length(btrim(schema_version)) > 0
        and created_by is null
        and trusted_service_actor = 'law-mind-ai-review-v1'
        and trusted_at is not null
        and artifact_readback_sha256 = content_sha256
        and artifact_readback_at is not null
        and (
          (run_status = 'completed' and attested_by is not null)
          or (run_status = 'failed' and attested_by is null)
        )
      )
      or (
        run_type = 'human_review'
        and provider is null
        and model is null
        and prompt_version is null
        and schema_version is not null
        and length(btrim(schema_version)) > 0
        and created_by is not null
        and attested_by is null
        and trusted_service_actor is null
        and trusted_at is null
        and artifact_readback_sha256 is null
        and artifact_readback_at is null
      )
    ),
  constraint legal_review_runs_completion_time
    check (
      (run_status = 'completed' and completed_at is not null)
      or (run_status = 'failed' and completed_at is null)
    )
);

alter table public.legal_source_versions
  add constraint legal_source_versions_approval_review_run
  foreign key (id, approval_review_run_id, content_sha256, approval_snapshot_sha256)
  references public.legal_review_runs(
    source_version_id, id, content_sha256, provision_snapshot_sha256
  ) on delete restrict;

alter table public.legal_source_versions
  add constraint legal_source_versions_approval_decision_run
  foreign key (id, approval_decision_run_id, content_sha256, approval_snapshot_sha256)
  references public.legal_review_runs(
    source_version_id, id, content_sha256, provision_snapshot_sha256
  ) on delete restrict;

alter table public.legal_source_versions
  add constraint legal_source_versions_rejection_review_run
  foreign key (id, rejection_review_run_id, content_sha256, rejection_snapshot_sha256)
  references public.legal_review_runs(
    source_version_id, id, content_sha256, provision_snapshot_sha256
  ) on delete restrict;

alter table public.legal_source_versions
  add constraint legal_source_versions_rejection_decision_run
  foreign key (id, rejection_decision_run_id, content_sha256, rejection_snapshot_sha256)
  references public.legal_review_runs(
    source_version_id, id, content_sha256, provision_snapshot_sha256
  ) on delete restrict;

create table public.legal_source_reviewers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete restrict,
  is_active boolean not null default true,
  capabilities text[] not null
    check (
      cardinality(capabilities) > 0
      and capabilities <@ array['collect', 'extract', 'verify', 'approve']::text[]
    ),
  jurisdiction_scope text[] not null default array['IN']::text[]
    check (
      cardinality(jurisdiction_scope) > 0
      and jurisdiction_scope <@ array['IN']::text[]
    ),
  instrument_type_scope text[] not null default array['*']::text[]
    check (cardinality(instrument_type_scope) > 0),
  granted_by uuid not null references auth.users(id) on delete restrict,
  granted_at timestamptz not null default clock_timestamp(),
  revoked_by uuid references auth.users(id) on delete restrict,
  revoked_at timestamptz,
  grant_reason text not null check (length(btrim(grant_reason)) >= 10),
  constraint legal_source_reviewers_revocation_fields
    check (
      (is_active and revoked_at is null and revoked_by is null)
      or (not is_active and revoked_at is not null and revoked_by is not null)
    )
);

create table public.legal_source_audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete restrict,
  service_actor text,
  event_type text not null
    check (event_type in (
      'source_registered',
      'source_version_collected',
      'provision_recorded',
      'ai_review_run_recorded',
      'human_review_run_recorded',
      'version_stage_advanced',
      'version_approved',
      'version_rejected',
      'version_superseded'
    )),
  occurred_at timestamptz not null default clock_timestamp(),
  source_id uuid not null references public.legal_sources(id) on delete restrict,
  source_version_id uuid references public.legal_source_versions(id)
    on delete restrict,
  content_sha256 text
    check (content_sha256 is null or content_sha256 ~ '^[0-9a-f]{64}$'),
  previous_state text,
  new_state text,
  reason text,
  related_review_run_id uuid references public.legal_review_runs(id)
    on delete restrict,
  details jsonb not null default '{}'::jsonb
    check (jsonb_typeof(details) = 'object')
);

create index legal_source_versions_source_status_idx
  on public.legal_source_versions(source_id, lifecycle_status, version_number desc);
create index legal_source_versions_current_lookup_idx
  on public.legal_source_versions(id, source_id, effective_date)
  where lifecycle_status = 'approved';
create index legal_provisions_version_idx
  on public.legal_provisions(
    source_version_id, provision_identifier, revision_number desc
  );
create index legal_review_runs_version_hash_idx
  on public.legal_review_runs(source_version_id, content_sha256, run_type, run_status);
create index legal_source_reviewers_active_user_idx
  on public.legal_source_reviewers(user_id)
  where is_active;
create index legal_source_audit_events_source_time_idx
  on public.legal_source_audit_events(source_id, occurred_at desc);
create index legal_source_audit_events_version_time_idx
  on public.legal_source_audit_events(source_version_id, occurred_at desc);

create function public.has_legal_source_capability(
  p_capability text,
  p_source_id uuid default null,
  p_jurisdiction text default null,
  p_instrument_type text default null
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  select exists (
    select 1
    from public.legal_source_reviewers as reviewer
    left join public.legal_sources as source
      on source.id = p_source_id
    where reviewer.user_id = auth.uid()
      and reviewer.is_active
      and p_capability = any (reviewer.capabilities)
      and (
        (
          p_source_id is not null
          and source.id is not null
          and source.jurisdiction = any (reviewer.jurisdiction_scope)
          and (
            '*' = any (reviewer.instrument_type_scope)
            or source.instrument_type = any (reviewer.instrument_type_scope)
          )
        )
        or (
          p_source_id is null
          and p_jurisdiction is not null
          and p_instrument_type is not null
          and p_jurisdiction = any (reviewer.jurisdiction_scope)
          and (
            '*' = any (reviewer.instrument_type_scope)
            or p_instrument_type = any (reviewer.instrument_type_scope)
          )
        )
      )
  );
$function$;

create function public.has_legal_source_capability_for_user(
  p_user_id uuid,
  p_capability text,
  p_source_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  select exists (
    select 1
    from public.legal_source_reviewers as reviewer
    join public.legal_sources as source
      on source.id = p_source_id
    where reviewer.user_id = p_user_id
      and reviewer.is_active
      and p_capability = any (reviewer.capabilities)
      and source.jurisdiction = any (reviewer.jurisdiction_scope)
      and (
        '*' = any (reviewer.instrument_type_scope)
        or source.instrument_type = any (reviewer.instrument_type_scope)
      )
  );
$function$;

create function public.compute_legal_provision_snapshot_sha256(
  p_source_version_id uuid
)
returns text
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  with latest_provisions as (
    select distinct on (provision.provision_identifier collate "C")
      provision.id,
      provision.provision_identifier,
      provision.revision_number,
      provision.supersedes_provision_id,
      provision.provision_title,
      provision.extracted_text,
      provision.text_sha256,
      provision.effective_date,
      provision.effective_date_certainty,
      provision.extraction_status,
      provision.page_start,
      provision.page_end,
      provision.paragraph_start,
      provision.paragraph_end,
      provision.provenance
    from public.legal_provisions as provision
    where provision.source_version_id = p_source_version_id
    order by
      provision.provision_identifier collate "C",
      provision.revision_number desc,
      provision.id desc
  ),
  snapshot_payload as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', id,
          'identifier', provision_identifier,
          'revision', revision_number,
          'supersedes', supersedes_provision_id,
          'title', provision_title,
          'text', extracted_text,
          'text_sha256', text_sha256,
          'effective_date', effective_date,
          'effective_date_certainty', effective_date_certainty,
          'extraction_status', extraction_status,
          'page_start', page_start,
          'page_end', page_end,
          'paragraph_start', paragraph_start,
          'paragraph_end', paragraph_end,
          'provenance', provenance
        )
        order by provision_identifier collate "C", id
      )::text,
      '[]'
    ) as canonical_json
    from latest_provisions
  )
  select case
    when exists (
      select 1
      from public.legal_source_versions as version
      where version.id = p_source_version_id
    )
    then encode(
      extensions.digest(
        convert_to(
          'lawmind-legal-provision-snapshot-v1:' || snapshot_payload.canonical_json,
          'UTF8'
        ),
        'sha256'
      ),
      'hex'
    )
    else null
  end
  from snapshot_payload;
$function$;

-- A trusted ingestion service must upload to a fresh private object key, read
-- that object back, compute SHA-256 from the returned bytes, and then call this
-- function. It must never overwrite or delete a registered object. This
-- function checks the service identity, stored object and size; the hash input
-- and captured metadata are trusted only because callers are restricted to
-- service_role and must be generated/verified server-side, never forwarded
-- from browser claims.
-- No app integration exists yet, so ordinary users cannot create source
-- versions or attest artifacts.
create function public.register_legal_source_version(
  p_source_id uuid,
  p_version_number integer,
  p_predecessor_version_id uuid,
  p_document_title text,
  p_publication_date date,
  p_publication_date_certainty text,
  p_amendment_date date,
  p_amendment_date_certainty text,
  p_effective_date date,
  p_effective_date_certainty text,
  p_content_sha256 text,
  p_storage_object_key text,
  p_mime_type text,
  p_content_size_bytes bigint,
  p_captured_by uuid
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  source_row public.legal_sources%rowtype;
  new_version_id uuid := gen_random_uuid();
  object_size bigint;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Trusted ingestion service identity is required';
  end if;

  if p_content_sha256 is null
    or p_content_sha256 !~ '^[0-9a-f]{64}$'
    or p_content_size_bytes is null
    or p_content_size_bytes <= 0 then
    raise exception 'A valid server-computed artifact hash and size are required';
  end if;

  if not public.has_legal_source_capability_for_user(
    p_captured_by, 'collect', p_source_id
  ) then
    raise exception 'The capture actor lacks collection capability for this source';
  end if;

  select * into source_row
  from public.legal_sources as source
  where source.id = p_source_id
  for update;
  if not found then
    raise exception 'Legal source does not exist';
  end if;

  select case
      when coalesce(stored_object.metadata ->> 'size', '') ~ '^[0-9]+$'
        then (stored_object.metadata ->> 'size')::bigint
      else null
    end
  into object_size
  from storage.objects as stored_object
  where stored_object.bucket_id = 'legal-source-originals'
    and stored_object.name = p_storage_object_key;

  if not found or object_size is distinct from p_content_size_bytes then
    raise exception 'The private uploaded object is missing or its stored size does not match';
  end if;

  perform set_config(
    'lawmind.legal_artifact_registration',
    'law-mind-ingestion-v1',
    true
  );
  perform set_config('lawmind.legal_actor', p_captured_by::text, true);
  perform set_config('lawmind.legal_artifact_hash', p_content_sha256, true);

  insert into public.legal_source_versions (
    id,
    source_id,
    version_number,
    predecessor_version_id,
    document_title,
    instrument_type,
    jurisdiction,
    issuing_authority,
    official_source_url,
    publication_date,
    publication_date_certainty,
    amendment_date,
    amendment_date_certainty,
    effective_date,
    effective_date_certainty,
    lifecycle_status,
    content_sha256,
    artifact_integrity_status,
    artifact_verified_at,
    artifact_verified_by_service,
    storage_bucket,
    storage_object_key,
    mime_type,
    content_size_bytes,
    captured_by
  ) values (
    new_version_id,
    p_source_id,
    p_version_number,
    p_predecessor_version_id,
    p_document_title,
    source_row.instrument_type,
    source_row.jurisdiction,
    source_row.issuing_authority,
    source_row.canonical_official_url,
    p_publication_date,
    p_publication_date_certainty,
    p_amendment_date,
    p_amendment_date_certainty,
    p_effective_date,
    p_effective_date_certainty,
    'collected',
    p_content_sha256,
    'verified',
    clock_timestamp(),
    'law-mind-ingestion-v1',
    'legal-source-originals',
    p_storage_object_key,
    p_mime_type,
    p_content_size_bytes,
    p_captured_by
  );

  return new_version_id;
end;
$function$;

-- Before calling, the trusted service must re-read the private object and
-- recompute its SHA-256 from those bytes. This operation records a completed
-- AI verification against the immutable source hash and canonical provision
-- snapshot, then freezes the version at ai_reviewed in the same transaction.
-- The supplied attestor must be an active, database-assigned verifier; the
-- eventual approver must differ.
create function public.record_trusted_ai_review_run(
  p_source_version_id uuid,
  p_content_sha256 text,
  p_artifact_readback_sha256 text,
  p_provision_snapshot_sha256 text,
  p_attested_by uuid,
  p_provider text,
  p_model text,
  p_prompt_version text,
  p_schema_version text,
  p_findings jsonb,
  p_evidence jsonb,
  p_confidence numeric,
  p_limitations text[]
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  version_row public.legal_source_versions%rowtype;
  run_id uuid := gen_random_uuid();
  run_time timestamptz := clock_timestamp();
  computed_snapshot text;
  object_size bigint;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Trusted AI review service identity is required';
  end if;

  if p_content_sha256 is null
    or p_content_sha256 !~ '^[0-9a-f]{64}$'
    or p_artifact_readback_sha256 is distinct from p_content_sha256
    or p_provision_snapshot_sha256 is null
    or p_provision_snapshot_sha256 !~ '^[0-9a-f]{64}$'
    or p_evidence is null
    or jsonb_typeof(p_evidence) <> 'array'
    or jsonb_array_length(p_evidence) = 0 then
    raise exception 'A valid source hash, snapshot hash, and evidence array are required';
  end if;

  select * into version_row
  from public.legal_source_versions as version
  where version.id = p_source_version_id
  for update;
  if not found
    or version_row.lifecycle_status <> 'extracted'
    or version_row.artifact_integrity_status <> 'verified'
    or version_row.content_sha256 <> p_content_sha256 then
    raise exception 'Only an extracted, artifact-verified version with the exact source hash can be reviewed';
  end if;

  select case
      when coalesce(stored_object.metadata ->> 'size', '') ~ '^[0-9]+$'
        then (stored_object.metadata ->> 'size')::bigint
      else null
    end
  into object_size
  from storage.objects as stored_object
  where stored_object.bucket_id = version_row.storage_bucket
    and stored_object.name = version_row.storage_object_key;
  if not found or object_size is distinct from version_row.content_size_bytes then
    raise exception 'The private source object is missing or its size has changed';
  end if;

  computed_snapshot :=
    public.compute_legal_provision_snapshot_sha256(version_row.id);
  if computed_snapshot is distinct from p_provision_snapshot_sha256 then
    raise exception 'Provision snapshot hash does not match the current extracted provisions';
  end if;

  if not public.has_legal_source_capability_for_user(
    p_attested_by, 'verify', version_row.source_id
  ) then
    raise exception 'AI verification attestor lacks active verifier capability';
  end if;

  if p_provider is null
    or p_provider not in ('openai', 'anthropic')
    or coalesce(length(btrim(p_model)), 0) = 0
    or coalesce(length(btrim(p_prompt_version)), 0) = 0
    or coalesce(length(btrim(p_schema_version)), 0) = 0
    or p_findings is null
    or jsonb_typeof(p_findings) <> 'object' then
    raise exception 'AI review metadata does not satisfy the required schema';
  end if;

  perform set_config('lawmind.trusted_ai_review_run', run_id::text, true);
  perform set_config('lawmind.legal_actor', p_attested_by::text, true);
  insert into public.legal_review_runs (
    id,
    source_version_id,
    content_sha256,
    artifact_readback_sha256,
    artifact_readback_at,
    provision_snapshot_sha256,
    run_type,
    run_status,
    provider,
    model,
    prompt_version,
    schema_version,
    findings,
    evidence,
    confidence,
    limitations,
    created_by,
    attested_by,
    trusted_service_actor,
    trusted_at,
    created_at,
    completed_at
  ) values (
    run_id,
    version_row.id,
    version_row.content_sha256,
    p_artifact_readback_sha256,
    run_time,
    computed_snapshot,
    'ai_verification',
    'completed',
    p_provider,
    p_model,
    p_prompt_version,
    p_schema_version,
    p_findings,
    p_evidence,
    p_confidence,
    coalesce(p_limitations, '{}'),
    null,
    p_attested_by,
    'law-mind-ai-review-v1',
    run_time,
    run_time,
    run_time
  );

  perform set_config('lawmind.legal_source_transition', version_row.id::text, true);
  perform set_config(
    'lawmind.legal_source_reason',
    'Trusted AI verification completed for the exact artifact and provision snapshot.',
    true
  );
  update public.legal_source_versions
  set lifecycle_status = 'ai_reviewed',
      ai_reviewed_at = run_time,
      provision_snapshot_sha256 = computed_snapshot,
      provision_snapshot_created_at = run_time
  where id = version_row.id;

  return run_id;
end;
$function$;

create function public.is_current_approved_legal_version(p_version_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  select exists (
    select 1
    from public.legal_source_versions as version
    join public.legal_sources as source
      on source.id = version.source_id
    where version.id = p_version_id
      and source.current_approved_version_id = version.id
      and version.lifecycle_status = 'approved'
      and version.artifact_integrity_status = 'verified'
      and version.provision_snapshot_sha256
        = public.compute_legal_provision_snapshot_sha256(version.id)
      and version.effective_date_certainty = 'known'
      and version.effective_date <= current_date
      and (version.publication_date is null or version.publication_date <= current_date)
  );
$function$;

create function public.is_latest_legal_provision_revision(
  p_source_version_id uuid,
  p_provision_identifier text,
  p_revision_number integer
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  select not exists (
    select 1
    from public.legal_provisions as newer
    where newer.source_version_id = p_source_version_id
      and newer.provision_identifier = p_provision_identifier
      and newer.revision_number > p_revision_number
  );
$function$;

create function public.can_access_legal_source_object(
  p_object_key text,
  p_action text
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  select exists (
    select 1
    from public.legal_source_versions as version
    where version.storage_object_key = p_object_key
      and p_action = 'read'
      and (
        public.has_legal_source_capability('collect', version.source_id)
        or public.has_legal_source_capability('extract', version.source_id)
        or public.has_legal_source_capability('verify', version.source_id)
        or public.has_legal_source_capability('approve', version.source_id)
        )
  );
$function$;

create function public.guard_legal_source_identity()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $function$
begin
  if tg_op = 'DELETE' then
    raise exception 'Legal source registry records cannot be deleted';
  end if;

  if tg_op = 'INSERT' then
    if new.created_by is distinct from auth.uid() then
      raise exception 'Legal source creator must be the authenticated user';
    end if;
    return new;
  end if;

  if row(
    new.source_key,
    new.instrument_title,
    new.instrument_type,
    new.jurisdiction,
    new.scope_description,
    new.issuing_authority,
    new.canonical_official_url,
    new.created_by,
    new.created_at
  ) is distinct from row(
    old.source_key,
    old.instrument_title,
    old.instrument_type,
    old.jurisdiction,
    old.scope_description,
    old.issuing_authority,
    old.canonical_official_url,
    old.created_by,
    old.created_at
  ) then
    raise exception 'Legal source identity and provenance are immutable';
  end if;

  if new.current_approved_version_id is distinct from old.current_approved_version_id then
    if current_setting('lawmind.legal_source_pointer', true) is distinct from old.id::text then
      raise exception 'The current legal source version may only be changed by the decision operation';
    end if;

    if new.current_approved_version_id is not null
      and not exists (
        select 1
        from public.legal_source_versions as version
        where version.id = new.current_approved_version_id
          and version.source_id = old.id
          and version.lifecycle_status = 'approved'
          and version.effective_date_certainty = 'known'
          and version.effective_date <= current_date
          and (version.publication_date is null or version.publication_date <= current_date)
      ) then
      raise exception 'Current pointer must identify an effective approved version';
    end if;
  end if;

  new.updated_at := clock_timestamp();
  return new;
end;
$function$;

create function public.guard_legal_source_version()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  expected_predecessor_number integer;
  stored_object_size bigint;
begin
  if tg_op = 'DELETE' then
    raise exception 'Legal source versions are immutable and cannot be deleted';
  end if;

  if tg_op = 'INSERT' then
    if new.lifecycle_status <> 'collected'
      or auth.role() is distinct from 'service_role'
      or current_setting('lawmind.legal_artifact_registration', true)
        is distinct from 'law-mind-ingestion-v1'
      or new.captured_by is distinct from
        nullif(current_setting('lawmind.legal_actor', true), '')::uuid
      or new.content_sha256 is distinct from
        current_setting('lawmind.legal_artifact_hash', true)
      or new.artifact_integrity_status <> 'verified'
      or new.artifact_verified_at is null
      or new.artifact_verified_by_service <> 'law-mind-ingestion-v1'
      or new.provision_snapshot_sha256 is not null
      or new.provision_snapshot_created_at is not null
      or new.approved_by is not null
      or new.approved_at is not null
      or new.approval_reason is not null
      or new.approval_hash is not null
      or new.approval_snapshot_sha256 is not null
      or new.approval_review_run_id is not null
      or new.approval_decision_run_id is not null
      or new.rejected_by is not null
      or new.rejected_at is not null
      or new.rejection_reason is not null
      or new.rejection_hash is not null
      or new.rejection_snapshot_sha256 is not null
      or new.rejection_review_run_id is not null
      or new.rejection_decision_run_id is not null
      or new.superseded_by_version_id is not null
      or new.superseded_at is not null
      or new.superseded_reason is not null then
      raise exception 'A new legal source version must be an unapproved collected version';
    end if;

    select case
        when coalesce(stored_object.metadata ->> 'size', '') ~ '^[0-9]+$'
          then (stored_object.metadata ->> 'size')::bigint
        else null
      end
    into stored_object_size
    from storage.objects as stored_object
    where stored_object.bucket_id = new.storage_bucket
      and stored_object.name = new.storage_object_key;
    if not found or stored_object_size is distinct from new.content_size_bytes then
      raise exception 'Verified source object is missing or its stored size does not match';
    end if;

    if new.version_number = 1 then
      if exists (
        select 1 from public.legal_source_versions
        where source_id = new.source_id
      ) then
        raise exception 'The first source version number must be unique and equal to one';
      end if;
    else
      select version.version_number
      into expected_predecessor_number
      from public.legal_source_versions as version
      where version.id = new.predecessor_version_id
        and version.source_id = new.source_id
      for share;

      if expected_predecessor_number is null
        or new.version_number <> expected_predecessor_number + 1 then
        raise exception 'A source version must directly follow its predecessor';
      end if;
    end if;

    if not exists (
      select 1
      from public.legal_sources as source
      where source.id = new.source_id
        and source.jurisdiction = new.jurisdiction
        and source.instrument_type = new.instrument_type
    ) then
      raise exception 'Version jurisdiction and instrument type must match its source';
    end if;
    return new;
  end if;

  if row(
    new.source_id,
    new.version_number,
    new.predecessor_version_id,
    new.document_title,
    new.instrument_type,
    new.jurisdiction,
    new.issuing_authority,
    new.official_source_url,
    new.publication_date,
    new.publication_date_certainty,
    new.amendment_date,
    new.amendment_date_certainty,
    new.effective_date,
    new.effective_date_certainty,
    new.content_sha256,
    new.artifact_integrity_status,
    new.artifact_verified_at,
    new.artifact_verified_by_service,
    new.storage_bucket,
    new.storage_object_key,
    new.mime_type,
    new.content_size_bytes,
    new.captured_by,
    new.captured_at
  ) is distinct from row(
    old.source_id,
    old.version_number,
    old.predecessor_version_id,
    old.document_title,
    old.instrument_type,
    old.jurisdiction,
    old.issuing_authority,
    old.official_source_url,
    old.publication_date,
    old.publication_date_certainty,
    old.amendment_date,
    old.amendment_date_certainty,
    old.effective_date,
    old.effective_date_certainty,
    old.content_sha256,
    old.artifact_integrity_status,
    old.artifact_verified_at,
    old.artifact_verified_by_service,
    old.storage_bucket,
    old.storage_object_key,
    old.mime_type,
    old.content_size_bytes,
    old.captured_by,
    old.captured_at
  ) then
    raise exception 'Captured legal source content and provenance are immutable';
  end if;

  if current_setting('lawmind.legal_source_transition', true) is distinct from old.id::text then
    raise exception 'Legal source lifecycle changes must use a controlled database operation';
  end if;

  if new.provision_snapshot_sha256 is distinct from old.provision_snapshot_sha256 then
    if not (
      old.lifecycle_status = 'extracted'
      and new.lifecycle_status = 'ai_reviewed'
      and old.provision_snapshot_sha256 is null
      and new.provision_snapshot_sha256 =
        public.compute_legal_provision_snapshot_sha256(old.id)
      and new.provision_snapshot_created_at is not null
    ) then
      raise exception 'Provision snapshots are immutable once AI review begins';
    end if;
  elsif new.provision_snapshot_created_at is distinct from old.provision_snapshot_created_at then
    raise exception 'Provision snapshot timestamp is immutable';
  end if;

  if not (
    (old.lifecycle_status = 'collected' and new.lifecycle_status = 'extracted')
    or (
      old.lifecycle_status = 'extracted'
      and new.lifecycle_status = 'ai_reviewed'
      and new.provision_snapshot_sha256 is not null
    )
    or (old.lifecycle_status = 'ai_reviewed' and new.lifecycle_status = 'pending_human_approval')
    or (old.lifecycle_status = 'pending_human_approval' and new.lifecycle_status in ('approved', 'rejected'))
    or (old.lifecycle_status = 'approved' and new.lifecycle_status = 'superseded')
  ) then
    raise exception 'Invalid legal source lifecycle transition: % -> %',
      old.lifecycle_status, new.lifecycle_status;
  end if;

  if new.lifecycle_status in (
    'extracted', 'ai_reviewed', 'pending_human_approval',
    'approved', 'rejected', 'superseded'
  ) then
    if new.artifact_integrity_status <> 'verified'
      or new.artifact_verified_at is null
      or new.artifact_verified_by_service <> 'law-mind-ingestion-v1' then
      raise exception 'An unverified artifact cannot advance through review';
    end if;
  end if;

  if new.lifecycle_status in ('extracted', 'ai_reviewed', 'pending_human_approval') then
    select case
        when coalesce(stored_object.metadata ->> 'size', '') ~ '^[0-9]+$'
          then (stored_object.metadata ->> 'size')::bigint
        else null
      end
    into stored_object_size
    from storage.objects as stored_object
    where stored_object.bucket_id = new.storage_bucket
      and stored_object.name = new.storage_object_key;
    if not found or stored_object_size is distinct from new.content_size_bytes then
      raise exception 'Verified source object is missing or its stored size has changed';
    end if;
  end if;

  if new.lifecycle_status in ('ai_reviewed', 'pending_human_approval') then
    if new.provision_snapshot_sha256 is distinct from
        public.compute_legal_provision_snapshot_sha256(new.id)
      or not exists (
        select 1
        from public.legal_review_runs as run
        where run.source_version_id = new.id
          and run.content_sha256 = new.content_sha256
          and run.provision_snapshot_sha256 = new.provision_snapshot_sha256
          and run.run_type = 'ai_verification'
          and run.run_status = 'completed'
          and run.trusted_service_actor = 'law-mind-ai-review-v1'
          and run.trusted_at is not null
          and run.attested_by is not null
          and jsonb_array_length(run.evidence) > 0
      ) then
      raise exception 'A trusted completed AI review of the exact source and provision snapshot is required';
    end if;
  end if;

  if new.lifecycle_status = 'approved' then
    if new.approved_by is distinct from auth.uid()
      or new.approved_at is null
      or new.approval_reason is null
      or length(btrim(new.approval_reason)) < 10
      or new.approval_hash is null
      or new.approval_hash is distinct from old.content_sha256
      or new.approval_snapshot_sha256 is distinct from old.provision_snapshot_sha256
      or new.approval_review_run_id is null
      or new.approval_decision_run_id is null
      or new.rejected_by is not null
      or new.rejection_review_run_id is not null
      or not exists (
        select 1
        from public.legal_review_runs as decision_run
        where decision_run.id = new.approval_decision_run_id
          and decision_run.source_version_id = old.id
          and decision_run.content_sha256 = old.content_sha256
          and decision_run.provision_snapshot_sha256 = old.provision_snapshot_sha256
          and decision_run.run_type = 'human_review'
          and decision_run.run_status = 'completed'
          and decision_run.created_by = auth.uid()
          and decision_run.findings ->> 'decision' = 'approve'
          and decision_run.findings ->> 'reason' = new.approval_reason
      )
      or public.compute_legal_provision_snapshot_sha256(old.id)
        is distinct from old.provision_snapshot_sha256
      or not exists (
        select 1
        from public.legal_review_runs as run
        where run.id = new.approval_review_run_id
          and run.source_version_id = old.id
          and run.content_sha256 = old.content_sha256
          and run.provision_snapshot_sha256 = old.provision_snapshot_sha256
          and run.run_type = 'ai_verification'
          and run.run_status = 'completed'
          and run.trusted_service_actor = 'law-mind-ai-review-v1'
          and run.trusted_at is not null
          and run.attested_by is not null
          and run.attested_by <> auth.uid()
          and jsonb_array_length(run.evidence) > 0
      ) then
      raise exception 'Approval must be a hash-bound human decision';
    end if;
  elsif new.lifecycle_status = 'rejected' then
    if new.rejected_by is distinct from auth.uid()
      or new.rejected_at is null
      or new.rejection_reason is null
      or length(btrim(new.rejection_reason)) < 10
      or new.rejection_hash is null
      or new.rejection_hash is distinct from old.content_sha256
      or new.rejection_snapshot_sha256 is distinct from old.provision_snapshot_sha256
      or new.rejection_review_run_id is null
      or new.rejection_decision_run_id is null
      or new.approved_by is not null
      or new.approval_review_run_id is not null
      or not exists (
        select 1
        from public.legal_review_runs as decision_run
        where decision_run.id = new.rejection_decision_run_id
          and decision_run.source_version_id = old.id
          and decision_run.content_sha256 = old.content_sha256
          and decision_run.provision_snapshot_sha256 = old.provision_snapshot_sha256
          and decision_run.run_type = 'human_review'
          and decision_run.run_status = 'completed'
          and decision_run.created_by = auth.uid()
          and decision_run.findings ->> 'decision' = 'reject'
          and decision_run.findings ->> 'reason' = new.rejection_reason
      )
      or public.compute_legal_provision_snapshot_sha256(old.id)
        is distinct from old.provision_snapshot_sha256
      or not exists (
        select 1
        from public.legal_review_runs as run
        where run.id = new.rejection_review_run_id
          and run.source_version_id = old.id
          and run.content_sha256 = old.content_sha256
          and run.provision_snapshot_sha256 = old.provision_snapshot_sha256
          and run.run_type = 'ai_verification'
          and run.run_status = 'completed'
          and run.trusted_service_actor = 'law-mind-ai-review-v1'
          and run.trusted_at is not null
          and run.attested_by is not null
          and run.attested_by <> auth.uid()
          and jsonb_array_length(run.evidence) > 0
      ) then
      raise exception 'Rejection must be a hash-bound human decision';
    end if;
  elsif new.lifecycle_status = 'superseded' then
    if old.lifecycle_status <> 'approved'
      or new.superseded_by_version_id is null
      or new.superseded_at is null
      or new.superseded_reason is null
      or length(btrim(new.superseded_reason)) < 10
      or row(
        new.approved_by,
        new.approved_at,
        new.approval_reason,
        new.approval_hash,
        new.approval_snapshot_sha256,
        new.approval_review_run_id,
        new.approval_decision_run_id
      ) is distinct from row(
        old.approved_by,
        old.approved_at,
        old.approval_reason,
        old.approval_hash,
        old.approval_snapshot_sha256,
        old.approval_review_run_id,
        old.approval_decision_run_id
      ) then
      raise exception 'Superseding must preserve the prior human approval';
    end if;
  else
    if row(
      new.approved_by,
      new.approved_at,
      new.approval_reason,
      new.approval_hash,
      new.approval_snapshot_sha256,
      new.approval_review_run_id,
      new.approval_decision_run_id,
      new.rejected_by,
      new.rejected_at,
      new.rejection_reason,
      new.rejection_hash,
      new.rejection_snapshot_sha256,
      new.rejection_review_run_id,
      new.rejection_decision_run_id,
      new.superseded_by_version_id,
      new.superseded_at,
      new.superseded_reason
    ) is distinct from row(
      old.approved_by,
      old.approved_at,
      old.approval_reason,
      old.approval_hash,
      old.approval_snapshot_sha256,
      old.approval_review_run_id,
      old.approval_decision_run_id,
      old.rejected_by,
      old.rejected_at,
      old.rejection_reason,
      old.rejection_hash,
      old.rejection_snapshot_sha256,
      old.rejection_review_run_id,
      old.rejection_decision_run_id,
      old.superseded_by_version_id,
      old.superseded_at,
      old.superseded_reason
    ) then
      raise exception 'Decision metadata may only be set by a human decision';
    end if;
  end if;

  new.updated_at := clock_timestamp();
  return new;
end;
$function$;

create function public.guard_legal_provision()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  version_status text;
  artifact_status text;
  previous_revision integer;
begin
  if tg_op <> 'INSERT' then
    raise exception 'Extracted legal provisions are append-only';
  end if;

  if new.created_by is distinct from auth.uid() then
    raise exception 'Provision creator must be the authenticated user';
  end if;

  select version.lifecycle_status, version.artifact_integrity_status
  into version_status, artifact_status
  from public.legal_source_versions as version
  where version.id = new.source_version_id
  for update;

  if version_status not in ('collected', 'extracted') then
    raise exception 'Provision snapshots are immutable once AI review begins';
  end if;
  if artifact_status <> 'verified' then
    raise exception 'Extraction is blocked until the source artifact is verified';
  end if;

  if new.extraction_status in ('extracted', 'partial')
    and new.text_sha256 is distinct from encode(
      extensions.digest(convert_to(new.extracted_text, 'UTF8'), 'sha256'),
      'hex'
    ) then
    raise exception 'Provision text hash does not match the exact extracted text';
  end if;

  if new.revision_number = 1 then
    if exists (
      select 1
      from public.legal_provisions as provision
      where provision.source_version_id = new.source_version_id
        and provision.provision_identifier = new.provision_identifier
    ) then
      raise exception 'The first provision extraction revision already exists';
    end if;
  else
    select provision.revision_number
    into previous_revision
    from public.legal_provisions as provision
    where provision.id = new.supersedes_provision_id
      and provision.source_version_id = new.source_version_id
      and provision.provision_identifier = new.provision_identifier
    for share;

    if previous_revision is null
      or new.revision_number <> previous_revision + 1
      or exists (
        select 1
        from public.legal_provisions as provision
        where provision.source_version_id = new.source_version_id
          and provision.provision_identifier = new.provision_identifier
          and provision.revision_number > previous_revision
      ) then
      raise exception 'A provision revision must directly supersede the latest extraction';
    end if;
  end if;
  return new;
end;
$function$;

create function public.guard_legal_review_run()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  version_row public.legal_source_versions%rowtype;
begin
  if tg_op <> 'INSERT' then
    raise exception 'Legal review runs are immutable';
  end if;

  select * into version_row
  from public.legal_source_versions as version
  where version.id = new.source_version_id
  for update;

  if not found or new.content_sha256 is distinct from version_row.content_sha256 then
    raise exception 'Review run hash does not match the immutable source version';
  end if;

  if new.run_type in ('ai_extraction', 'ai_verification') then
    if auth.role() is distinct from 'service_role'
      or current_setting('lawmind.trusted_ai_review_run', true)
        is distinct from new.id::text
      or new.created_by is not null
      or new.trusted_service_actor <> 'law-mind-ai-review-v1'
      or new.trusted_at is null
      or new.attested_by is null
      or new.run_status <> 'completed'
      or new.artifact_readback_sha256 is distinct from version_row.content_sha256
      or new.artifact_readback_at is null
      or version_row.artifact_integrity_status <> 'verified'
      or version_row.lifecycle_status <> 'extracted'
      or new.provision_snapshot_sha256 is distinct from
        public.compute_legal_provision_snapshot_sha256(version_row.id)
      or not public.has_legal_source_capability_for_user(
        new.attested_by, 'verify', version_row.source_id
      ) then
      raise exception 'AI runs must be created by the trusted service for the exact verified source and provision snapshot';
    end if;
  elsif new.run_type = 'human_review' then
    if new.created_by is distinct from auth.uid()
      or new.attested_by is not null
      or new.trusted_service_actor is not null
      or new.trusted_at is not null
      or current_setting('lawmind.legal_human_decision', true)
        is distinct from new.source_version_id::text
      or new.provision_snapshot_sha256 is distinct from
        version_row.provision_snapshot_sha256 then
      raise exception 'Human decision records can only be created by the decision operation for the reviewed snapshot';
    end if;
  else
    raise exception 'Unsupported legal review run type';
  end if;
  return new;
end;
$function$;

create function public.guard_legal_audit_event()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $function$
begin
  raise exception 'Legal source audit events are append-only';
end;
$function$;

create function public.audit_legal_source_insert()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $function$
begin
  insert into public.legal_source_audit_events (
    actor_id, service_actor, event_type, source_id,
    content_sha256, new_state, details
  ) values (
    auth.uid(), null, 'source_registered', new.id, null, 'registered',
    jsonb_build_object('source_key', new.source_key)
  );
  return new;
end;
$function$;

create function public.audit_legal_version_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  audit_event text;
  audit_reason text;
  related_run uuid;
begin
  if tg_op = 'INSERT' then
    insert into public.legal_source_audit_events (
      actor_id, service_actor, event_type, source_id, source_version_id,
      content_sha256, new_state, details
    ) values (
      coalesce(auth.uid(), new.captured_by),
      'law-mind-ingestion-v1',
      'source_version_collected', new.source_id, new.id,
      new.content_sha256, new.lifecycle_status,
      jsonb_build_object(
        'version_number', new.version_number,
        'storage_bucket', new.storage_bucket,
        'storage_object_key', new.storage_object_key,
        'artifact_integrity_status', new.artifact_integrity_status,
        'artifact_verified_at', new.artifact_verified_at
      )
    );
    return new;
  end if;

  audit_reason := current_setting('lawmind.legal_source_reason', true);
  if new.lifecycle_status = 'approved' then
    audit_event := 'version_approved';
    related_run := new.approval_decision_run_id;
  elsif new.lifecycle_status = 'rejected' then
    audit_event := 'version_rejected';
    related_run := new.rejection_decision_run_id;
  elsif new.lifecycle_status = 'superseded' then
    audit_event := 'version_superseded';
    related_run := new.approval_decision_run_id;
  else
    audit_event := 'version_stage_advanced';
    related_run := null;
  end if;

  insert into public.legal_source_audit_events (
    actor_id, service_actor, event_type, source_id, source_version_id, content_sha256,
    previous_state, new_state, reason, related_review_run_id
  ) values (
    coalesce(
      auth.uid(),
      nullif(current_setting('lawmind.legal_actor', true), '')::uuid
    ),
    case when auth.role() = 'service_role' then 'law-mind-ai-review-v1' end,
    audit_event, new.source_id, new.id, new.content_sha256,
    old.lifecycle_status, new.lifecycle_status, audit_reason, related_run
  );
  return new;
end;
$function$;

create function public.audit_legal_provision_insert()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  version_source_id uuid;
  version_hash text;
begin
  select version.source_id, version.content_sha256
  into version_source_id, version_hash
  from public.legal_source_versions as version
  where version.id = new.source_version_id;

  insert into public.legal_source_audit_events (
    actor_id, service_actor, event_type, source_id, source_version_id,
    content_sha256, new_state, details
  ) values (
    auth.uid(), null, 'provision_recorded', version_source_id, new.source_version_id,
    version_hash, new.extraction_status,
    jsonb_build_object(
      'provision_identifier', new.provision_identifier,
      'revision_number', new.revision_number,
      'text_sha256', new.text_sha256,
      'effective_date', new.effective_date,
      'effective_date_certainty', new.effective_date_certainty,
      'provenance', new.provenance
    )
  );
  return new;
end;
$function$;

create function public.audit_legal_review_run_insert()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  version_source_id uuid;
  audit_event text;
begin
  select version.source_id
  into version_source_id
  from public.legal_source_versions as version
  where version.id = new.source_version_id;

  audit_event := case
    when new.run_type = 'human_review' then 'human_review_run_recorded'
    else 'ai_review_run_recorded'
  end;

  insert into public.legal_source_audit_events (
    actor_id, service_actor, event_type, source_id, source_version_id,
    content_sha256, new_state, related_review_run_id,
    details
  ) values (
    coalesce(auth.uid(), new.attested_by, new.created_by),
    new.trusted_service_actor,
    audit_event, version_source_id, new.source_version_id,
    new.content_sha256, new.run_type, new.id,
    jsonb_build_object(
      'run_status', new.run_status,
      'provider', new.provider,
      'model', new.model,
      'prompt_version', new.prompt_version,
      'schema_version', new.schema_version,
      'artifact_readback_sha256', new.artifact_readback_sha256,
      'artifact_readback_at', new.artifact_readback_at,
      'provision_snapshot_sha256', new.provision_snapshot_sha256,
      'attested_by', new.attested_by,
      'trusted_at', new.trusted_at
    )
  );
  return new;
end;
$function$;

create function public.advance_legal_source_version(
  p_version_id uuid,
  p_content_sha256 text,
  p_next_status text,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  version_row public.legal_source_versions%rowtype;
  required_capability text;
begin
  if auth.uid() is null then
    raise exception 'An authenticated reviewer is required';
  end if;
  if p_content_sha256 is null
    or p_content_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception 'A lowercase SHA-256 hash is required';
  end if;
  if length(btrim(coalesce(p_reason, ''))) < 10 then
    raise exception 'A transition reason of at least 10 characters is required';
  end if;

  select * into version_row
  from public.legal_source_versions
  where id = p_version_id
  for update;

  if not found or version_row.content_sha256 <> p_content_sha256 then
    raise exception 'Source version not found or content hash does not match';
  end if;

  if not (
    (version_row.lifecycle_status = 'collected' and p_next_status = 'extracted')
    or (version_row.lifecycle_status = 'ai_reviewed' and p_next_status = 'pending_human_approval')
  ) then
    raise exception 'Invalid legal source lifecycle transition';
  end if;

  required_capability := case
    when p_next_status = 'extracted' then 'extract'
    else 'verify'
  end;
  if not public.has_legal_source_capability(
    required_capability, version_row.source_id
  ) then
    raise exception 'Reviewer capability or source scope is insufficient';
  end if;

  if p_next_status = 'extracted' and not exists (
    select 1
    from public.legal_provisions as provision
    where provision.source_version_id = version_row.id
      and provision.extraction_status = 'extracted'
      and not exists (
        select 1
        from public.legal_provisions as newer
        where newer.source_version_id = provision.source_version_id
          and newer.provision_identifier = provision.provision_identifier
          and newer.revision_number > provision.revision_number
      )
  ) then
    raise exception 'Complete extracted provision text is required before advancing';
  end if;
  if p_next_status = 'extracted' and exists (
    select 1
    from public.legal_provisions as provision
    where provision.source_version_id = version_row.id
      and provision.extraction_status <> 'extracted'
      and not exists (
        select 1
        from public.legal_provisions as newer
        where newer.source_version_id = provision.source_version_id
          and newer.provision_identifier = provision.provision_identifier
          and newer.revision_number > provision.revision_number
      )
  ) then
    raise exception 'Partial or OCR-required provisions must be resolved before advancing';
  end if;

  if version_row.artifact_integrity_status <> 'verified' then
    raise exception 'An unverified source artifact cannot advance';
  end if;

  if p_next_status = 'pending_human_approval'
    and not exists (
      select 1
      from public.legal_review_runs as run
      where run.source_version_id = version_row.id
        and run.content_sha256 = version_row.content_sha256
        and run.provision_snapshot_sha256 = version_row.provision_snapshot_sha256
        and run.run_type = 'ai_verification'
        and run.run_status = 'completed'
        and run.trusted_service_actor = 'law-mind-ai-review-v1'
        and run.trusted_at is not null
        and run.attested_by is not null
        and jsonb_array_length(run.evidence) > 0
    ) then
    raise exception 'A trusted completed AI verification of the exact source and snapshot is required';
  end if;

  if p_next_status = 'pending_human_approval'
    and version_row.provision_snapshot_sha256 is distinct from
      public.compute_legal_provision_snapshot_sha256(version_row.id) then
    raise exception 'Provision snapshot changed after AI review';
  end if;

  perform set_config('lawmind.legal_source_transition', version_row.id::text, true);
  perform set_config('lawmind.legal_source_reason', p_reason, true);

  update public.legal_source_versions
  set lifecycle_status = p_next_status,
  extracted_at = case
    when p_next_status = 'extracted' then clock_timestamp()
    else extracted_at
  end,
  submitted_for_approval_at = case
        when p_next_status = 'pending_human_approval' then clock_timestamp()
        else submitted_for_approval_at
      end
  where id = version_row.id;
end;
$function$;

create function public.decide_legal_source_version(
  p_version_id uuid,
  p_content_sha256 text,
  p_provision_snapshot_sha256 text,
  p_decision text,
  p_reason text,
  p_review_run_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  source_row public.legal_sources%rowtype;
  version_row public.legal_source_versions%rowtype;
  version_source_id uuid;
  human_run_id uuid;
  prior_version_id uuid;
  decision_time timestamptz := clock_timestamp();
begin
  if auth.uid() is null then
    raise exception 'An authenticated human reviewer is required';
  end if;
  if p_decision is null or p_decision not in ('approve', 'reject') then
    raise exception 'Decision must be approve or reject';
  end if;
  if p_content_sha256 is null
    or p_content_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception 'A lowercase SHA-256 hash is required';
  end if;
  if p_provision_snapshot_sha256 is null
    or p_provision_snapshot_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception 'A lowercase provision snapshot SHA-256 hash is required';
  end if;
  if length(btrim(coalesce(p_reason, ''))) < 10 then
    raise exception 'A decision reason of at least 10 characters is required';
  end if;

  select source_id into version_source_id
  from public.legal_source_versions
  where id = p_version_id;
  if not found then
    raise exception 'Legal source version was not found';
  end if;

  select * into source_row
  from public.legal_sources
  where id = version_source_id
  for update;

  select * into version_row
  from public.legal_source_versions
  where id = p_version_id
  for update;

  if version_row.lifecycle_status <> 'pending_human_approval'
    or version_row.content_sha256 <> p_content_sha256
    or version_row.provision_snapshot_sha256 <> p_provision_snapshot_sha256 then
    raise exception 'Version is not pending or its immutable source/snapshot hash does not match';
  end if;
  if version_row.artifact_integrity_status <> 'verified'
    or public.compute_legal_provision_snapshot_sha256(version_row.id)
      is distinct from version_row.provision_snapshot_sha256 then
    raise exception 'The verified artifact or reviewed provision snapshot is no longer intact';
  end if;

  if not public.has_legal_source_capability('approve', version_row.source_id) then
    raise exception 'Reviewer is not authorized to decide this source';
  end if;

  if not exists (
    select 1
    from public.legal_review_runs as run
    where run.id = p_review_run_id
      and run.source_version_id = version_row.id
      and run.content_sha256 = version_row.content_sha256
      and run.provision_snapshot_sha256 = version_row.provision_snapshot_sha256
      and run.run_type = 'ai_verification'
      and run.run_status = 'completed'
      and run.trusted_service_actor = 'law-mind-ai-review-v1'
      and run.trusted_at is not null
      and run.attested_by is not null
      and run.attested_by <> auth.uid()
      and jsonb_array_length(run.evidence) > 0
  ) then
    raise exception 'A completed review run with evidence for this exact hash is required';
  end if;

  if p_decision = 'approve'
    and (
      version_row.effective_date_certainty <> 'known'
      or version_row.effective_date is null
      or version_row.effective_date > current_date
      or (version_row.publication_date is not null
        and version_row.publication_date > current_date)
    ) then
    raise exception 'A source with unknown, uncertain, or future effective/publication dates cannot become current';
  end if;

  perform set_config('lawmind.legal_human_decision', version_row.id::text, true);
  insert into public.legal_review_runs (
    source_version_id,
    content_sha256,
    provision_snapshot_sha256,
    run_type,
    run_status,
    schema_version,
    findings,
    evidence,
    limitations,
    created_by,
    created_at,
    completed_at
  ) values (
    version_row.id,
    version_row.content_sha256,
    version_row.provision_snapshot_sha256,
    'human_review',
    'completed',
    'human-decision-v1',
    jsonb_build_object('decision', p_decision, 'reason', p_reason),
    jsonb_build_array(jsonb_build_object(
      'review_run_id', p_review_run_id,
      'content_sha256', version_row.content_sha256
    )),
    array['Human decision applies only to the exact immutable source version and hash.'],
    auth.uid(),
    decision_time,
    decision_time
  )
  returning id into human_run_id;

  perform set_config('lawmind.legal_source_transition', version_row.id::text, true);
  perform set_config('lawmind.legal_source_reason', p_reason, true);

  if p_decision = 'approve' then
    prior_version_id := source_row.current_approved_version_id;
    if prior_version_id is not null then
      perform set_config('lawmind.legal_source_transition', prior_version_id::text, true);
      update public.legal_source_versions
      set lifecycle_status = 'superseded',
          superseded_by_version_id = version_row.id,
          superseded_at = decision_time,
          superseded_reason = p_reason
      where id = prior_version_id
        and source_id = version_row.source_id
        and lifecycle_status = 'approved';

      if not found then
        raise exception 'Existing current version could not be safely superseded';
      end if;
    end if;

    perform set_config('lawmind.legal_source_transition', version_row.id::text, true);
    update public.legal_source_versions
    set lifecycle_status = 'approved',
        approved_by = auth.uid(),
        approved_at = decision_time,
        approval_reason = p_reason,
        approval_hash = version_row.content_sha256,
        approval_snapshot_sha256 = version_row.provision_snapshot_sha256,
        approval_review_run_id = p_review_run_id,
        approval_decision_run_id = human_run_id
    where id = version_row.id;

    perform set_config('lawmind.legal_source_pointer', source_row.id::text, true);
    update public.legal_sources
    set current_approved_version_id = version_row.id
    where id = source_row.id;
  else
    update public.legal_source_versions
    set lifecycle_status = 'rejected',
        rejected_by = auth.uid(),
        rejected_at = decision_time,
        rejection_reason = p_reason,
        rejection_hash = version_row.content_sha256,
        rejection_snapshot_sha256 = version_row.provision_snapshot_sha256,
        rejection_review_run_id = p_review_run_id,
        rejection_decision_run_id = human_run_id
    where id = version_row.id;
  end if;
end;
$function$;

create trigger legal_sources_identity_guard
before insert or update or delete on public.legal_sources
for each row execute function public.guard_legal_source_identity();

create trigger legal_sources_insert_audit
after insert on public.legal_sources
for each row execute function public.audit_legal_source_insert();

create trigger legal_source_versions_guard
before insert or update or delete on public.legal_source_versions
for each row execute function public.guard_legal_source_version();

create trigger legal_source_versions_audit
after insert or update on public.legal_source_versions
for each row execute function public.audit_legal_version_change();

create trigger legal_provisions_guard
before insert or update or delete on public.legal_provisions
for each row execute function public.guard_legal_provision();

create trigger legal_provisions_audit
after insert on public.legal_provisions
for each row execute function public.audit_legal_provision_insert();

create trigger legal_review_runs_guard
before insert or update or delete on public.legal_review_runs
for each row execute function public.guard_legal_review_run();

create trigger legal_review_runs_audit
after insert on public.legal_review_runs
for each row execute function public.audit_legal_review_run_insert();

create trigger legal_source_audit_events_append_only
before update or delete on public.legal_source_audit_events
for each row execute function public.guard_legal_audit_event();

alter table public.legal_sources enable row level security;
alter table public.legal_source_versions enable row level security;
alter table public.legal_provisions enable row level security;
alter table public.legal_review_runs enable row level security;
alter table public.legal_source_reviewers enable row level security;
alter table public.legal_source_audit_events enable row level security;

create policy legal_sources_reviewer_read
  on public.legal_sources for select to authenticated
  using (
    public.has_legal_source_capability('collect', id)
    or public.has_legal_source_capability('extract', id)
    or public.has_legal_source_capability('verify', id)
    or public.has_legal_source_capability('approve', id)
  );

create policy legal_sources_approved_current_read
  on public.legal_sources for select to authenticated
  using (
    current_approved_version_id is not null
    and public.is_current_approved_legal_version(current_approved_version_id)
  );

create policy legal_sources_reviewer_insert
  on public.legal_sources for insert to authenticated
  with check (
    created_by = auth.uid()
    and public.has_legal_source_capability(
      'collect', null, jurisdiction, instrument_type
    )
  );

create policy legal_source_versions_reviewer_read
  on public.legal_source_versions for select to authenticated
  using (
    public.has_legal_source_capability('collect', source_id)
    or public.has_legal_source_capability('extract', source_id)
    or public.has_legal_source_capability('verify', source_id)
    or public.has_legal_source_capability('approve', source_id)
  );

create policy legal_source_versions_approved_current_read
  on public.legal_source_versions for select to authenticated
  using (public.is_current_approved_legal_version(id));

create policy legal_provisions_reviewer_read
  on public.legal_provisions for select to authenticated
  using (
    exists (
      select 1
      from public.legal_source_versions as version
      where version.id = source_version_id
        and (
          public.has_legal_source_capability('collect', version.source_id)
          or public.has_legal_source_capability('extract', version.source_id)
          or public.has_legal_source_capability('verify', version.source_id)
          or public.has_legal_source_capability('approve', version.source_id)
        )
    )
  );

create policy legal_provisions_approved_current_read
  on public.legal_provisions for select to authenticated
  using (
    public.is_current_approved_legal_version(source_version_id)
    and public.is_latest_legal_provision_revision(
      source_version_id, provision_identifier, revision_number
    )
    and effective_date_certainty = 'known'
    and effective_date <= current_date
  );

create policy legal_provisions_reviewer_insert
  on public.legal_provisions for insert to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1
      from public.legal_source_versions as version
      where version.id = source_version_id
        and version.lifecycle_status in ('collected', 'extracted')
        and version.artifact_integrity_status = 'verified'
        and public.has_legal_source_capability('extract', version.source_id)
    )
  );

create policy legal_review_runs_reviewer_read
  on public.legal_review_runs for select to authenticated
  using (
    exists (
      select 1
      from public.legal_source_versions as version
      where version.id = source_version_id
        and (
          public.has_legal_source_capability('collect', version.source_id)
          or public.has_legal_source_capability('extract', version.source_id)
          or public.has_legal_source_capability('verify', version.source_id)
          or public.has_legal_source_capability('approve', version.source_id)
        )
    )
  );

create policy legal_source_audit_events_reviewer_read
  on public.legal_source_audit_events for select to authenticated
  using (
    public.has_legal_source_capability('collect', source_id)
    or public.has_legal_source_capability('extract', source_id)
    or public.has_legal_source_capability('verify', source_id)
    or public.has_legal_source_capability('approve', source_id)
  );

-- Deliberately no policies or table privileges permit users to read or mutate
-- reviewer assignments. Initial grants are provisioned by a trusted operator.
revoke all on public.legal_sources,
  public.legal_source_versions,
  public.legal_provisions,
  public.legal_review_runs,
  public.legal_source_reviewers,
  public.legal_source_audit_events
  from public, anon, authenticated, service_role;

grant select, insert on public.legal_sources to authenticated;
grant select on public.legal_source_versions to authenticated;
grant select, insert on public.legal_provisions to authenticated;
grant select on public.legal_review_runs to authenticated;
grant select on public.legal_source_audit_events to authenticated;

create view public.approved_current_legal_sources
with (security_invoker = true)
as
select
  source.id as source_id,
  source.source_key,
  source.instrument_title,
  source.instrument_type,
  source.jurisdiction,
  source.scope_description,
  version.id as source_version_id,
  version.version_number,
  version.document_title,
  version.issuing_authority,
  version.official_source_url,
  version.publication_date,
  version.publication_date_certainty,
  version.amendment_date,
  version.amendment_date_certainty,
  version.effective_date,
  version.content_sha256,
  version.provision_snapshot_sha256,
  version.approved_at
from public.legal_sources as source
join public.legal_source_versions as version
  on version.id = source.current_approved_version_id
where version.lifecycle_status = 'approved'
  and version.artifact_integrity_status = 'verified'
  and version.provision_snapshot_sha256 =
    public.compute_legal_provision_snapshot_sha256(version.id)
  and version.effective_date_certainty = 'known'
  and version.effective_date <= current_date
  and (version.publication_date is null or version.publication_date <= current_date);

create view public.approved_current_legal_provisions
with (security_invoker = true)
as
select
  source.source_id,
  source.source_key,
  source.instrument_title,
  source.instrument_type,
  source.source_version_id,
  source.version_number,
  source.document_title,
  source.official_source_url,
  source.content_sha256 as source_content_sha256,
  source.provision_snapshot_sha256,
  provision.id as provision_id,
  provision.provision_identifier,
  provision.revision_number,
  provision.provision_title,
  provision.extracted_text,
  provision.text_sha256,
  provision.effective_date,
  provision.effective_date_certainty,
  provision.page_start,
  provision.page_end,
  provision.paragraph_start,
  provision.paragraph_end,
  provision.provenance
from public.approved_current_legal_sources as source
join public.legal_provisions as provision
  on provision.source_version_id = source.source_version_id
where provision.extraction_status = 'extracted'
  and public.is_latest_legal_provision_revision(
    provision.source_version_id,
    provision.provision_identifier,
    provision.revision_number
  )
  and provision.effective_date_certainty = 'known'
  and provision.effective_date <= current_date;

revoke all on public.approved_current_legal_sources,
public.approved_current_legal_provisions from public, anon, authenticated, service_role;
grant select on public.approved_current_legal_sources,
  public.approved_current_legal_provisions to authenticated;

revoke all on function public.has_legal_source_capability(text, uuid, text, text)
  from public, anon;
revoke all on function public.is_current_approved_legal_version(uuid)
  from public, anon;
revoke all on function public.can_access_legal_source_object(text, text)
  from public;
revoke all on function public.has_legal_source_capability_for_user(uuid, text, uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.compute_legal_provision_snapshot_sha256(uuid)
  from public, anon;
revoke all on function public.is_latest_legal_provision_revision(uuid, text, integer)
  from public, anon;
revoke all on function public.guard_legal_source_identity()
  from public, anon, authenticated, service_role;
revoke all on function public.guard_legal_source_version()
  from public, anon, authenticated, service_role;
revoke all on function public.guard_legal_provision()
  from public, anon, authenticated, service_role;
revoke all on function public.guard_legal_review_run()
  from public, anon, authenticated, service_role;
revoke all on function public.guard_legal_audit_event()
  from public, anon, authenticated, service_role;
revoke all on function public.audit_legal_source_insert()
  from public, anon, authenticated, service_role;
revoke all on function public.audit_legal_version_change()
  from public, anon, authenticated, service_role;
revoke all on function public.audit_legal_provision_insert()
  from public, anon, authenticated, service_role;
revoke all on function public.audit_legal_review_run_insert()
  from public, anon, authenticated, service_role;
revoke all on function public.advance_legal_source_version(uuid, text, text, text)
  from public, anon, service_role;
revoke all on function public.decide_legal_source_version(uuid, text, text, text, text, uuid)
  from public, anon, service_role;
revoke all on function public.register_legal_source_version(
  uuid, integer, uuid, text, date, text, date, text, date, text, text, text, text, bigint, uuid
) from public, anon, authenticated, service_role;
revoke all on function public.record_trusted_ai_review_run(
  uuid, text, text, text, uuid, text, text, text, text, jsonb, jsonb, numeric, text[]
) from public, anon, authenticated, service_role;

grant execute on function public.has_legal_source_capability(text, uuid, text, text)
  to authenticated;
grant execute on function public.compute_legal_provision_snapshot_sha256(uuid)
  to authenticated;
grant execute on function public.is_latest_legal_provision_revision(uuid, text, integer)
  to authenticated;
grant execute on function public.is_current_approved_legal_version(uuid)
  to authenticated;
grant execute on function public.can_access_legal_source_object(text, text)
  to authenticated;
grant execute on function public.advance_legal_source_version(uuid, text, text, text)
  to authenticated;
grant execute on function public.decide_legal_source_version(uuid, text, text, text, text, uuid)
  to authenticated;
grant execute on function public.register_legal_source_version(
  uuid, integer, uuid, text, date, text, date, text, date, text, text, text, text, bigint, uuid
) to service_role;
grant execute on function public.record_trusted_ai_review_run(
  uuid, text, text, text, uuid, text, text, text, text, jsonb, jsonb, numeric, text[]
) to service_role;

-- Create only when absent. Never silently change a pre-existing bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'legal-source-originals',
  'legal-source-originals',
  false,
  52428800,
  array[
    'application/pdf',
    'text/plain',
    'text/html',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]::text[]
)
on conflict (id) do nothing;

do $migration$
begin
  if not exists (
    select 1
    from storage.buckets as bucket
    where bucket.id = 'legal-source-originals'
      and bucket.name = 'legal-source-originals'
      and bucket.public = false
      and bucket.file_size_limit is not null
      and bucket.file_size_limit <= 52428800
  ) then
    raise exception 'legal-source-originals must be a private bucket with a <= 50 MiB limit';
  end if;
end;
$migration$;

create policy legal_source_originals_reviewer_read
  on storage.objects for select to authenticated
  using (
    bucket_id = 'legal-source-originals'
    and public.can_access_legal_source_object(name, 'read')
  );

create policy legal_source_originals_service_upload
  on storage.objects for insert to service_role
  with check (
    bucket_id = 'legal-source-originals'
    and auth.role() = 'service_role'
  );

-- Restrictive guards prevent unrelated permissive storage policies from
-- accidentally making this bucket readable, replaceable, or deletable.
create policy legal_source_originals_select_guard
  on storage.objects as restrictive for select to public
  using (
    bucket_id <> 'legal-source-originals'
    or auth.role() = 'service_role'
    or public.can_access_legal_source_object(name, 'read')
  );

create policy legal_source_originals_insert_guard
  on storage.objects as restrictive for insert to public
  with check (
    bucket_id <> 'legal-source-originals'
    or auth.role() = 'service_role'
  );

create policy legal_source_originals_update_guard
  on storage.objects as restrictive for update to public
  using (bucket_id <> 'legal-source-originals')
  with check (bucket_id <> 'legal-source-originals');

create policy legal_source_originals_delete_guard
  on storage.objects as restrictive for delete to public
  using (bucket_id <> 'legal-source-originals');

commit;
