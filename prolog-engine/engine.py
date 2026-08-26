"""Bridge between the HTTP layer and rules.pl.

No Python fallback. If SWI-Prolog isn't available the service refuses to
answer rather than quietly substituting different logic — a second copy of
the rules in Python would drift from rules.pl, and the two disagreeing about
a chest-pain triage is exactly the failure this architecture exists to avoid.

pyswip holds a single global Prolog engine that is not thread-safe, hence the
lock. Under real load this becomes a bottleneck; the fix then is multiple
worker processes, not removing the lock.
"""

from __future__ import annotations

import logging
import os
import threading
from dataclasses import dataclass
from pathlib import Path

log = logging.getLogger(__name__)

RULEBASE = Path(__file__).with_name("rules.pl")
RULEBASE_DIR = str(RULEBASE.parent)

# Guards both the Prolog engine (not thread-safe) and the chdir inside
# _consult_rulebase, which changes state for the whole process.
_lock = threading.Lock()

SYMPTOM_KEYS = ("chest_pain", "breathlessness", "fatigue", "swelling", "dizziness")


class PrologUnavailable(RuntimeError):
    """SWI-Prolog or pyswip is missing, or the rulebase failed to load."""


@dataclass(frozen=True)
class TriageResult:
    status: str
    urgency: str
    recommendation: str
    fired_rules: list[str]
    score: float


def _consult_rulebase(prolog) -> None:
    """Load rules.pl by bare filename, from its own directory.

    pyswip builds a consult('<path>') term and hands it to Prolog's parser.
    On Windows the path contains backslashes, and Prolog reads those inside a
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


def _score(symptoms: dict[str, int], medication_taken: bool, baseline: str) -> float:
    """A 0-100 number for the UI's status band.

    Summarises the inputs; it never overrides the rule outcome. Kept in Python
    rather than Prolog because it is arithmetic presentation, not clinical
    logic, and mixing the two makes rules.pl harder to audit.
    """
    load = sum(symptoms.values()) / (len(SYMPTOM_KEYS) * 3)
    baseline_weight = {"low": 0.10, "medium": 0.25, "high": 0.40}[baseline]
    adherence_penalty = 0.0 if medication_taken else 0.15
    raw = 0.6 * load + baseline_weight + adherence_penalty
    return round(min(raw, 1.0) * 100, 1)


def _decode(value) -> str:
    """pyswip returns bytes on some platforms, str on others."""
    if isinstance(value, bytes):
        return value.decode()
    return str(value)


def run_triage(symptoms: dict[str, int], medication_taken: bool,
               baseline: str) -> TriageResult:
    from pyswip import Prolog

    facts = [f"symptom({key}, {symptoms[key]})" for key in SYMPTOM_KEYS]
    facts.append(f"medication_taken({str(medication_taken).lower()})")
    facts.append(f"baseline({baseline})")

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
        log.error("No rules fired for symptoms=%s medication=%s baseline=%s",
                  symptoms, medication_taken, baseline)

    return TriageResult(
        status=_decode(first["Status"]),
        urgency=_decode(first["Urgency"]),
        recommendation=_decode(first["Recommendation"]),
        fired_rules=fired,
        score=_score(symptoms, medication_taken, baseline),
    )