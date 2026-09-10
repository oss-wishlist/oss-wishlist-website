# Winding Down an Open Source Project Playbook

## Source & Attribution

This playbook is based on the Closure Guide by Greg Wilson:  
https://gvwilson.github.io/closure/

The Closure Guide provides the primary guidance for responsibly winding down open source projects.  
This playbook adapts that guidance into a structured service format, including process milestones and a peer review rubric, to support practical implementation.

---

## Process Milestones

Note: Not all projects will follow a linear path — some may transfer ownership instead of closing. Documentation is encouraged regardless of path.

1. Kickoff: Maintainer and practitioner align on closure intent (sunset, archive, transfer)  
2. Project Status Assessment & Decision Rationale  
3. Stakeholder & Dependency Impact Review  
4. Communication Plan & Public Announcement  
5. Transition or Archival Preparation  
6. Repository & Infrastructure Wind-Down  
7. Final Documentation & Knowledge Preservation  
8. Closure Execution (archive, transfer, or sunset)  
9. Wrap up meeting and retrospective  
10. Survey (maintainer and practitioner)

---

## Resources

- [Closing Time  - a one day workshop](https://gvwilson.github.io/closure/)

---

# Winding Down an Open Source Project – Peer Review Rubric

**Purpose:** Evaluate how responsibly and effectively a project is wound down, minimizing ecosystem disruption while preserving value and enabling continuity where possible.

**Scoring Scale per Criterion:**  
0 = Not present  
1 = Minimal / unclear  
2 = Adequate but incomplete  
3 = Clear and well-executed  
4 = Exemplary, transparent, ecosystem-aware  

---

## A. Decision Clarity & Intent (0–12 pts)

| Criterion | Indicators of Excellence | Score |
|---------|--------------------------|------|
| **A1. Closure Rationale Documented** | Clear explanation of why the project is winding down. | 0–4 |
| **A2. Closure Path Defined** | Explicit decision: archive, transfer, merge, or sunset. | 0–4 |
| **A3. Timeline Communicated** | Key dates and expectations clearly stated. | 0–4 |

---

## B. Stakeholder & Dependency Responsibility (0–12 pts)

| Criterion | Indicators of Excellence | Score |
|---------|--------------------------|------|
| **B1. Downstream Impact Identified** | Known users, dependents, and integrations considered. | 0–4 |
| **B2. Migration Guidance Provided** | Alternatives or upgrade paths documented. | 0–4 |
| **B3. Contributor Communication** | Contributors informed and acknowledged. | 0–4 |

---

## C. Communication & Signaling (0–12 pts)

| Criterion | Indicators of Excellence | Score |
|---------|--------------------------|------|
| **C1. Public Status Clearly Marked** | README and repo clearly indicate archived/deprecated status. | 0–4 |
| **C2. Issue & PR Handling Policy** | Expectations for responses or closure defined. | 0–4 |
| **C3. Consistent Messaging Across Channels** | GitHub, docs, website, and community channels aligned. | 0–4 |

---

## D. Transition & Handoff (0–12 pts)

| Criterion | Indicators of Excellence | Score |
|---------|--------------------------|------|
| **D1. Maintainer Succession Explored** | Attempt made to identify new maintainers. | 0–4 |
| **D2. Transfer Process Documented** | Clear path for others to fork or adopt the project. | 0–4 |
| **D3. Permissions & Access Managed** | Ownership and access rights properly transitioned or locked. | 0–4 |

---

## E. Repository & Infrastructure Wind-Down (0–12 pts)

| Criterion | Indicators of Excellence | Score |
|---------|--------------------------|------|
| **E1. Repository Archived or Stabilized** | Repo archived or set to read-only where appropriate. | 0–4 |
| **E2. CI/CD & Services Addressed** | External services disabled, documented, or handed off. | 0–4 |
| **E3. Security Risks Mitigated** | Known vulnerabilities disclosed or documented. | 0–4 |

---

## F. Knowledge Preservation (0–12 pts)

| Criterion | Indicators of Excellence | Score |
|---------|--------------------------|------|
| **F1. Documentation Completeness** | Key docs preserved (setup, architecture, usage). | 0–4 |
| **F2. Historical Context Retained** | Decisions, roadmap, and known limitations documented. | 0–4 |
| **F3. Artifact Preservation** | Releases, packages, and versions remain accessible. | 0–4 |

---

## G. Closure Integrity & Ecosystem Impact (0–12 pts)

| Criterion | Indicators of Excellence | Score |
|---------|--------------------------|------|
| **G1. No “Silent Abandonment”** | Project is clearly closed, not left ambiguous. | 0–4 |
| **G2. Ecosystem Disruption Minimized** | Users are not left without guidance or warning. | 0–4 |
| **G3. Respectful Closure** | Community contributions acknowledged and preserved. | 0–4 |

---

## ✅ Total Score: **/ 84 pts**

| Rating | Descriptor |
|-------:|------------|
| 76–84 | Excellent — Responsible, ecosystem-aware closure |
| 64–75 | Strong — Well-managed wind-down |
| 48–63 | Adequate — Some gaps in communication or transition |
| 24–47 | Weak — Risk of disruption or confusion |
| 0–23 | Harmful — Abandonment without responsibility |

---

## Reviewer Notes

- Closure risks:
- Impact on downstream users:
- Transition readiness:
- Documentation gaps:
- Most important next step:
- Closure quality: Low / Medium / High
