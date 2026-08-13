"""Tests for services/scheduling.py.

expand_slots is a pure function, so these need no database — which is the
whole reason it was split out from open_slots.
"""

from datetime import datetime, time

from services.scheduling import expand_slots


class FakeRule:
    """Stands in for AvailabilitySlot. Only three attributes are read."""

    def __init__(self, weekday, start, end):
        self.weekday = weekday
        self.start_time = start
        self.end_time = end


MONDAY_9AM = datetime(2026, 8, 17, 9, 0)  # a Monday


def test_expands_a_window_into_fixed_slots():
    rules = [FakeRule(0, time(9, 0), time(11, 0))]
    slots = expand_slots(rules, busy=set(), now=datetime(2026, 8, 17, 8, 0),
                         days=1, minutes=30)

    assert len(slots) == 4
    assert slots[0][0] == MONDAY_9AM
    assert slots[0][1] == datetime(2026, 8, 17, 9, 30)


def test_skips_booked_starts():
    rules = [FakeRule(0, time(9, 0), time(11, 0))]
    slots = expand_slots(rules, busy={MONDAY_9AM}, now=datetime(2026, 8, 17, 8, 0),
                         days=1, minutes=30)

    assert MONDAY_9AM not in [start for start, _ in slots]
    assert len(slots) == 3


def test_never_offers_a_time_in_the_past():
    rules = [FakeRule(0, time(9, 0), time(11, 0))]
    slots = expand_slots(rules, busy=set(), now=datetime(2026, 8, 17, 10, 0),
                         days=1, minutes=30)

    assert all(start > datetime(2026, 8, 17, 10, 0) for start, _ in slots)


def test_ignores_rules_for_other_weekdays():
    rules = [FakeRule(2, time(9, 0), time(11, 0))]  # Wednesday only
    slots = expand_slots(rules, busy=set(), now=datetime(2026, 8, 17, 8, 0),
                         days=1, minutes=30)

    assert slots == []


def test_does_not_emit_a_slot_that_overruns_the_window():
    """A 45-minute appointment does not fit twice into a 60-minute window."""
    rules = [FakeRule(0, time(9, 0), time(10, 0))]
    slots = expand_slots(rules, busy=set(), now=datetime(2026, 8, 17, 8, 0),
                         days=1, minutes=45)

    assert len(slots) == 1
    assert slots[0][1] <= datetime(2026, 8, 17, 10, 0)