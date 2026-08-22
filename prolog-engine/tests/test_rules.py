"""Tests for rules.pl, driven through engine.run_triage.

These require SWI-Prolog. They are skipped rather than failed when it is
missing, so CI without Prolog installed reports honestly instead of green.

Each test names the rule it expects to fire. Asserting on fired_rules rather
than only on status is deliberate: the right answer for the wrong reason is
still a bug, and the patient sees the reason.
"""

import pytest

import engine


def _prolog_available() -> bool:
    try:
        engine.check_available()
        return True
    except engine.PrologUnavailable:
        return False


requires_prolog = pytest.mark.skipif(
    not _prolog_available(), reason="SWI-Prolog not installed"
)


def triage(chest_pain=0, breathlessness=0, fatigue=0, swelling=0, dizziness=0,
           medication_taken=True, baseline="low"):
    return engine.run_triage(
        symptoms={
            "chest_pain": chest_pain,
            "breathlessness": breathlessness,
            "fatigue": fatigue,
            "swelling": swelling,
            "dizziness": dizziness,
        },
        medication_taken=medication_taken,
        baseline=baseline,
    )


@requires_prolog
def test_no_symptoms_is_good():
    result = triage()
    assert result.status == "good"
    assert result.urgency == "routine"
    assert "all_clear" in result.fired_rules


@requires_prolog
def test_severe_chest_pain_is_emergency():
    result = triage(chest_pain=3)
    assert result.status == "bad"
    assert result.urgency == "emergency"
    assert "severe_chest_pain" in result.fired_rules


@requires_prolog
def test_moderate_chest_pain_escalates_on_high_baseline():
    """The same symptom, two baselines, two different urgencies."""
    low = triage(chest_pain=2, baseline="low")
    high = triage(chest_pain=2, baseline="high")

    assert low.urgency == "elevated"
    assert high.urgency == "emergency"
    assert "chest_pain_high_baseline" in high.fired_rules


@requires_prolog
def test_most_severe_rule_wins():
    """Severe chest pain plus mild fatigue must give the chest pain answer,
    not an average and not the first rule listed."""
    result = triage(chest_pain=3, fatigue=1)

    assert result.urgency == "emergency"
    assert "severe_chest_pain" in result.fired_rules
    assert "mild_symptoms" in result.fired_rules  # still reported


@requires_prolog
def test_three_moderate_symptoms_escalate():
    result = triage(breathlessness=2, fatigue=2, dizziness=2)
    assert result.urgency == "elevated"
    assert "multiple_moderate_symptoms" in result.fired_rules


@requires_prolog
def test_two_moderate_symptoms_do_not():
    result = triage(breathlessness=2, fatigue=2)
    assert "multiple_moderate_symptoms" not in result.fired_rules


@requires_prolog
def test_missed_medication_is_flagged():
    result = triage(medication_taken=False)
    assert "missed_medication" in result.fired_rules


@requires_prolog
def test_missed_medication_escalates_on_high_baseline():
    result = triage(medication_taken=False, baseline="high")
    assert result.urgency == "elevated"
    assert "missed_medication_high_baseline" in result.fired_rules


@requires_prolog
def test_every_result_explains_itself():
    """No triage result may arrive without at least one named rule — the
    explanation is the product, not a nice-to-have."""
    for cp in range(4):
        for baseline in ("low", "medium", "high"):
            for medication in (True, False):
                result = triage(chest_pain=cp, baseline=baseline,
                                medication_taken=medication)
                assert result.fired_rules, (
                    f"No rules fired for cp={cp} baseline={baseline} "
                    f"medication={medication}"
                )


@requires_prolog
def test_facts_do_not_leak_between_calls():
    """A fact left asserted would contaminate the next patient."""
    triage(chest_pain=3, baseline="high")
    clean = triage()

    assert clean.status == "good"
    assert "severe_chest_pain" not in clean.fired_rules


@requires_prolog
def test_score_rises_with_symptom_load():
    assert triage().score < triage(chest_pain=2).score < triage(
        chest_pain=3, breathlessness=3, fatigue=3
    ).score