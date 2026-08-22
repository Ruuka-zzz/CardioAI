% Shape of the facts engine.py asserts before every triage/4 query.
%
% This file is documentation, not loaded at runtime. It exists so the fact
% contract is written down somewhere a Prolog developer will look, rather
% than only living inside a Python string.
%
% Load it manually to test rules.pl by hand:
%
%   swipl
%   ?- [rules].
%   ?- [facts_template].
%   ?- triage(Status, Urgency, Rec, Rules).


% ---- symptom/2 : one per tracked symptom, severity 0..3 ----
%   0 = none, 1 = mild, 2 = moderate, 3 = severe
%
% All five are always asserted, including zeros. Rules use \+ and findall
% over symptom/2, so a missing fact would change the meaning of a query
% rather than simply omitting one symptom.

symptom(chest_pain,     2).
symptom(breathlessness, 1).
symptom(fatigue,        1).
symptom(swelling,       0).
symptom(dizziness,      0).


% ---- medication_taken/1 : true | false ----
% Whether the patient took today's dose.

medication_taken(true).


% ---- baseline/1 : low | medium | high ----
% From ml-service at onboarding, stored on the patient and passed in on every
% check-in. The Prolog engine never computes this itself — it has no access to
% the clinical values the model needs.

baseline(medium).


% Expected result for the facts above:
%
%   Status = fair,
%   Urgency = elevated,
%   Rec = 'Moderate chest pain should be reviewed. Book an appointment this week.',
%   Rules = [moderate_chest_pain, mild_symptoms]