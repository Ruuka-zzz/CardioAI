# Prolog Engine — Daily Symptom Triage

Rule-based logic system that evaluates daily check-in data (symptoms + medication adherence) combined with the patient's ML-derived baseline risk, to produce:

- Condition status: Good / Fair / Bad
- Urgency level (used by notification-service to pick the alert channel)
- Recommendation text

Chosen over pure ML for this task because triage rules need to be **explainable and predictable** — a patient or doctor can see exactly why a given recommendation was made.

## Planned files
- `rules.pl` — core rule base (symptom severity, urgency escalation)
- `facts_template.pl` — structure for facts asserted from daily check-in data
- Integration notes: called from `backend/services` via a Prolog binding (e.g. `pyswip` if backend is Python)

## Example rule shape

```prolog
condition(bad) :- symptom(chest_pain, severe).
condition(bad) :- baseline_risk(high), medication_taken(false).
recommend(seek_immediate_care) :- condition(bad).
```
