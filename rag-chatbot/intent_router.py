"""Safety gate. Runs BEFORE retrieval, never after.

Order is the whole point. An emergency question must never reach the vector
store or the LLM — it takes the shortest possible path to "call emergency
services". Putting this check after retrieval would mean the dangerous case
depends on the least predictable part of the system.

Rule-based, not a classifier. Three reasons:
  1. A missed emergency is not an acceptable error rate.
  2. Every decision has to be auditable — you can point at the pattern that
     fired and explain it to a supervisor.
  3. It runs in microseconds with no model to load.

The cost is recall: phrasing not in the patterns falls through to `education`.
That is the right direction to fail, because the education path still refuses
to diagnose — the generator is instructed to answer only from sources.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Literal

Intent = Literal["emergency", "diagnosis_request", "faq", "education"]


@dataclass(frozen=True)
class IntentMatch:
    intent: Intent
    matched_pattern: str | None = None


# Ordered most-dangerous first. The first match wins, so emergency patterns
# must be checked before anything else.
EMERGENCY_PATTERNS = [
    r"\b(crushing|severe|worst|unbearable)\s+(chest\s+)?pain\b",
    r"\bchest\s+pain\s+(right\s+)?now\b",
    r"\bcan'?t\s+breathe\b",
    r"\bcannot\s+breathe\b",
    r"\bstruggling\s+to\s+breathe\b",
    r"\b(having|am\s+i\s+having)\s+a\s+heart\s+attack\b",
    r"\bheart\s+attack\s+(right\s+)?now\b",
    r"\bcollaps(ed|ing)\b",
    r"\bpassed\s+out\b",
    r"\bunconscious\b",
    r"\bblue\s+lips\b",
    r"\bpain\s+(spreading|radiating)\s+to\s+my\s+(arm|jaw|neck)\b",
    r"\bemergency\b",
    # Burmese — common phrasings. Kept alongside English because a visitor in
    # distress will not switch languages to be understood.
    r"ရင်ဘတ်အောင့်",
    r"အသက်ရှူမရ",
    r"နှလုံးရောဂါ.*ဖြစ်နေ",
    r"အရေးပေါ်",
]

DIAGNOSIS_PATTERNS = [
    r"\bdo\s+i\s+have\b",
    r"\bam\s+i\s+(having|at\s+risk|going\s+to)\b",
    r"\bis\s+(this|that|my|it)\s+.{0,30}(serious|dangerous|normal|bad)\b",
    r"\bshould\s+i\s+(stop|start|change|take|double)\s+.{0,30}(medication|medicine|pill|dose|tablet)\b",
    r"\bwhat'?s\s+wrong\s+with\s+me\b",
    r"\bmy\s+(symptoms?|results?|ecg|test)\b",
    r"\bdiagnos(e|is)\s+me\b",
    r"\bhow\s+long\s+(do\s+)?i\s+have\b",
    r"ကျွန်တော်.*ရောဂါ",
    r"ကျွန်မ.*ရောဂါ",
]

FAQ_PATTERNS = [
    r"\bwhat\s+is\s+cardioai\b",
    r"\bhow\s+(do|does)\s+(i|this|it|cardioai)\s+(work|sign\s+up|register|start)\b",
    r"\bcreate\s+an?\s+account\b",
    r"\bhow\s+much\s+(does\s+it\s+)?cost\b",
    r"\bis\s+(it|cardioai)\s+free\b",
    r"\b(who|what)\s+can\s+see\s+my\s+(data|record|information)\b",
    r"\bprivacy\b",
    r"\bfind\s+a\s+doctor\b",
]


EMERGENCY_REPLY = (
    "This sounds like it could be a medical emergency. Please call your local "
    "emergency number or go to the nearest emergency department now. "
    "I can't assess symptoms, and waiting for an answer here could cost time "
    "you don't have."
)

DIAGNOSIS_REPLY = (
    "I can't tell you whether you have a heart condition — only a doctor can, "
    "using an examination and tests. If you'd like to track your symptoms over "
    "time and share them with a doctor, you can create a patient account on "
    "CardioAI. If you're worried about symptoms right now, please speak to a "
    "doctor rather than waiting."
)


def _first_match(text: str, patterns: list[str]) -> str | None:
    for pattern in patterns:
        if re.search(pattern, text, re.IGNORECASE):
            return pattern
    return None


def classify(question: str) -> IntentMatch:
    """Return the intent and the pattern that decided it.

    The pattern is returned so a refusal can be justified after the fact —
    "which rule fired" is the same accountability principle as the Prolog
    engine's fired_rules.
    """
    text = question.strip()

    matched = _first_match(text, EMERGENCY_PATTERNS)
    if matched:
        return IntentMatch("emergency", matched)

    matched = _first_match(text, DIAGNOSIS_PATTERNS)
    if matched:
        return IntentMatch("diagnosis_request", matched)

    matched = _first_match(text, FAQ_PATTERNS)
    if matched:
        return IntentMatch("faq", matched)

    return IntentMatch("education", None)


def redirect_reply(intent: Intent) -> str | None:
    """The canned answer for intents that must never reach retrieval."""
    if intent == "emergency":
        return EMERGENCY_REPLY
    if intent == "diagnosis_request":
        return DIAGNOSIS_REPLY
    return None