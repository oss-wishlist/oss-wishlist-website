# AI Consent Framework for OSS

Evaluate the creation and implementation of an AI Consent Framework developed collaboratively between a service provider, maintainers, and the broader community. The framework defines how consent is established, communicated, enforced, and revisited when AI systems affect contributors, users, or community assets.


## Resources
* [Approaches to User Data & Consent-by-Design in open AI systems]( https://huggingface.co/blog/giadap/consent-by-design
 (consent design practices) ) — Hugging Face blog
* [Dynamic Consent (model from biomedical data governance)](https://en.wikipedia.org/wiki/Dynamic_consent)
 (ongoing interaction for consent) 

# Process Milestones

Note: that some milestones may not currently apply to a project (for example, there are no existing contributors to sponsor), but documentation for future consideration is encouraged.

* Kick off meeting: Maintainer meets with OSS Wishlist admin and pracitioner (whether sponsor employee or verified pracitioner) to align on goals and timeline.
* Community research (interviews and/or focus groups) to understand the challenges and painpoints related to AI being added to product/service
* Report and recommendations shared with maintainer and community
* Iterations based on feedback
* Implementation support (support of maintainer and community as needed)
* Wrap up meeting: Maintainer meets with OSS Wishlist maintainer and pracitioner
* Survey (maintainer and pracitioner)


## AI Consent Framework – Peer Review Rubric

**Audience:** Peer reviewers

**Scope:**  
Consent related to AI use in tooling, workflows, data usage, automated decisions, and contributor interactions.  
This rubric evaluates **process, alignment, and implementation** — not legal compliance or AI model quality.

**Scoring (per criterion):**  
0 = Absent / Not Evident  
1 = Ad-hoc / Unclear  
2 = Defined but limited  
3 = Strong and community-aligned  
4 = Exemplary and repeatable

---

## A. Definition & Scope of AI Consent (0–12 pts)

| Criterion | Indicators of Excellence | Score |
|---------|--------------------------|-------|
| **A1. Purpose & Intent** | Clearly states why an AI consent framework exists and what risks or concerns it addresses. | 0–4 |
| **A2. Scope of AI Use** | Defines which AI uses require consent (e.g., contribution assistance, moderation, data analysis, automation). | 0–4 |
| **A3. Community Involvement in Scoping** | Scope defined with maintainer and community input; trade-offs documented. | 0–4 |

---

## B. Consent Mechanisms & Processes (0–12 pts)

| Criterion | Indicators of Excellence | Score |
|---------|--------------------------|-------|
| **B1. How Consent Is Given** | Clear mechanisms for opt-in, opt-out, or conditional consent at appropriate decision points. | 0–4 |
| **B2. Informed & Understandable Consent** | Consent language is clear, accessible, and explains consequences and limitations. | 0–4 |
| **B3. Change & Withdrawal** | Processes exist to revise or withdraw consent over time without penalty. | 0–4 |

---

## C. Governance, Roles & Accountability (0–12 pts)

| Criterion | Indicators of Excellence | Score |
|---------|--------------------------|-------|
| **C1. Defined Ownership** | Clear roles for maintaining the consent framework and handling exceptions or disputes. | 0–4 |
| **C2. Decision-Making & Escalation** | Transparent paths for resolving consent-related conflicts or uncertainty. | 0–4 |
| **C3. Alignment with Community Governance** | Framework aligns with existing governance, values, and Codes of Conduct. | 0–4 |

---

## D. Implementation & Tooling (0–12 pts)

| Criterion | Indicators of Excellence | Score |
|---------|--------------------------|-------|
| **D1. Integration into Workflows** | Consent requirements integrated into real contributor or user workflows. | 0–4 |
| **D2. Tooling & Automation** | Tools or bots support consent enforcement (e.g., labeling AI-assisted contributions). | 0–4 |
| **D3. Practical Documentation** | Clear guidance exists on when consent applies and how it is operationalized. | 0–4 |

---

## E. Transparency & Communication (0–12 pts)

| Criterion | Indicators of Excellence | Score |
|---------|--------------------------|-------|
| **E1. Disclosure of AI Use** | Project publicly documents where and how AI is used. | 0–4 |
| **E2. Data & Model Transparency** | High-level information about data sources, models, or services involved is available where appropriate. | 0–4 |
| **E3. Feedback & Reporting Channels** | Community can raise concerns or questions about AI use or consent breaches. | 0–4 |

---

## F. Monitoring, Review & Renewal (0–8 pts)

| Criterion | Indicators of Excellence | Score |
|---------|--------------------------|-------|
| **F1. Signals & Metrics** | Tracks consent-related signals (opt-outs, friction points, disputes). | 0–4 |
| **F2. Iteration & Renewal** | Framework includes regular review and update cycles as AI use evolves. | 0–4 |

---

## Total Score: **/ 68 pts**

| Rating | Descriptor |
|--------|------------|
| 60–68 | Exemplary — Consent is well-defined, implemented, and community-owned |
| 48–59 | Strong — Mostly complete with minor gaps |
| 34–47 | Adequate — Functional but uneven |
| 20–33 | Weak — Significant gaps or unclear enforcement |
| 0–19 | Not Viable — Consent not meaningfully addressed |

---

## Reviewer Notes

- Areas of strong alignment:
- Areas of concern or ambiguity:
- Recommended next steps:
