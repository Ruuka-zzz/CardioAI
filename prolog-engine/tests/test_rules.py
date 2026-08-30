"""Tests for rules.pl, driven through engine.run_triage.

These require SWI-Prolog and are skipped without it, so CI reports honestly
rather than green.

Each test names the rule it expects to fire. Asserting on fired_rules rather
than only on status is deliberate: the right answer for the wrong reason is
still a bug, and the patient reads the reason.
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


def triage(chest_pain=False, breathlessness=False, trigger="none",
           dizziness=False, fatigue=False, palpitations=False, swelling=False,
           worse=False, systolic=None, diastolic=None, heart_rate=None,
           temperature=None, taken=True, missed=False, extra=False,
           baseline="low", **history):
    return engine.run_triage(
        symptoms={
            "chest_pain": chest_pain,
            "breathlessness": breathlessness,
            "dizziness": dizziness,
            "fatigue": fatigue,
            "palpitations": palpitations,
            "swelling": swelling,
        },
        breathlessness_trigger=trigger,
        worse_than_usual=worse,
        vitals={
            "systolic_bp": systolic,
            "diastolic_bp": diastolic,
            "heart_rate": heart_rate,
            "temperature_c": temperature,
        },
        medication={"taken": taken, "missed": missed, "extra": extra},
        baseline=baseline,
        history=history,
    )


# ------------------------------------------------------------ baseline case

@requires_prolog
def test_no_symptoms_is_good():
    result = triage()
    assert result.status == "good"
    assert result.urgency == "routine"
    assert "all_clear" in result.fired_rules


# ---------------------------------------------------------------- NYHA

@requires_prolog
def test_breathless_at_rest_is_emergency():
    """NYHA IV — the most serious answer on the daily form."""
    result = triage(breathlessness=True, trigger="at_rest")
    assert result.urgency == "emergency"
    assert result.nyha_class == 4
    assert "breathless_at_rest" in result.fired_rules


@requires_prolog
def test_breathless_walking_is_elevated():
    result = triage(breathlessness=True, trigger="walking")
    assert result.urgency == "elevated"
    assert result.nyha_class == 3


@requires_prolog
def test_breathless_on_stairs_is_routine():
    result = triage(breathlessness=True, trigger="stairs")
    assert result.urgency == "routine"
    assert result.nyha_class == 2


@requires_prolog
def test_no_breathlessness_has_no_nyha_class():
    assert triage(fatigue=True).nyha_class is None


# ------------------------------------------------------------- chest pain

@requires_prolog
def test_chest_pain_alone_is_elevated():
    result = triage(chest_pain=True)
    assert result.urgency == "elevated"
    assert "chest_pain_present" in result.fired_rules


@requires_prolog
def test_chest_pain_worse_than_usual_is_emergency():
    """The same symptom, one extra answer, a different urgency."""
    result = triage(chest_pain=True, worse=True)
    assert result.urgency == "emergency"
    assert "chest_pain_worsening" in result.fired_rules


@requires_prolog
def test_chest_pain_escalates_on_prior_heart_attack():
    result = triage(chest_pain=True, heart_attack=True)
    assert result.urgency == "emergency"
    assert "chest_pain_prior_mi" in result.fired_rules


@requires_prolog
def test_chest_pain_escalates_on_high_baseline():
    assert triage(chest_pain=True, baseline="low").urgency == "elevated"
    assert triage(chest_pain=True, baseline="high").urgency == "emergency"


# ------------------------------------------------------------ vitals

@requires_prolog
def test_hypertensive_crisis_is_emergency():
    result = triage(systolic=185)
    assert result.urgency == "emergency"
    assert "bp_crisis" in result.fired_rules


@requires_prolog
def test_normal_blood_pressure_fires_nothing():
    result = triage(systolic=118, diastolic=76)
    assert "bp_crisis" not in result.fired_rules
    assert "bp_high" not in result.fired_rules
    assert "bp_slightly_high" not in result.fired_rules


@requires_prolog
def test_missing_vitals_never_fire_a_vitals_rule():
    """The most important vitals test. A patient with no monitor must not
    trigger a blood-pressure rule on an assumed number."""
    result = triage(fatigue=True)
    for rule in result.fired_rules:
        assert not rule.startswith("bp_")
        assert not rule.startswith("heart_rate_")


@requires_prolog
def test_dangerous_heart_rates_are_emergencies():
    assert "heart_rate_very_high" in triage(heart_rate=140).fired_rules
    assert "heart_rate_very_low" in triage(heart_rate=38).fired_rules


# ---------------------------------------------------------- combinations

@requires_prolog
def test_swelling_with_breathlessness_is_congestion():
    result = triage(swelling=True, breathlessness=True, trigger="stairs")
    assert result.urgency == "elevated"
    assert "congestion_pattern" in result.fired_rules


@requires_prolog
def test_swelling_escalates_with_heart_failure_history():
    assert triage(swelling=True).urgency == "routine"
    assert triage(swelling=True, heart_failure=True).urgency == "elevated"


@requires_prolog
def test_three_symptoms_escalate():
    result = triage(fatigue=True, palpitations=True, swelling=True)
    assert "multiple_symptoms" in result.fired_rules


@requires_prolog
def test_two_symptoms_do_not():
    result = triage(fatigue=True, palpitations=True)
    assert "multiple_symptoms" not in result.fired_rules


# ------------------------------------------------------------ medication

@requires_prolog
def test_missed_medication_is_flagged():
    assert "missed_medication" in triage(taken=False).fired_rules


@requires_prolog
def test_extra_medication_is_elevated():
    result = triage(extra=True)
    assert result.urgency == "elevated"
    assert "extra_medication_taken" in result.fired_rules


# ------------------------------------------------------ structural rules

@requires_prolog
def test_most_severe_rule_wins():
    """Chest pain at rest plus mild fatigue must give the chest pain answer,
    not an average and not the first rule listed."""
    result = triage(chest_pain=True, worse=True, fatigue=True)
    assert result.urgency == "emergency"
    assert "chest_pain_worsening" in result.fired_rules
    assert "mild_symptoms" in result.fired_rules  # still reported


@requires_prolog
def test_fired_rules_have_no_duplicates():
    """list_to_set in triage/4 guards this. Without it, mild_symptoms once
    fired per matching symptom and the patient saw it five times."""
    result = triage(fatigue=True, palpitations=True, swelling=True)
    assert len(result.fired_rules) == len(set(result.fired_rules))


@requires_prolog
def test_every_result_explains_itself():
    """No triage result may arrive without at least one named rule — the
    explanation is the product, not a nice-to-have."""
    for chest in (True, False):
        for trigger in ("none", "stairs", "walking", "at_rest"):
            for baseline in ("low", "medium", "high"):
                result = triage(
                    chest_pain=chest,
                    breathlessness=trigger != "none",
                    trigger=trigger,
                    baseline=baseline,
                )
                assert result.fired_rules, (
                    f"No rules fired for chest={chest} trigger={trigger} "
                    f"baseline={baseline}"
                )


@requires_prolog
def test_facts_do_not_leak_between_calls():
    """A fact left asserted would contaminate the next patient."""
    triage(chest_pain=True, worse=True, systolic=190, heart_failure=True)
    clean = triage()

    assert clean.status == "good"
    assert clean.fired_rules == ["all_clear"]


@requires_prolog
def test_score_rises_with_severity():
    assert triage().score < triage(fatigue=True).score
    assert (
        triage(fatigue=True).score
        < triage(chest_pain=True, breathlessness=True, trigger="at_rest",
                 systolic=190, baseline="high").score
    )