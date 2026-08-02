# Database Schema

Placeholder for the ER diagram / schema reference. Update as `backend/database/migrations` grows.

## Core entities (draft)
- **User** (base identity: patient / doctor / admin)
- **Patient** — profile, linked medical history
- **MedicalRecord** — onboarding clinical data
- **FamilyHistory**
- **DailyCheckIn** — symptom MCQ answers, timestamped
- **ConditionReport** — output of Prolog engine per check-in
- **Doctor** — profile, identification code, availability
- **Appointment** — patient–doctor booking
- **ConsentRecord** — tracks patient approval for doctor record access
- **AuditLog** — who accessed which record, when
