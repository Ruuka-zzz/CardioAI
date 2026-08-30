% ============================================================
% CardioAI daily symptom triage
% ============================================================
%
% Facts asserted per request by engine.py — see facts_template.pl.
% Entry point: triage(Status, Urgency, Recommendation, FiredRules).
%
% EVERY RULE NAMES ITSELF. That name travels through the backend to the
% patient's screen as "why you got this result". It is not debug output; it
% is the product. A rule whose name has no label in shared/enums.js is a bug.
%
% SYMPTOMS ARE BOOLEAN NOW. Severity comes from breathlessness_trigger,
% which is the NYHA functional class in plain language:
%
%     stairs   -> NYHA II   ordinary activity brings it on
%     walking  -> NYHA III  less than ordinary activity
%     at_rest  -> NYHA IV   symptoms at rest
%
% VITALS ARE OPTIONAL. Not every patient owns a blood-pressure monitor, so
% vital/2 may simply be absent. Rules that read vitals fail silently when it
% is — they never assume a number.
%
% HISTORY MATTERS. Ankle swelling in someone with diagnosed heart failure is
% a different event from ankle swelling in someone without. history/1 carries
% the diagnoses the baseline collected.

:- discontiguous rule/4.
:- dynamic symptom/2, breathlessness_trigger/1, worse_than_usual/1,
           vital/2, medication/2, baseline/1, history/1.


% ============================================================
% EMERGENCY — contact emergency services now
% ============================================================

rule(bad, emergency,
     'Chest pain that is new or worse than usual needs urgent assessment. Contact emergency services now.',
     chest_pain_worsening) :-
    symptom(chest_pain, true),
    worse_than_usual(true).

rule(bad, emergency,
     'Chest pain with your high baseline risk needs same-day care. Contact emergency services.',
     chest_pain_high_baseline) :-
    symptom(chest_pain, true),
    baseline(high).

rule(bad, emergency,
     'Chest pain when you have had a heart attack before needs urgent assessment. Contact emergency services now.',
     chest_pain_prior_mi) :-
    symptom(chest_pain, true),
    history(heart_attack).

% NYHA IV. Breathlessness at rest is the single most serious answer on the
% daily form.
rule(bad, emergency,
     'Breathlessness while resting is serious. Contact emergency services now.',
     breathless_at_rest) :-
    breathlessness_trigger(at_rest).

rule(bad, emergency,
     'Breathlessness together with dizziness needs urgent assessment. Contact emergency services.',
     breathless_with_dizziness) :-
    symptom(breathlessness, true),
    symptom(dizziness, true).

rule(bad, emergency,
     'Chest pain with a racing heartbeat and dizziness needs urgent assessment. Contact emergency services.',
     chest_pain_palpitations_dizziness) :-
    symptom(chest_pain, true),
    symptom(palpitations, true),
    symptom(dizziness, true).

% Hypertensive crisis thresholds (>=180 systolic or >=120 diastolic).
rule(bad, emergency,
     'Your blood pressure is dangerously high. Contact emergency services now.',
     bp_crisis) :-
    ( vital(systolic_bp, S), S >= 180
    ; vital(diastolic_bp, D), D >= 120
    ).

rule(bad, emergency,
     'Your blood pressure is very low. Contact emergency services now.',
     bp_very_low) :-
    vital(systolic_bp, S), S =< 90.

rule(bad, emergency,
     'Your heart rate is dangerously fast. Contact emergency services now.',
     heart_rate_very_high) :-
    vital(heart_rate, H), H >= 130.

rule(bad, emergency,
     'Your heart rate is dangerously slow. Contact emergency services now.',
     heart_rate_very_low) :-
    vital(heart_rate, H), H =< 40.


% ============================================================
% ELEVATED — see a doctor today or within 24 hours
% ============================================================

% NYHA III.
rule(bad, elevated,
     'Breathlessness when walking on the flat is a marked change. Contact your doctor today.',
     breathless_when_walking) :-
    breathlessness_trigger(walking).

% The classic fluid-overload pattern.
rule(bad, elevated,
     'Swelling together with breathlessness can mean fluid is building up. Contact your doctor today.',
     congestion_pattern) :-
    symptom(swelling, true),
    symptom(breathlessness, true).

rule(bad, elevated,
     'Swelling when you have diagnosed heart failure needs review today.',
     swelling_with_heart_failure) :-
    symptom(swelling, true),
    history(heart_failure).

rule(bad, elevated,
     'Several symptoms are present together. Book an appointment with your doctor today.',
     multiple_symptoms) :-
    findall(S, (symptom(S, true)), List),
    length(List, Count), Count >= 3.

rule(fair, elevated,
     'Your symptoms are worse than usual today. Contact your doctor within 24 hours.',
     worse_than_baseline) :-
    worse_than_usual(true),
    once(symptom(_, true)).

rule(fair, elevated,
     'Chest pain should be reviewed. Contact your doctor within 24 hours.',
     chest_pain_present) :-
    symptom(chest_pain, true).

rule(fair, elevated,
     'Missing your medication raises your risk. Take your dose and tell your doctor.',
     missed_medication_high_baseline) :-
    medication(taken, false),
    baseline(high).

rule(fair, elevated,
     'Missing heart medication when you have heart failure needs a call to your doctor today.',
     missed_medication_heart_failure) :-
    medication(taken, false),
    history(heart_failure).

rule(fair, elevated,
     'Your blood pressure is high. Contact your doctor within 24 hours.',
     bp_high) :-
    vital(systolic_bp, S), S >= 160, S < 180.

rule(fair, elevated,
     'A racing or irregular heartbeat with your high baseline risk should be reviewed today.',
     palpitations_high_baseline) :-
    symptom(palpitations, true),
    baseline(high).

rule(fair, elevated,
     'Taking extra medication without advice can be unsafe. Contact your doctor today.',
     extra_medication_taken) :-
    medication(extra, true).

rule(fair, elevated,
     'A fever alongside heart symptoms should be reviewed. Contact your doctor today.',
     fever_with_symptoms) :-
    vital(temperature_c, T), T >= 38.0,
    once(symptom(_, true)).


% ============================================================
% ROUTINE — keep monitoring
% ============================================================

% NYHA II.
rule(fair, routine,
     'Breathlessness on stairs is worth watching. Keep logging and mention it at your next appointment.',
     breathless_on_stairs) :-
    breathlessness_trigger(stairs).

rule(fair, routine,
     'Swelling can mean fluid retention. Keep monitoring and mention it to your doctor.',
     swelling_only) :-
    symptom(swelling, true).

rule(fair, routine,
     'A racing or irregular heartbeat is worth mentioning at your next appointment.',
     palpitations_only) :-
    symptom(palpitations, true).

rule(fair, routine,
     'Some symptoms today. Keep monitoring and log again tomorrow.',
     mild_symptoms) :-
    once(symptom(_, true)).

rule(fair, routine,
     'You missed a dose today. Take it as soon as you can unless your doctor said otherwise.',
     missed_medication) :-
    medication(taken, false).

rule(fair, routine,
     'Your blood pressure is above the usual target. Keep monitoring it.',
     bp_slightly_high) :-
    vital(systolic_bp, S), S >= 140, S < 160.

rule(good, routine,
     'No symptoms reported and medication taken. Keep it up.',
     all_clear) :-
    \+ symptom(_, true),
    medication(taken, true).


% ============================================================
% RESOLUTION
% ============================================================
%
% Collect every rule that fires, take the most severe outcome, return the
% full list. Two properties that must not change:
%
%   1. MOST SEVERE WINS. Never average, never first-match. A patient with
%      chest pain AND mild fatigue must get the chest pain answer.
%   2. ALL FIRED RULES ARE RETURNED, deduplicated but in severity order, so
%      the patient sees everything that contributed. That is the whole reason
%      this is Prolog and not a model.

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
    sort(0, @>=, Matches, Sorted),
    Sorted = [_-rule(Status, Urgency, Recommendation, _) | _],
    findall(N, member(_-rule(_, _, _, N), Sorted), Raw),
    % list_to_set removes duplicates while keeping severity order. sort/2
    % would dedupe but reorder alphabetically, which would scramble the
    % explanation the patient reads.
    list_to_set(Raw, FiredRules).

% Unreachable in practice — all_clear or mild_symptoms covers every input —
% so arriving here means the rulebase has a gap worth investigating.
triage(good, routine,
       'No symptoms reported. Keep monitoring and log again tomorrow.',
       []).