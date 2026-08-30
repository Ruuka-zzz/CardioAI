"""Bridge between the HTTP layer and rules.pl.

No Python fallback. If SWI-Prolog isn't available the service refuses to
answer rather than quietly substituting different logic — a second copy of
the rules in Python would drift from rules.pl, and the two disagreeing about
a chest-pain triage is exactly the failure this architecture exists to avoid.

pyswip holds a single global Prolog engine that is not thread-safe, hence the
lock. Under real load the fix is multiple worker processes, not removing it.
"""

from __future__ import annotations

import logging
import os
import threading
from dataclasses import dataclass, field
from pathlib import Path

log = logging.getLogger(__name__)

RULEBASE = Path(__file__).with_name("rules.pl")
RULEBASE_DIR = str(RULEBASE.parent)

# Guards both the Prolog engine (not thread-safe) and the chdir inside
# _consult_rulebase, which changes state for the whole process.
_lock = threading.Lock()

SYMPTOM_KEYS = (
    "chest_pain", "breathlessness", "dizziness", "fatigue",
    "palpitations", "swelling",
)

VITAL_KEYS = ("systolic_bp", "diastolic_bp", "heart_rate", "temperature_c")

HISTORY_KEYS = (
    "hypertension", "diabetes", "ischemic_heart_disease", "heart_failure",
    "heart_attack", "stroke", "valve_disease",
)

# breathlessness_trigger -> NYHA functional class. Returned alongside the
# triage result so the UI can name the class the patient falls into.
NYHA_BY_TRIGGER = {"none": None, "stairs": 2, "walking": 3, "at_rest": 4}


class PrologUnavailable(RuntimeError):
    """SWI-Prolog or pyswip is missing, or the rulebase failed to load."""


@dataclass(frozen=True)
class TriageResult:
    status: str
    urgency: str
    recommendation: str
    fired_rules: list[str] = field(default_factory=list)
    score: float = 0.0
    nyha_class: int | None = None


def _consult_rulebase(prolog) -> None:
    """Load rules.pl by bare filename, from its own directory.

    pyswip builds a consult('<path>') term and hands it to Prolog's parser.
    On Windows the path contains backslashes, which Prolog reads inside a
    quoted atom as escape sequences — "D:\\AIproject\\..." fails on \\A, which
    is not a valid escape. Forward slashes don't help either: pyswip
    normalises them back to the platform separator before the term is built.

    Passing just "rules.pl" leaves no separators to misread. The cost is a
    chdir, which is process-wide state, so every caller must hold _lock.
    """
    previous = os.getcwd()
    os.chdir(RULEBASE_DIR)
    try:
        prolog.consult("rules.pl")
    finally:
        os.chdir(previous)


def check_available() -> None:
    """Called at startup so a broken install surfaces immediately."""
    try:
        from pyswip import Prolog
    except ImportError as err:
        raise PrologUnavailable(
            "pyswip is not installed. Run: pip install -r requirements.txt"
        ) from err

    if not RULEBASE.exists():
        raise PrologUnavailable(f"Rulebase not found at {RULEBASE}")

    try:
        with _lock:
            prolog = Prolog()
            _consult_rulebase(prolog)
    except Exception as err:  # noqa: BLE001 — pyswip raises bare exceptions
        raise PrologUnavailable(
            "SWI-Prolog could not be loaded. Install it from "
            "https://www.swi-prolog.org/download/stable and make sure swipl "
            f"is on your PATH. Underlying error: {err}"
        ) from err


def _score(symptoms: dict, trigger: str, vitals: dict, medication: dict,
           baseline: str, worse: bool) -> float:
    """A 0-100 number for the UI's status band.

    Summarises the inputs; it never overrides the rule outcome. Kept in Python
    rather than Prolog because it is arithmetic presentation, not clinical
    logic, and mixing the two makes rules.pl harder to audit.

    Weights are deliberately crude and are NOT a validated risk score. They
    exist so the band moves sensibly as answers change, nothing more.
    """
    symptom_load = sum(1 for key in SYMPTOM_KEYS if symptoms.get(key)) / len(SYMPTOM_KEYS)

    nyha = NYHA_BY_TRIGGER.get(trigger) or 0
    nyha_weight = {0: 0.0, 2: 0.10, 3: 0.20, 4: 0.35}[nyha]

    baseline_weight = {"low": 0.05, "medium": 0.15, "high": 0.25}[baseline]

    adherence = 0.0
    if not medication.get("taken", True):
        adherence += 0.10
    if medication.get("extra"):
        adherence += 0.10

    vital_weight = 0.0
    systolic = vitals.get("systolic_bp")
    if systolic:
        if systolic >= 180:
            vital_weight += 0.25
        elif systolic >= 160:
            vital_weight += 0.15
        elif systolic >= 140:
            vital_weight += 0.07
    heart_rate = vitals.get("heart_rate")
    if heart_rate and (heart_rate >= 120 or heart_rate <= 45):
        vital_weight += 0.15

    change = 0.10 if worse else 0.0

    raw = (0.35 * symptom_load + nyha_weight + baseline_weight
           + adherence + vital_weight + change)
    return round(min(raw, 1.0) * 100, 1)


def _decode(value) -> str:
    """pyswip returns bytes on some platforms, str on others."""
    return value.decode() if isinstance(value, bytes) else str(value)


def _build_facts(symptoms: dict, trigger: str, worse: bool, vitals: dict,
                 medication: dict, baseline: str, history: dict) -> list[str]:
    facts = [
        f"symptom({key}, {str(bool(symptoms.get(key))).lower()})"
        for key in SYMPTOM_KEYS
    ]
    facts.append(f"breathlessness_trigger({trigger})")
    facts.append(f"worse_than_usual({str(bool(worse)).lower()})")

    # Vitals only when supplied. Asserting a placeholder would make every
    # blood-pressure rule fire on a number the patient never gave.
    for key in VITAL_KEYS:
        value = vitals.get(key)
        if value is not None:
            facts.append(f"vital({key}, {value})")

    for key in ("taken", "missed", "extra"):
        facts.append(f"medication({key}, {str(bool(medication.get(key))).lower()})")

    facts.append(f"baseline({baseline})")

    # Only conditions the patient HAS. Absence means no diagnosis, which is
    # what the rules test for.
    for key in HISTORY_KEYS:
        if history.get(key):
            facts.append(f"history({key})")

    return facts


def run_triage(symptoms: dict, breathlessness_trigger: str, worse_than_usual: bool,
               vitals: dict, medication: dict, baseline: str,
               history: dict) -> TriageResult:
    from pyswip import Prolog

    facts = _build_facts(symptoms, breathlessness_trigger, worse_than_usual,
                         vitals, medication, baseline, history)

    with _lock:
        prolog = Prolog()
        _consult_rulebase(prolog)

        for fact in facts:
            prolog.assertz(fact)
        try:
            solutions = list(
                prolog.query("triage(Status, Urgency, Recommendation, FiredRules)")
            )
        finally:
            # Retract in every case. A leaked fact would silently contaminate
            # the next patient's triage — the worst possible bug here.
            for fact in facts:
                try:
                    prolog.retract(fact)
                except Exception:  # noqa: BLE001
                    log.exception("Failed to retract %s", fact)

    if not solutions:
        raise PrologUnavailable("triage/4 produced no solution — check rules.pl")

    first = solutions[0]
    fired = [_decode(rule) for rule in first["FiredRules"]]

    if not fired:
        log.error("No rules fired for symptoms=%s trigger=%s baseline=%s",
                  symptoms, breathlessness_trigger, baseline)

    return TriageResult(
        status=_decode(first["Status"]),
        urgency=_decode(first["Urgency"]),
        recommendation=_decode(first["Recommendation"]),
        fired_rules=fired,
        score=_score(symptoms, breathlessness_trigger, vitals, medication,
                     baseline, worse_than_usual),
        nyha_class=NYHA_BY_TRIGGER.get(breathlessness_trigger),
    )