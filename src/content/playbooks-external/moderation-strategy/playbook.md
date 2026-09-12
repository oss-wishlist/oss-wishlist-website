
# Moderation Strategy

Moderation tends to be an afterthought, and often becomes urgent as the lack of
a strategy takes hold: spam, AI slop, community chaos, or just more noise than
one person can process. This playbook is intended to help maintainers co-build a
strategy with their team and community, to set up for success in the future.

Bots appear on both sides of this. They filter spam, and they also generate it:
automated accounts and AI agents now open issues and pull requests at a rate no
maintainer can triage by hand, and a contribution that looks plausible costs
more to review than one that obviously does not. A moderation strategy written
only against human behaviour will not hold.

**NOTE**: moderation strategy can include code of conduct response, but the details of creating that document, and response times is a governance task.


## General Resources

- [Moderation Pocket Book](https://github.com/microsoft/OSPO/blob/main/learning_resources/moderating-oss/moderating-oss-repos.md)
- [Psychological Safety](https://chaoss.community/kb/metric-psychological-safety/), CHAOSS

## AI Alignment Resources

- [LLM Moderation Policies](https://github.com/chaoss/wg-ai-alignment/tree/main/moderation)

## Process Milestones

Note: that some milestones may not currently apply to a project and will be refined as part of the initial 

1. Kick off meeting: Maintainer meets with OSS Wishlist admin and practitioner (whether sponsor employee or verified practitioner) to align on goals and timeline.
2.  Noise & Spam Control Readiness
3.  Team Alignment on Moderation Practices
4.  Escalation & Maintainer Protection
5.  Continuous Process Improvement
7. Wrap up meeting: Maintainer meets with OSS Wishlist maintainer and practitioner
8. Survey (maintainer and practitioner)

## Moderation Strategy – Peer Review Rubric

**Scoring Scale per Criterion:**  
0 = Absent  
1 = Informal or ad-hoc  
2 = Partially defined but inconsistent  
3 = Strong policies and tools, minor improvement areas  
4 = Mature, proactive moderation and team alignment

---

### A. Noise & Spam Control Readiness (0–16 pts)

| Criterion | Indicators of Excellence | Score |
|---------|--------------------------|------|
| **A1. Automated Spam & Abuse Filtering** | Bots/filters handle spam, AI-slop detection, issue templates block junk. | 0–4 |
| **A2. Workflow Hygiene in PRs & Issues** | Clear routing rules; backlog pruning; stale automation; minimal manual triage. | 0–4 |
| **A3. Contribution Quality Signals** | Low-effort and duplicate contributions are identifiable early; templates and checks surface quality before review time is spent. | 0–4 |
| **A4. Automated & AI-Generated Contributions** | A stated position on bots and AI agents opening issues or pull requests: whether they are permitted, what disclosure is required, and who is accountable for what they submit. | 0–4 |

---

## B. Team Alignment on Moderation Practices (0–12 pts)

| Criterion | Indicators of Excellence | Score |
|---------|--------------------------|------|
| **B1. Defined Community Interaction Norms** | Internal doc: what’s tolerated vs. ignored vs. actioned; consistent decisions. | 0–4 |
| **B2. Moderation Roles & Responsibilities** | Who triages what is clear; triage rotation or designated moderators. | 0–4 |
| **B3. Low-Level Conflict Resolution** | Playbooks for de-escalation and “nuisance contributor” handling. | 0–4 |

---

## C. Escalation & Maintainer Protection (0–12 pts)

| Criterion | Indicators of Excellence | Score |
|---------|--------------------------|------|
| **C1. Defined Escalation Path** | When routine moderation escalates to CoC enforcement, GitHub reports, or external help. | 0–4 |
| **C2. Maintainer Safety Practices** | Clear boundaries; avoid one-on-one confrontations; neutrality reminders. | 0–4 |
| **C3. Decisions Documented Privately** | Minimal internal notes stored securely; privacy respected; audit trail exists. | 0–4 |

---

## D. Continuous Process Improvement (0–12 pts)

| Criterion | Indicators of Excellence | Score |
|---------|--------------------------|------|
| **D1. Monitoring Signals & Metrics** | Spam rates, triage load, response times tracked to guide improvements. | 0–4 |
| **D2. Tools & Scripts Are Updated** | Automation tuned as spam tactics evolve; proactive adoption of new protections. | 0–4 |
| **D3. Community Education & Preemptive Guidance** | FAQs, proactive docs to reduce repetitive questions; templates evolve over time. | 0–4 |

---

## ✅ Total Score: **/ 52 pts**

| Rating | Descriptor |
|------:|------------|
| 48–52 | Excellent — Maintainers shielded, chaos minimized |
| 39–47 | Strong — Manageable noise, rare overload |
| 26–38 | Adequate — Maintainers still burdened during spikes |
| 13–25 | Weak — Frequent chaos, burnout risk high |
| 0–12 | Not Viable — Maintainers overwhelmed; community degraded

---

## Reviewer Notes

- Top sources of noise:  
- Risk of harm / stress to maintainers:  
- Most impactful next improvements:  

