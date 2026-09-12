# Cyber Resilience Act (CRA) Practitioner Playbook

A playbook for maintainers and practitioners, in addition to their own resources.

> **This is not legal advice.** Nothing here, including the rubric and any
> completed assessment, is a legal opinion on whether the Cyber Resilience Act
> applies to a project or whether it complies. Whether a project is a
> manufacturer, an open source steward, or out of scope is a legal
> determination about that project's particular circumstances, and it has real
> consequences. Consult qualified legal counsel before making any compliance
> claim or regulatory submission. The same caveat appears in the OpenChain
> checklist this playbook draws on.

**Important note on scope**

This service produces a readiness assessment and an evidence record. It is not a
conformity assessment, an EU Declaration of Conformity, or a basis for CE
marking. Those follow the routes set out in the Regulation and, where required,
involve a notified body. No practitioner and no rubric can substitute for them.

There is no accreditation scheme for CRA consultants, so "validated by a CRA
authority" is not something a practitioner can hold. What a maintainer should
look for instead is demonstrable experience with vulnerability handling, SBOM
tooling and coordinated disclosure, and a practitioner who is explicit about
where their work stops and legal advice begins.


## Process Milestones

* Kick off meeting: Maintainer meets with OSS Wishlist admin and practitioner (whether sponsor employee or verified practitioner) to align on goals and timeline.
* Milestones finalized
* Milestone completed
* Wrap up meeting: Maintainer meets with OSS Wishlist maintainer and practitioner
* Completed rubric and evidence record, handed to the maintainer. This records readiness, not compliance, and makes no conformity claim.
* Survey (maintainer and practitioner)

## Does the CRA apply to this project?

Answer this before anything else, because it decides whether the rest is an
obligation or an exercise. The roles are defined in CRA Art. 3.

- **Manufacturer** (Art. 3(13)) places a product with digital elements on the EU
  market under its own name or trademark. Most upstream open source projects are
  not manufacturers.
- **OSS Steward** (Art. 3(14), Recitals 18-19, Art. 24) provides support on a
  sustained basis for the development of FOSS and ensures its viability, without
  being a manufacturer. Foundations and some funded projects land here. Art.
  24(1) requires a lightweight, documented cybersecurity policy.
- **Neither.** An unfunded project with no commercial activity is generally out
  of scope, and may still use this rubric to help the people downstream who are
  in scope.

Where the classification is not obvious, the OpenChain checklist (5.1.5) sets
out the commercial-activity test from Commission guidance C(2026) 5252:
charging for the software; charging for support beyond cost recovery;
monetising through a platform; collecting personal data beyond security or
compatibility purposes; **or accepting donations that exceed operational
costs**. These are indicators, not a verdict, and a borderline case needs legal
review rather than a rubric.

The last of those matters to anyone reading this playbook because they are
thinking about funding. A project that starts taking significant sponsorship can
move across this line, and the answer it gave a year ago may no longer hold.

##  Resources 

### CRA Self-Assessment and Checklists
- [OpenChain CRA Compliance Requirements & Checklist v1.0](https://github.com/OpenChain-Project/CRA-Compliance/blob/main/1.0/CRA_Checklist_Requirement_v1.0.md) (CC-BY-4.0) - community-maintained readiness checklist mapped to Regulation (EU) 2024/2847 and aligned with ISO/IEC 18974, ISO/IEC 5230 and BSI TR-03183. Section 5 covers OSS stewardship and the steward/manufacturer boundary; Section 4.4 covers the Article 14 reporting cascade. Completing it is a readiness and evidence exercise, not a conformity assessment.
- [OpenChain CRA Compliance project page](https://cra-compliance.openchainproject.org)

### EU Cyber Resilience Act (CRA)
- [EU Cyber Resilience Act – Official European Commission Page](https://digital-strategy.ec.europa.eu/en/policies/cyber-resilience-act)
- [Cyber Resilience Act – Legislative Text (EUR-Lex)](https://eur-lex.europa.eu/)
- [CRA FAQs – European Commission](https://digital-strategy.ec.europa.eu/en/faqs/cyber-resilience-act)

### OpenSSF – Security Best Practices & Tooling
- [OpenSSF Best Practices Badge Program](https://bestpractices.coreinfrastructure.org/)
- [OpenSSF Scorecard](https://github.com/ossf/scorecard)
- [OpenSSF Secure Software Development Fundamentals](https://openssf.org/training/secure-software-development-fundamentals/)
- [OpenSSF SLSA Framework](https://slsa.dev/)

### Vulnerability Disclosure & Handling
- [GitHub – About SECURITY.md](https://docs.github.com/en/code-security/getting-started/adding-a-security-policy-to-your-repository)
- [OpenSSF Guide: Vulnerability Disclosure](https://openssf.org/docs/best-practices/vulnerability-disclosure/)
- [CVE Program](https://www.cve.org/)

### Supply Chain Transparency
- [SPDX – Software Bill of Materials (SBOM)](https://spdx.dev/)
- [CycloneDX SBOM Specification](https://cyclonedx.org/)
- [SLSA Provenance Overview](https://slsa.dev/spec/v1.0/provenance)

### Repository Security Hygiene
- [GitHub – Securing Your Repository](https://docs.github.com/en/code-security/getting-started/securing-your-repository)
- [GitHub – Dependency Review & Dependabot](https://docs.github.com/en/code-security/supply-chain-security)
- [GitHub – Enforcing Two-Factor Authentication](https://docs.github.com/en/organizations/keeping-your-organization-secure/enforcing-two-factor-authentication-for-your-organization)

### CRA Context for Open Source
- [Linux Foundation Europe – CRA & Open Source Briefings](https://www.linuxfoundation.org/resources)
- [OpenSSF Policy & Regulatory Engagement](https://openssf.org/about/policy/)


## EU Cyber Resilience Act (CRA) – Open Source Readiness Rubric

**Purpose:**  
Assess whether an open source project has reached a security and documentation state that enables downstream compliance with the EU Cyber Resilience Act (CRA).

**Important framing:**  
This rubric evaluates *enablement*, not legal responsibility.  
Passing this rubric supports downstream manufacturers’ CRA obligations.

**Audience:** Peer reviewers

**Scoring Model:**
Each criterion is scored independently.

- 0 = Not present
- 1 = Present but insufficient
- 2 = Present and sufficient (meets CRA enablement needs)

Criteria marked **[critical]** gate the result on their own: a 0 on any of them
is a Fail whatever else scores. They are the ones a downstream manufacturer
cannot work around, because no amount of effort on their side substitutes for a
disclosure channel or an identifiable dependency list upstream.

---

## A. Vulnerability Disclosure & Response

| Criterion | 0 – Not Present | 1 – Insufficient | 2 – Sufficient | Score |
|---------|----------------|------------------|----------------|------|
| **A1. Public Disclosure Process** *[critical]* | No disclosure guidance | Informal or unclear | Clear, documented process (e.g. SECURITY.md) | 0–2 |
| **A2. Private Reporting Channel** *[critical]* | No private channel | Exists but unreliable | Clear, monitored reporting path | 0–2 |
| **A3. Vulnerability Handling Practice** | No evidence of handling | Inconsistent response | Demonstrated acknowledgement and remediation | 0–2 |

---

## B. Maintainer Access & Identity Security

| Criterion | 0 – Not Present | 1 – Insufficient | 2 – Sufficient | Score |
|---------|----------------|------------------|----------------|------|
| **B1. Maintainer Account Protection** | No 2FA enforcement | Partial or voluntary | 2FA enforced for maintainers | 0–2 |
| **B2. Administrative Access Control** | Unrestricted admin access | Excessive admins | Limited, documented admin access | 0–2 |
| **B3. Access Revocation Capability** | No clear process | Informal/manual | Clear ability to revoke access promptly | 0–2 |

---

## C. Dependency & Build Transparency

| Criterion | 0 – Not Present | 1 – Insufficient | 2 – Sufficient | Score |
|---------|----------------|------------------|----------------|------|
| **C1. Dependency Declaration** *[critical]* | Dependencies unclear | Partial listing | Dependencies declared and discoverable | 0–2 |
| **C2. Build Input Visibility** | Build opaque | Partially documented | Build inputs documented at high level | 0–2 |
| **C3. Artifact Integrity** | Undocumented binaries | Mixed practices | No undocumented binaries in releases | 0–2 |
| **C4. Machine-Readable SBOM** | None published | Generated ad hoc, or not published with releases | SPDX or CycloneDX SBOM published with each release, covering at least top-level dependencies | 0–2 |

---

## D. Release Traceability

| Criterion | 0 – Not Present | 1 – Insufficient | 2 – Sufficient | Score |
|---------|----------------|------------------|----------------|------|
| **D1. Versioning / Tagging** | No versioning | Inconsistent tagging | Releases are versioned or tagged | 0–2 |
| **D2. Change Traceability** | No traceability | Partial traceability | Commits traceable to releases | 0–2 |
| **D3. Security Fix Identification** | Fixes indistinguishable | Inconsistent signaling | Security-relevant fixes identifiable | 0–2 |

---

## E. Secure Development Practices

| Criterion | 0 – Not Present | 1 – Insufficient | 2 – Sufficient | Score |
|---------|----------------|------------------|----------------|------|
| **E1. Branch Protections** | None | Partial | Reviews/checks enforced | 0–2 |
| **E2. Automated Security Signals** | None | Inconsistent | Dependency or vuln scanning enabled | 0–2 |
| **E3. Secret Management** | Secrets in repo | Risky practices | Secrets protected and managed | 0–2 |

---

## F. Downstream CRA Enablement

| Criterion | 0 – Not Present | 1 – Insufficient | 2 – Sufficient | Score |
|---------|----------------|------------------|----------------|------|
| **F1. Security Context Documentation** | No guidance | Minimal notes | Clear security assumptions & limits | 0–2 |
| **F2. Regulatory Awareness Statement** | None | Vague mention | Explicit support for downstream CRA compliance (no liability claim) | 0–2 |
| **F3. Support and End-of-Life Signal** | Nothing stated | Informal or inconsistent | Supported versions and end-of-life stated somewhere public | 0–2 |
| **F4. Machine-Readable Advisories** | Advisories only in prose, or none | Published inconsistently | Advisories machine-readable (GHSA, OSV, CSAF or OpenVEX), so downstream tooling can match them to versions | 0–2 |

---

## If this project is a steward: Article 14 reporting

Only for projects that concluded they are an OSS Steward or a manufacturer.
Art. 14 sets a three-stage cascade to the CRA Single Reporting Platform once
there is an **actively exploited** vulnerability or a severe incident:

| Stage | Clock | Goes to |
|---|---|---|
| Early warning | 24 hours from awareness | Coordinating CSIRT and ENISA, via the SRP |
| Full notification | 72 hours from awareness | SRP, with severity, affected versions, interim mitigations |
| Final report | 14 days from a fix being available | SRP. Severe incidents: one month from the 72-hour notification |

Three things maintainers get wrong about this:

- It applies to **actively exploited** vulnerabilities and severe incidents, not
  to every CVE.
- The SME exemption covers the **fine** for missing the 24-hour window. It does
  not remove the obligation to report.
- The clock starts at awareness, so there needs to be a record of when awareness
  began. Nobody reconstructs that afterwards.

Readiness here is unglamorous and mostly done in advance: a named person and a
named backup, EU Login access to the SRP, an offline worksheet for when the
platform is unavailable, and one rehearsal. OpenChain checklist 4.4 and 4.5
cover this in full.

##  Overall CRA Readiness Result

**Passing Condition:**
- No **[critical]** criterion scores 0, **and**
- All criteria score **2**, **or** at most **two** criteria score **1**, with **no 0s**

**Results:**
- **Pass** – Project enables downstream CRA compliance
- **Conditional** – Gaps require remediation before regulated use
- **Fail** – Project state blocks CRA-regulated adoption

---

## Reviewer Notes

- Blocking gaps:
- Sponsor-investable remediation areas:
- Recommended priority actions:
