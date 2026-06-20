# Audio Scalability Plan

This document captures the audio architecture direction for V2 at larger scale.

Current product decision:

- Use provider-hosted audio URL/stream for playback now.
- Defer app-managed object storage copy to a later phase.

## Why this matters

Target operating profile:

- around 20,000 recordings
- typical call length 15 to 30 minutes

At this size, playback reliability, request throughput, and storage cost become architectural concerns.

## Current mode (MVP)

MVP playback strategy:

- store metadata in app database
- request provider media endpoint on demand
- return a playable source to UI

Benefits:

- fastest path to production value
- avoids early storage pipeline complexity

Known trade-offs:

- dependency on provider URL availability and retention
- less control over long-term portability and lifecycle

## Target scalable architecture (later)

Recommended steady-state design:

- control plane in backend API (auth, entitlement, metadata, signed URL issuance)
- data plane in object storage + CDN (audio delivery)

Principles:

1. Do not proxy large audio streams through app API in steady state.
2. Keep metadata in Postgres, not raw audio blobs.
3. Use durable async jobs for audio acquisition and processing.
4. Keep workers idempotent and retry-safe.
5. Use short-lived signed URLs for playback authorization.

## Data model additions (for storage-backed mode)

Add or expand audio asset metadata:

- conversation_id
- source (provider, copied, reprocessed)
- status (pending, ready, failed)
- storage bucket/key
- mime_type, codec, duration_ms, bytes
- checksum
- created_at, updated_at

Suggested indexes:

- (conversation_id, status)
- (checksum)
- (created_at)

## Ingestion and processing flow (for storage-backed mode)

1. Import conversation metadata.
2. Enqueue audio acquisition job.
3. Fetch audio from provider endpoint.
4. Validate content-type and minimum size.
5. Optional normalize/transcode.
6. Upload to object storage and persist metadata.
7. Mark asset ready.

Reliability expectations:

- lease/lock per job
- exponential backoff retries
- dead-letter queue for repeated failures

## Playback contract

MVP now:

- API returns provider stream/source details directly.

Later:

- API returns signed CDN/object URL with short TTL.
- frontend plays signed URL directly.

## Observability and SLOs

Track:

- import-to-playable latency (p50/p95)
- queue depth and oldest job age
- job failure and retry rates
- playback start latency
- audio availability rate

Alert on:

- queue age spikes
- provider fetch failures
- playback error spikes

## Security and compliance

MVP now:

- enforce account-level authorization before returning media source.

Later:

- encrypt at rest in app-managed storage
- short TTL signed URLs
- audit logs for media access
- retention/lifecycle rules by tenant or policy

## Phased implementation plan

Phase A (now):

- keep provider URL/stream mode
- stabilize media metadata + playback reliability

Phase B:

- add optional lazy-copy job for selected conversations
- keep provider as fallback

Phase C:

- make app-managed storage canonical for new imports
- serve playback through signed CDN/object URLs

Phase D:

- add lifecycle tiering, archive/restore, and cost controls

## Exit criteria to move beyond provider-only mode

Move to app-managed storage when one or more is true:

- repeated provider URL expiration or playback failures
- compliance or retention requirements require data custody
- provider portability becomes a priority
- egress/cost/performance optimization needs tighter control
