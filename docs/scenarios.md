# Scenario Authoring

Scenarios define what the evaluator asks and how success is scored.

## Schema

Each scenario supports:

- `id` string unique identifier
- `category` logical grouping for debugging and reporting
- `user_message` first user prompt for simulated conversation
- `expected_facts` list of strings expected in agent output
- `forbidden_claims` list of strings that must not appear
- `completion_rule` scoring rule for success
- `max_turns` max conversation turns generated in simulation
- `language` locale string, default `en`
- `safety_flags` optional labels for safety-focused slices

Required fields:

- `id`
- `category`
- `user_message`

## File format

Top-level `scenarios` list:

```yaml
scenarios:
  - id: auth-header
    category: retrieval
    user_message: "How do I authenticate requests?"
    expected_facts:
      - "api key"
      - "header"
    forbidden_claims:
      - "anonymous access"
    completion_rule: must_answer
    max_turns: 8
```

A plain list without `scenarios` key is also accepted.

## Completion rules

Supported values:

- `must_answer` requires agent to respond and avoid unresolved patterns
- `must_contain_all_expected_facts` requires all expected facts and no unresolved patterns
- `fallback_allowed` allows safe fallback responses

## Dataset tiers

Recommended tiers:

- Smoke small fast set for pull requests
- Regression representative daily or per-merge set
- Stress long-tail robustness and edge-case set

Existing starter packs:

- `datasets/smoke/smoke_core.yaml`
- `datasets/regression/retrieval_regression.yaml`
- `datasets/stress/stress_noise_interruptions.yaml`

## Authoring tips

- Keep scenarios atomic and measurable.
- Add realistic user phrasing including disfluencies.
- Separate factual checks from style checks.
- Use categories aligned with ownership domains.
