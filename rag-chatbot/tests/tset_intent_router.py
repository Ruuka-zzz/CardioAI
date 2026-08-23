"""Tests for the intent gate.

The emergency cases here are the most important tests in the whole project.
Everything else failing produces a bad answer; this failing sends someone
having a heart attack into a chatbot conversation.

No SWI-Prolog, no vector store, no API key needed — these run anywhere.
"""

import pytest

from intent_router import classify, redirect_reply

EMERGENCY_QUESTIONS = [
    "I have crushing chest pain",
    "I think I'm having a heart attack",
    "I can't breathe",
    "I cannot breathe properly",
    "my chest pain right now is unbearable",
    "my husband collapsed",
    "he passed out just now",
    "the pain is radiating to my arm",
    "is this an emergency",
    "ရင်ဘတ်အောင့်နေတယ်",
    "အသက်ရှူမရဘူး",
]

DIAGNOSIS_QUESTIONS = [
    "do I have heart disease",
    "am I at risk of a heart attack",
    "is this serious",
    "should I stop my medication",
    "what's wrong with me",
    "can you look at my symptoms",
    "should I double my dose",
]

FAQ_QUESTIONS = [
    "what is CardioAI",
    "how do I sign up",
    "how does it work",
    "how much does it cost",
    "who can see my record",
]

EDUCATION_QUESTIONS = [
    "what causes heart disease",
    "how does high blood pressure affect the heart",
    "what foods are good for heart health",
    "what is atrial fibrillation",
    "how much exercise is recommended",
]


@pytest.mark.parametrize("question", EMERGENCY_QUESTIONS)
def test_emergency_is_caught(question):
    assert classify(question).intent == "emergency"


@pytest.mark.parametrize("question", DIAGNOSIS_QUESTIONS)
def test_diagnosis_request_is_caught(question):
    assert classify(question).intent == "diagnosis_request"


@pytest.mark.parametrize("question", FAQ_QUESTIONS)
def test_faq_is_recognised(question):
    assert classify(question).intent == "faq"


@pytest.mark.parametrize("question", EDUCATION_QUESTIONS)
def test_education_falls_through(question):
    assert classify(question).intent == "education"


def test_emergency_beats_diagnosis():
    """Both patterns match here. Emergency must win — it is checked first,
    and that ordering is not an accident."""
    result = classify("do I have a heart attack, I can't breathe")
    assert result.intent == "emergency"


def test_redirected_intents_get_a_reply():
    for intent in ("emergency", "diagnosis_request"):
        assert redirect_reply(intent)


def test_answerable_intents_get_no_redirect():
    for intent in ("education", "faq"):
        assert redirect_reply(intent) is None


def test_emergency_reply_names_emergency_services():
    reply = redirect_reply("emergency").lower()
    assert "emergency" in reply


def test_diagnosis_reply_refuses_to_diagnose():
    reply = redirect_reply("diagnosis_request").lower()
    assert "doctor" in reply


def test_matched_pattern_is_returned_for_audit():
    """Every refusal must be explainable — same principle as fired_rules."""
    result = classify("I can't breathe")
    assert result.matched_pattern is not None


def test_case_and_whitespace_do_not_matter():
    assert classify("   I CAN'T BREATHE   ").intent == "emergency"


def test_empty_question_does_not_crash():
    assert classify("").intent == "education"