# Indian Standards Procurement AI — System Architecture

## 1. Product Goal

Build an AI-powered procurement assistant that analyzes product descriptions,
technical specifications, and tender documents and identifies applicable Indian
Standards.

The system should provide:

- Recommended Indian Standards
- Reason for applicability
- Supporting evidence
- Normative and allied references
- Test methods
- Safety-related standards
- Terminology standards
- Latest known version/status
- Amendments
- Applicable certification/regulatory requirements
- Missing or incomplete specification requirements
- Source traceability

The system must prioritize factual traceability over fluent but unsupported
LLM output.

---

## 2. High-Level Architecture

User
  |
  v
Frontend
  |
  v
FastAPI Backend
  |
  +----------------------+
  |                      |
  v                      v
Document Processing     Recommendation Engine
  |                      |
  v                      v
Requirement Extraction  Hybrid Retrieval
                         |
                         +--> Semantic Search
                         +--> Keyword / Metadata Search
                         +--> Standards Relationships
                         |
                         v
                  Evidence Validation
                         |
                         v
                    LLM Explanation
                         |
                         v
                  Procurement Report
                         |
                         v
                    Frontend UI

Persistent data and metadata:
Supabase PostgreSQL

Potential vector search:
PostgreSQL + pgvector

Object/document storage:
Supabase Storage where appropriate

---

## 3. Repository Components

### apps/frontend

Responsible for:

- Tender/specification upload
- Text input
- Results dashboard
- Standard recommendation cards
- Evidence display
- Related-standard visualization
- Version/amendment information
- Missing-requirement warnings
- Source/citation display

### services/backend

Responsible for:

- API endpoints
- Authentication integration
- Request validation
- Orchestration
- Database access
- Job management
- Communication between frontend and AI services

### services/ai-engine

Responsible for:

- Requirement understanding
- Query generation
- Hybrid retrieval
- Ranking
- Re-ranking
- Evidence selection
- Standards relationship reasoning
- LLM-based explanation
- Confidence/uncertainty handling

### services/ingestion

Responsible for:

- PDF ingestion
- Text extraction
- Metadata extraction
- Chunking
- Document normalization
- Embedding generation
- Standards relationship ingestion

### supabase

Responsible for:

- PostgreSQL schema
- Database migrations
- Supabase functions where actually required
- Database-side vector search where appropriate

---

## 4. Core Data Concepts

The final schema should be designed around concepts such as:

- Standards
- Standard versions
- Amendments
- Source documents
- Standard relationships
- Normative references
- Test methods
- Certification/regulatory requirements
- Tender documents
- Extracted requirements
- Recommendations
- Evidence
- Embeddings

The exact schema must be approved before implementation.

---

## 5. Recommendation Pipeline

### Step 1 — Input

Accept:

- Plain product description
- Technical specification
- Tender document
- PDF document

### Step 2 — Document Processing

Extract:

- Product/entity
- Product category
- Technical parameters
- Intended use
- Environment
- Safety requirements
- Materials
- Performance requirements
- Referenced standards
- Regulatory hints

### Step 3 — Candidate Retrieval

Use a hybrid strategy:

1. Semantic/vector retrieval
2. Keyword/BM25-style retrieval where useful
3. Metadata filtering
4. Standards relationship traversal

Do not rely only on keyword matching.

### Step 4 — Candidate Ranking

Rank candidates using multiple signals such as:

- Semantic similarity
- Product/category compatibility
- Technical requirement coverage
- Scope compatibility
- Standard relationship evidence
- Version/status metadata

The ranking logic must remain inspectable.

### Step 5 — Evidence Retrieval

For every recommended standard, retrieve supporting evidence.

A recommendation without supporting evidence should not be presented as
high-confidence.

### Step 6 — Relationship Expansion

Identify:

- Normative references
- Allied standards
- Test methods
- Safety standards
- Installation standards
- Terminology standards
- Related product standards

### Step 7 — Version and Status Analysis

Detect:

- Referenced version
- Latest known version
- Amendments
- Superseded/withdrawn status where authoritative data is available

### Step 8 — Regulatory Analysis

Identify potentially applicable:

- BIS certification requirements
- QCO-related requirements
- Other relevant regulatory/certification information

Do not claim a requirement is mandatory unless supported by an authoritative
source.

### Step 9 — Gap Analysis

Compare the tender requirements against the relevant standard requirements
and identify potentially missing technical specifications.

### Step 10 — Final Report

Return structured results containing:

- Standard identifier
- Title
- Applicability explanation
- Evidence
- Related standards
- Version/status
- Regulatory information
- Specification gaps
- Sources
- Confidence/uncertainty

---

## 6. Grounding and Safety Rules

The system must never fabricate:

- IS numbers
- Standard titles
- Standard versions
- Amendments
- Regulatory requirements
- Certification requirements
- Normative references
- Source citations

When authoritative evidence is unavailable, explicitly indicate that the
system could not verify the information.

LLM-generated explanations must be distinguishable from retrieved source facts.

---

## 7. Initial Technology Direction

Preferred starting stack:

Frontend:
- React
- Vite

Backend:
- Python
- FastAPI

Database:
- Supabase PostgreSQL

Vector search:
- pgvector / PostgreSQL where appropriate

Document processing:
- Python-based extraction pipeline

AI:
- LLM provider selected during implementation
- Embedding model selected after retrieval evaluation

The team should avoid adding infrastructure that does not solve a demonstrated
problem.

---

## 8. Deployment Direction

Development:

Local machine
  |
  +--> Frontend
  +--> FastAPI
  +--> AI services
  +--> Supabase cloud

Production/demo:

Frontend
  |
  v
Backend/API
  |
  v
Supabase + AI services

Deployment details should be finalized after the first working end-to-end
prototype.

---

## 9. Evaluation

The system must eventually be evaluated using a fixed test set.

Important metrics:

- Recommendation precision
- Recommendation recall
- Top-k retrieval accuracy
- Evidence correctness
- Version/status correctness
- False recommendation rate
- Unsupported-claim rate
- Latency

A small, high-quality evaluation dataset is more useful initially than a huge
unvalidated dataset.

---

## 10. Implementation Principle

Build in this order:

1. End-to-end thin prototype
2. Document ingestion
3. Requirement extraction
4. Standards retrieval
5. Evidence grounding
6. Standards relationship expansion
7. Version/status analysis
8. Regulatory analysis
9. Gap analysis
10. Production-quality UX

Do not build sophisticated agents before proving that the retrieval and
evidence pipeline works.

---

## 11. Current State

Repository:
- GitHub monorepo
- develop = active integration
- main = production/demo branch

Supabase:
- Cloud project created
- CLI configured
- Repository integration configured
- Initial migration created
- Final schema not yet designed

AI coding instructions:
- CLAUDE.md
- AGENTS.md
- CONTRIBUTING.md

Next architectural task:
Design and approve the database schema and retrieval data model before
substantial implementation begins.
