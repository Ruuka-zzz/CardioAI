# Scripts

One-off and operational scripts that don't belong inside a specific service.

## Planned scripts
- `seed_db.py` — seed the database with sample patients/doctors for local development
- `generate_doctor_codes.py` — bulk-generate doctor identification codes for admin distribution
- `run_rag_ingestion.py` — trigger the RAG knowledge base ingestion pipeline (chunk + embed source docs)
- `train_ml_model.sh` — convenience wrapper to run ml-service training end-to-end
- `setup_dev_env.sh` — install dependencies across all services for local development

Each script should be runnable standalone with a `--help` flag documenting its usage.
