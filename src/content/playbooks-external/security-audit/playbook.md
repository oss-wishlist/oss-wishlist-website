# Cyber Resilience Act (CRA) Pracitioner Playbook

A playbook for maintainers and pracitioners, in addition to their own resources.

**Important Note**: due to the obvious risk associated with this topic, the pracitioner delivering this service would be required to be validated by a CRA authorithy, or related foundation.


## Process Milestones

* Kick off meeting: Maintainer meets with OSS Wishlist admin and pracitioner (whether sponsor employee or verified pracitioner) to align on goals and timeline.
* Milestones finalized
* Milestone completed
* Wrap up meeting: Maintainer meets with OSS Wishlist maintainer and pracitioner
* Attestation of compliance (TBD method)
* Survey (maintainer and pracitioner)

##  Resources 

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
Overall result is determined by the **lowest scoring critical criterion**.

- 0 = Not present
- 1 = Present but insufficient
- 2 = Present and sufficient (meets CRA enablement needs)

---

## A. Vulnerability Disclosure & Response

| Criterion | 0 – Not Present | 1 – Insufficient | 2 – Sufficient | Score |
|---------|----------------|------------------|----------------|------|
| **A1. Public Disclosure Process** | No disclosure guidance | Informal or unclear | Clear, documented process (e.g. SECURITY.md) | 0–2 |
| **A2. Private Reporting Channel** | No private channel | Exists but unreliable | Clear, monitored reporting path | 0–2 |
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
| **C1. Dependency Declaration** | Dependencies unclear | Partial listing | Dependencies declared and discoverable | 0–2 |
| **C2. Build Input Visibility** | Build opaque | Partially documented | Build inputs documented at high level | 0–2 |
| **C3. Artifact Integrity** | Undocumented binaries | Mixed practices | No undocumented binaries in releases | 0–2 |

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

---

##  Overall CRA Readiness Result

**Passing Condition:**
- All criteria score **2**, **or**
- At most **two** criteria score **1**, with **no 0s**

**Results:**
- **Pass** – Project enables downstream CRA compliance
- **Conditional** – Gaps require remediation before regulated use
- **Fail** – Project state blocks CRA-regulated adoption

---

## Reviewer Notes

- Blocking gaps:
- Sponsor-investable remediation areas:
- Recommended priority actions:


:  

