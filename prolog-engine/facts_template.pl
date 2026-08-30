% Shape of the facts engine.py asserts before every triage/4 query.
%
% Documentation, not loaded at runtime. It exists so the fact contract is
% written down where a Prolog developer will look, rather than only living
% inside a Python string.
%
% Load it by hand to test rules.pl:
%
%   swipl
%   ?- [rules].
%   ?- [facts_template].
%   ?- triage(Status, Urgency, Rec, Rules).


% ---- symptom/2 : one per symptom, true or false ----
% All seven are always asserted, including the false ones. Rules use \+ and
% findall over symptom/2, so a missing fact would change the meaning of a
% query rather than simply omitting one symptom.

symptom(chest_pain,     false).
symptom(breathlessness, true).
symptom(dizziness,      false).
symptom(fatigue,        true).
symptom(palpitations,   false).
symptom(swelling,       true).


% ---- breathlessness_trigger/1 : none | stairs | walking | at_rest ----
% WHEN breathlessness happens, which is what grades it. Maps onto the NYHA
% functional classification:
%
%   stairs  -> NYHA II    walking -> NYHA III    at_rest -> NYHA IV
%
% Always asserted. `none` when the patient reported no breathlessness.

breathlessness_trigger(stairs).


% ---- worse_than_usual/1 : true | false ----
% The most informative fact on the form. A stable patient with ongoing
% symptoms is not the same as one whose symptoms changed today, and only the
% patient can tell us which this is.

worse_than_usual(false).


% ---- vital/2 : OPTIONAL ----
% Asserted only when the patient supplied a reading. Not every patient owns a
% blood-pressure monitor, so rules that read vitals must fail cleanly when the
% fact is absent — never assume a number.
%
%   vital(systolic_bp,  N)   mm Hg
%   vital(diastolic_bp, N)   mm Hg
%   vital(heart_rate,   N)   beats per minute
%   vital(temperature_c, N)  degrees Celsius

vital(systolic_bp, 148).
vital(diastolic_bp, 88).
vital(heart_rate, 76).


% ---- medication/2 ----
%   medication(taken,  true|false)   today's dose
%   medication(missed, true|false)   explicitly reported a missed dose
%   medication(extra,  true|false)   took more than prescribed

medication(taken, true).
medication(missed, false).
medication(extra, false).


% ---- baseline/1 : low | medium | high ----
% From ml-service at onboarding, stored on the patient, passed in on every
% check-in. The Prolog engine never computes this — it has no access to the
% measurements the model needs.

baseline(medium).


% ---- history/1 : asserted ONCE PER DIAGNOSED CONDITION ----
% Only conditions the patient HAS are asserted; absence means no diagnosis.
% Possible values:
%
%   hypertension, diabetes, ischemic_heart_disease, heart_failure,
%   heart_attack, stroke, valve_disease
%
% These change what a symptom means. Ankle swelling in someone with diagnosed
% heart failure is a different event from ankle swelling in someone without.

history(hypertension).
history(heart_failure).


% Expected result for the facts above:
%
%   Status = bad,
%   Urgency = elevated,
%   Rec = 'Swelling together with breathlessness can mean fluid is building
%          up. Contact your doctor today.',
%   Rules = [congestion_pattern, swelling_with_heart_failure,
%            multiple_symptoms, bp_slightly_high, breathless_on_stairs,
%            swelling_only, mild_symptoms]