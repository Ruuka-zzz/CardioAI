# CardioAI — Project Overview

An AI-powered personal assistant for heart disease patients, connecting them with doctors and giving them daily health guidance.

---

## 1. The Problem We're Solving

Heart disease patients often struggle with three things:
- **Tracking their condition day to day** — most only see a doctor occasionally, so symptom changes go unnoticed between visits
- **Remembering medication and appointments** — missed doses and missed appointments worsen outcomes
- **Getting reliable, personalized guidance** — generic health apps don't combine ongoing monitoring with real doctor access

CardioAI addresses this by combining **daily self-monitoring**, **AI-driven risk assessment**, and **direct doctor connection** in one platform — starting with a single heart condition, expandable later.

---

## 2. Who Uses the System (Four User Roles)

### A. Patient
- First-time signup: account creation + intake form (medical history, family history — via forms and MCQs)
- Daily check-in (morning/night): symptom-based MCQ
- Receives: condition status (Good / Fair / Bad), a risk percentage, and a recommendation
- Gets medication and appointment reminders
- Can browse doctors, check availability, and request appointments
- Controls whether their medical record is shared with a doctor (explicit consent required)

### B. Doctor
- Not open signup — only doctors CardioAI collaborates with
- Given a unique identification code to activate their profile
- Can view their public profile (specialty, bio, availability)
- Can only view a patient's medical record **after** the patient has approved the connection

### C. Admin
- Manages doctor accounts (issuing codes, approving profiles)
- Manages platform content and oversight
- Standard admin dashboard — no AI/ML involved here

### D. Visitor (not logged in)
- Can explore the website
- Can talk to a chatbot for:
  - General FAQs about the platform
  - General heart-health education (not personal diagnosis)

---

## 3. Core Features & Why We Built Them This Way

### 3.1 Patient Onboarding (Forms + MCQ)
**What:** Collects medical history, family history, and baseline clinical data.
**Why forms/MCQ instead of free text:** Structured input is easier to validate, store consistently, and feed directly into the ML model — free text would require extra NLP processing we don't need at this stage.

### 3.2 Daily Check-In (Symptom Tracking)
**What:** Twice-daily MCQ covering symptoms (chest pain, breathlessness, fatigue, swelling, dizziness) and medication adherence.
**Why separate from onboarding data:** Clinical values (cholesterol, ECG, blood sugar) can't be self-reported daily — they require lab equipment. Daily symptoms *can* be self-reported. So we split the AI into two layers (see Section 4) instead of forcing daily answers into a clinical dataset they don't match.

### 3.3 Condition Report (Good / Fair / Bad + % + Recommendation)
**What:** After each check-in, the patient sees their current condition, a percentage score, and a plain-language recommendation.
**Important framing:** This is **not a medical diagnosis** — it's a self-monitoring aid. We make this explicit in the UI to avoid misleading patients and to stay within reasonable liability boundaries for a non-hospital platform.

### 3.4 Medication & Appointment Reminders
**What:** Time-based alerts for medication and upcoming appointments.
**Why not just email:** Email isn't checked in real time, so it's unreliable for something urgent like "take your medication now." We use:
- **Web Push Notifications** (browser-based, works even when the site tab is closed) — primary channel
- **SMS** — for urgent/critical alerts, since it doesn't depend on the browser or internet permissions
- **Email** — kept only as a backup log/record, not the main alert

### 3.5 Doctor Discovery & Appointment Booking
**What:** Patients browse doctor profiles and request appointments; the system matches requested times against doctor availability.
**Why this is NOT machine learning:** Matching a requested time slot against a doctor's free slots is a scheduling/constraint problem, not a prediction problem. Using ML here would be unnecessary complexity — a rule-based calendar-matching algorithm is simpler, faster, and more trustworthy for something as exact as "is this doctor free at 3 PM Tuesday."

### 3.6 Consent-Gated Medical Record Sharing
**What:** A doctor cannot see any patient's medical record until the patient explicitly approves it after connecting.
**Why:** Protects patient privacy and builds trust — the patient is always in control of who sees their sensitive health data.

### 3.7 Visitor Chatbot
**What:** A chatbot for non-logged-in visitors, answering:
- Platform FAQs ("how does this work," "how do I create an account")
- General heart-health education ("what is atrial fibrillation," "what raises heart disease risk")
**What it does NOT do:** Diagnose symptoms or answer "do I have a heart condition" — these are redirected to sign-up/doctor consultation, or to emergency services if the query sounds urgent.

---

## 4. The AI Layer — Two Different Kinds of "AI," Used for Different Jobs

This is the core technical idea of the project: **we don't use one AI model to do everything.** We split intelligence into two tools, each suited to a different kind of decision.

### 4.1 Machine Learning Model — Baseline Risk Assessment
- **Dataset:** UCI Heart Disease Dataset (Cleveland, etc.) — a well-known public dataset with clinical features: age, cholesterol, blood pressure, resting ECG, max heart rate, fasting blood sugar, thalassemia results, etc.
- **When it runs:** Once at onboarding (and again if new clinical/lab data becomes available) — **not** on every daily check-in, because daily symptom answers don't contain the clinical values this model needs.
- **What it outputs:** A baseline cardiovascular risk category (e.g., low / medium / high).
- **Why ML here:** Risk prediction from clinical data is a pattern-recognition problem with a lot of precedent (UCI dataset is a standard benchmark for exactly this) — well suited to a trained classification model.

### 4.2 Prolog Expert System — Daily Symptom Triage
- **What it is:** A rule-based logic system encoding clinical triage rules (if X symptom + Y condition, then Z recommendation).
- **When it runs:** Every daily check-in, combining today's symptoms + medication adherence + the patient's baseline risk (from the ML model).
- **What it outputs:** Condition status (Good/Fair/Bad), urgency level, and a recommendation.
- **Why Prolog instead of more ML here:**
  - Symptom triage rules (e.g., "severe chest pain + high baseline risk = seek care immediately") are safety-critical and need to be **explainable and predictable** — not a black-box probability.
  - Rule-based logic lets us clearly justify *why* the system gave a certain recommendation, which matters a lot for a health product.
  - It also lets us cleanly route notification urgency: emergency-level Prolog outputs trigger SMS, routine ones trigger push notifications.

### 4.3 RAG (Retrieval-Augmented Generation) — Visitor Chatbot
- **What it is:** Instead of letting a language model answer heart-health questions purely "from memory" (which risks outdated or inaccurate medical claims), we ground it in a fixed knowledge base.
- **Sources:** CDC Heart Disease pages, American Heart Association, WHO cardiovascular fact sheets, MedlinePlus (NIH) — all reputable, plain-language public health sources.
- **How it works:** User question → relevant chunks retrieved from our knowledge base → LLM answers *using only those retrieved chunks* → sourced, grounded answer.
- **Why RAG instead of a plain LLM chatbot:** Makes answers auditable (we can point to the exact source) and reduces the risk of the chatbot inventing or misstating medical facts.
- **Safety layer:** A simple rule-based intent check runs before RAG — if the query sounds like an emergency or a personal diagnosis request, it's redirected instead of answered by the RAG pipeline.

---

## 5. System Architecture (High Level)

```
                         ┌─────────────────────┐
                         │      Frontend        │
                         │ (Patient / Doctor /   │
                         │  Admin / Visitor UI)  │
                         └──────────┬───────────┘
                                    │
                         ┌──────────▼───────────┐
                         │     Backend API       │
                         │  (Auth, Roles, Core    │
                         │   Business Logic)      │
                         └──────────┬───────────┘
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
   ┌──────────▼─────────┐ ┌─────────▼─────────┐ ┌─────────▼─────────┐
   │   ML Service         │ │  Prolog Engine     │ │  RAG Chatbot       │
   │ (UCI-trained model,  │ │ (daily triage,      │ │ (visitor FAQ +     │
   │  onboarding risk)    │ │  urgency routing)   │ │  heart education)  │
   └───────────────────────┘ └─────────────────────┘ └─────────────────────┘
              │                     │
   ┌──────────▼─────────────────────▼───────────┐
   │     Notification Service                      │
   │  (Web Push / SMS / Email — chosen by urgency)  │
   └─────────────────────────────────────────────┘
              │
   ┌──────────▼───────────┐
   │   Database             │
   │ (Patients, Doctors,     │
   │  Records, Appointments, │
   │  encrypted at rest)     │
   └─────────────────────────┘
```

**Key architecture decision:** The ML service, Prolog engine, and RAG chatbot are kept as **separate, decoupled components** rather than one monolithic "AI module." This means each can be updated, retrained, or replaced independently without breaking the rest of the system.

---

## 6. Security & Privacy Requirements

Since this platform handles sensitive health data:
- **Encryption at rest** for medical records and personal data
- **Role-based access control** — patients, doctors, and admins each see only what they're authorized to see
- **Audit logging** — track who accessed which medical record and when
- **Explicit consent flow** — doctors only gain record access after patient approval
- Designed with future compliance (e.g., HIPAA-style standards) in mind, even if not fully implemented at MVP stage

---

## 7. Functional Requirements Summary

| # | Requirement | Feature |
|---|---|---|
| 1 | Users can register and log in with role-based access | Auth system |
| 2 | Patients complete a structured medical/family history intake | Onboarding forms + MCQ |
| 3 | Patients complete daily symptom check-ins | Daily MCQ form |
| 4 | System calculates baseline cardiovascular risk | ML model (UCI dataset) |
| 5 | System evaluates daily condition and urgency | Prolog rule engine |
| 6 | Patients receive medication/appointment alerts | Web Push + SMS + Email |
| 7 | Patients can browse and book doctors | Doctor directory + scheduling logic |
| 8 | Patients control medical record sharing | Consent-gated access |
| 9 | Doctors access only approved profiles via provided code | Doctor auth flow |
| 10 | Admins manage doctors and platform oversight | Admin dashboard |
| 11 | Visitors get general heart-health info and FAQs | RAG-based chatbot |

---

## 8. Non-Functional Requirements

- **Explainability:** Especially for daily condition results — patients should understand *why* they got a certain status (this is part of why Prolog was chosen over a black-box model for daily triage).
- **Reliability of alerts:** Time-sensitive notifications must not depend solely on channels users don't check often (i.e., not email-only).
- **Data privacy by design:** Consent-first sharing, encrypted storage, access logging.
- **Scalability of scope:** Architecture should allow adding more heart conditions (or other diseases entirely) later without redesigning the core system.
- **Clear liability boundaries:** All AI-generated health content is labeled clearly as non-diagnostic, with routing to real doctors/emergency services when appropriate.

---

## 9. One-Line Summary for Each Core Technology

| Technology | Used For | Why |
|---|---|---|
| **ML (UCI dataset)** | Baseline risk score at onboarding | Best suited for pattern recognition on clinical numeric data |
| **Prolog** | Daily symptom triage & urgency routing | Explainable, safety-critical, rule-based logic |
| **RAG** | Visitor chatbot for heart-health education | Grounds answers in trusted medical sources, avoids hallucination |
| **Web Push / SMS** | Medication & appointment alerts | Real-time delivery, unlike email |
| **Rule-based scheduling** | Doctor–patient appointment matching | Simple constraint matching, no ML needed |

---

*This document is intended as a presentation reference for explaining CardioAI's design decisions and architecture to collaborators.*
