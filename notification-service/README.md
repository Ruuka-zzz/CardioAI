# Notification Service

Dispatches medication and appointment alerts across channels, chosen by urgency:

| Alert type | Channel |
|---|---|
| Medication reminder | Web Push (primary) + SMS fallback |
| `seek_immediate_care` (from Prolog engine) | SMS |
| Appointment reminder | Web Push, Email as backup log |
| Routine daily check-in reminder | Web Push |

## Why not just email
Email isn't checked in real time, so it's unreliable for anything time-sensitive. Email is kept only as a backup/record of what was sent.

## Planned files
- `web_push.py` — Web Push API integration (service worker + push subscription handling)
- `sms.py` — SMS integration (e.g. Twilio)
- `email.py` — backup/log email sender
- `dispatcher.py` — decides which channel(s) to use based on urgency level from prolog-engine output
