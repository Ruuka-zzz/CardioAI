% CardioAI daily symptom triage.
%
% Facts are asserted per request by engine.py, matching facts_template.pl.
% Entry point: triage(Status, Urgency, Recommendation, FiredRules).
%
% Every rule names itself. That name travels through the backend to the
% patient's screen as "why you got this result" — it is not debug output, it
% is the product. A rule with no readable label in shared/enums.js is a bug.
%
% Rule ordering here is for human reading only; severity/2 below decides the
% outcome, so adding a rule in the wrong place cannot change the result.

:- discontiguous rule/4.
:- dynamic symptom/2, medication_taken/1, baseline/1.


% ============================================================
% EMERGENCY — contact emergency services now
% ============================================================

rule(bad, emergency,
     'Severe chest pain needs urgent assessment. Contact emergency services now.',
     severe_chest_pain) :-
    symptom(chest_pain, S), S >= 3.

rule(bad, emergency,
     'Chest pain with your high baseline risk needs same-day care. Contact emergency services.',
     chest_pain_high_baseline) :-
    symptom(chest_pain, S), S >= 2,
    baseline(high).

rule(bad, emergency,
     'Breathlessness together with dizziness needs urgent assessment. Contact emergency services.',
     breathless_with_dizziness) :-
    symptom(breathlessness, B), B >= 3,
    symptom(dizziness, D), D >= 2.


% ============================================================
% ELEVATED — see a doctor today or within 24 hours
% ============================================================

rule(bad, elevated,
     'Several symptoms worsened together. Book an appointment with your doctor today.',
     multiple_moderate_symptoms) :-
    findall(N, (symptom(_, N), N >= 2), Moderate),
    length(Moderate, Count), Count >= 3.

rule(fair, elevated,
     'New swelling can mean fluid retention. Contact your doctor within 24 hours.',
     swelling_present) :-
    symptom(swelling, S), S >= 2.

rule(fair, elevated,
     'Missing medication raises your risk. Take your dose and tell your doctor.',
     missed_medication_high_baseline) :-
    medication_taken(false),
    baseline(high).

rule(fair, elevated,
     'Moderate chest pain should be reviewed. Book an appointment this week.',
     moderate_chest_pain) :-
    symptom(chest_pain, S), S >= 2.


% ============================================================
% ROUTINE — keep monitoring
% ============================================================

rule(fair, routine,
     'Mild symptoms today. Keep monitoring and log again tomorrow.',
     mild_symptoms) :-
    symptom(_, S), S >= 1.

rule(fair, routine,
     'You missed a dose today. Take it as soon as you can unless your doctor said otherwise.',
     missed_medication) :-
    medication_taken(false).

rule(good, routine,
     'No symptoms reported and medication taken. Keep it up.',
     all_clear) :-
    \+ (symptom(_, S), S >= 1),
    medication_taken(true).


% ============================================================
% RESOLUTION
% ============================================================
%
% Collect every rule that fires, then return the most severe outcome along
% with the full list. Two design choices worth keeping:
%
%   1. Most severe wins. Never average, never take the first match — a
%      patient with severe chest pain AND mild fatigue must get the chest
%      pain answer.
%   2. All fired rules are returned, not just the winner. The patient sees
%      everything that contributed, which is the whole reason this is Prolog
%      and not a model.

severity(emergency, 3).
severity(elevated,  2).
severity(routine,   1).

triage(Status, Urgency, Recommendation, FiredRules) :-
    findall(Sev-rule(St, Ur, Rec, Name),
            ( rule(St, Ur, Rec, Name),
              severity(Ur, Sev) ),
            Matches),
    Matches \= [],
    !,
    sort(0, @>=, Matches, [_-rule(Status, Urgency, Recommendation, _) | _]),
    findall(N, member(_-rule(_, _, _, N), Matches), FiredRules).

% Nothing matched. Should be unreachable — all_clear or mild_symptoms covers
% every input — so reaching here means the rulebase has a gap.
triage(good, routine,
       'No symptoms reported. Keep monitoring and log again tomorrow.',
       []).