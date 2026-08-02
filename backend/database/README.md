# Database

Schema definitions and migrations for CardioAI's core data:
- Users (patients, doctors, admins)
- Medical records & family history
- Daily check-ins
- Appointments
- Consent records (patient approval for doctor record access)
- Audit logs (who accessed what record, when)

`migrations/` holds versioned schema changes — use whatever migration tool fits your stack (e.g. Alembic for Python/SQLAlchemy, Prisma Migrate, Sequelize migrations, Flyway).

## Guidelines
- Never edit an already-applied migration — create a new one
- Keep migrations small and reversible where possible
- Medical record and consent tables should support audit logging from the start
