---
title: Privacy Policy
description: How OSS Wishlist collects, uses, and protects your data
date: 2025-11-16
---

# Privacy <span class="text-accent">Policy</span>

**Effective Date:** October 23, 2025  
**Last Updated:** November 16, 2025

## Our Commitment to Privacy

OSS Wishlist ("we," "us," or "our") is committed to protecting your privacy. We have designed our platform to minimize data collection and maintain transparency about how we handle your information.

## Information We Collect

### 1. GitHub Authentication Data

When you sign in with GitHub OAuth, we receive and temporarily store:
- GitHub username
- Public email address  
- GitHub profile information (name, avatar, user ID)
- GitHub OAuth access token

**Purpose:** To authenticate your identity and access your public GitHub information on your behalf (such as repositories you own).

**Storage:** Your OAuth access token is stored temporarily in an encrypted, httpOnly session cookie. We use this token to make API calls to GitHub on your behalf.

**Retention:** Session data (including the access token) is automatically deleted when you log out or after 24 hours of inactivity. We do not store access tokens in any database.

### 2. Wishlist Data

When you create a wishlist, we collect:
- Project repository information
- Service needs and descriptions
- Technologies used
- Preferred fulfillment methods
- Your GitHub username (as the maintainer)

**Purpose:** To publicly display open source projects' needs and connect maintainers with sponsors and practitioners.

**Storage:** All wishlists are stored in our **PostgreSQL database** hosted on Digital Ocean (Toronto, Canada). Approved wishlists are publicly visible on our website. Pending wishlists are visible only to administrators until approved.

**Database Location:** Digital Ocean Managed Database, Toronto, Canada

**Retention:** Wishlists remain in the database until you close or delete them. When you close a wishlist, it is marked as "closed" but remains in the database. When you delete a wishlist, it is permanently removed from our database.

**Approval Status:** New wishlists are initially set to "pending" status and require administrator approval before appearing publicly. You will be notified via email when your wishlist is approved or rejected.

### 3. Practitioner Application Data

When you join as a practitioner, we collect:
- Full name
- Contact email
- Service expertise
- Professional background
- LinkedIn/website (optional)
- GitHub username (from your authenticated session)
- Bio and certifications
- Languages spoken
- Availability and pro bono offerings

**Purpose:** To review, verify your qualifications, and create a public practitioner profile.

**Storage:** Application data is stored in our **PostgreSQL database** hosted on Digital Ocean (Toronto, Canada). Applications are initially set to "pending" status and require administrator approval.

**Database Location:** Digital Ocean Managed Database, Toronto, Canada

**Retention:** Pending applications remain in the database until an administrator approves or rejects them. Approved practitioners appear publicly on our website. Rejected applications remain in the database with "rejected" status but are not publicly visible. You can request deletion of your practitioner profile at any time.

**Approval Status:** New practitioner applications are set to "pending" status and require administrator review. You will be notified via email when your application is approved or rejected.

### 4. Sponsor Request Data

When you submit a fulfillment request, we collect:
- Your contact information
- Organization details (if applicable)
- Service offering details

**Purpose:** To facilitate connections between sponsors/practitioners and maintainers.

**Storage:** Request data is **sent directly to the wishlist creator via email** and is **not stored in our database**.

**Retention:** Email requests are retained according to our email hosting provider's policies (Resend). We do not maintain a separate copy in our database.

## Database Management

### Data Controller
OSS Wishlist is the data controller for all information stored in our database.

### Database Security
Our PostgreSQL database is:
- Hosted on **Digital Ocean Managed Database** (Toronto, Canada)
- Encrypted in transit (SSL/TLS)
- Encrypted at rest
- Protected by access controls and authentication
- Regularly backed up by Digital Ocean
- Accessible only to authorized administrators

### Data Processing
We process your data solely for:
1. Authenticating users and maintaining secure sessions
2. Storing and displaying wishlists and practitioner profiles
3. Managing approval workflows for new submissions
4. Facilitating connections between maintainers and practitioners/sponsors
5. Sending email notifications about your submissions

### Administrator Access
A limited number of authorized administrators have access to:
- Approve or reject pending wishlists and practitioner applications
- View all records in the database (including pending submissions)
- Delete records upon user request
- Manage user accounts and permissions

**Administrator Actions:** All administrator actions (approvals, rejections, deletions) are logged for security and accountability purposes.

### Legal Basis for Processing (GDPR)
For users in the European Economic Area (EEA), we process your data based on:
- **Consent:** When you submit a wishlist or practitioner application
- **Legitimate interests:** To operate our platform and connect open source maintainers with practitioners
- **Legal obligations:** When required by law to retain or disclose information

## Information We Do NOT Collect

We explicitly do not collect:
- Financial or payment information
- Detailed analytics or tracking data beyond basic server logs
- Personal information beyond what is necessary for the services above
- Information from third-party sources (except GitHub authentication)

## How We Use Your Information

We use collected information solely to:
1. Authenticate users and maintain secure sessions
2. Display public wishlists and practitioner profiles
3. Facilitate connections between maintainers and practitioners/sponsors
4. Respond to support requests and communications

We **never**:
- Sell your personal information
- Share your data with third parties for marketing purposes
- Use your data for advertising or profiling
- Track your behavior across other websites

## Data Sharing and Disclosure

### Public Data
The following information is **intentionally public** once approved:
- Approved wishlists (project information, service needs, technologies)
- Approved practitioner profiles (name, bio, services, contact information you chose to share)
- Project repository information

**Pending Data:** Wishlists and practitioner applications with "pending" status are NOT publicly visible and can only be accessed by authorized administrators.

### Public JSON Data Feed
We provide a **public JSON data feed** of all approved wishlists at `/wishlist-cache/all-wishlists.json`. This feed contains **minimal information only**:
- Unique wishlist ID (format: `{database_id}-{repository_name}`)
- Repository URL
- Link to full wishlist page on our website

**What is NOT included:** The JSON feed does NOT contain:
- Project descriptions, names, or details
- Service needs or wishes
- Technologies or resources
- Maintainer email addresses or any personal information beyond what is publicly visible in the GitHub repository URL
- Urgency, project size, or other metadata

Users must visit the full wishlist page on our website to view complete information.

**Purpose:** To enable third-party integrations and discovery tools while minimizing data exposure.

**Third-Party Access:** This JSON feed is publicly accessible and may be ingested by third-party services, including:
- **[Ecosyste.ms](https://ecosyste.ms/):** An open source project discovery and analysis platform (see [Ecosyste.ms Privacy Policy](https://ecosyste.ms/privacy))

**Data Synchronization:** When you delete or close a wishlist through our UI:
1. The wishlist is immediately removed from our database and JSON feed
2. Third-party services that have ingested the data (like ecosyste.ms) will receive the update on their next synchronization cycle
3. **Note:** We cannot control the exact timing of when third-party services refresh their cached data. Most services sync periodically (daily or weekly).

**Deletion Propagation:** While we remove data immediately from our systems, it may take additional time for third-party integrations to reflect deletions. Contact the third-party service directly if you need urgent removal from their systems.

### Third-Party Services
We use the following third-party services that may process your data:

- **GitHub:** For authentication and OAuth (see [GitHub Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement))
- **Resend:** For sending email notifications (see [Resend Privacy Policy](https://resend.com/legal/privacy-policy))
- **Digital Ocean:** For hosting our application and database (see [Digital Ocean Privacy Policy](https://www.digitalocean.com/legal/privacy-policy))

**Data Processor Agreements:** Digital Ocean acts as our data processor for database hosting. We have ensured appropriate data processing agreements are in place.

We do not share your personal information with these services beyond what is necessary for their operation (e.g., email addresses sent to Resend for notification delivery).

### Legal Requirements
We may disclose your information if required by law, legal process, or governmental request, or to protect:
- Our legal rights and property
- User safety and security
- Against fraud or security threats
- To comply with GDPR, CCPA, or other data protection regulations

## Your Rights and Choices

### Access and Control
You have the right to:
- **Access:** View your public wishlist data and practitioner profile at any time
- **Correction:** Update or correct your wishlist or practitioner profile by logging in and resubmitting your information through the application form, or by contacting us
- **Deletion:** Request deletion of your data (see below)
- **Export:** Download your data by contacting us (we will provide it in machine-readable format within 30 days)
- **Objection:** Object to processing of your data for specific purposes
- **Portability:** Request a copy of your data in a structured, commonly used format (GDPR right)
- **Restriction:** Request restriction of processing in certain circumstances

**Editing Your Profile:** To edit your practitioner profile, simply visit the practitioner application page while logged in and resubmit the form with updated information. Your existing profile will be updated automatically.

### Data Deletion
To delete your data:
- **Wishlist:** You can close or delete your wishlist through your dashboard at `/wishlists/me`, or contact us at [info@oss-wishlist.com](mailto:info@oss-wishlist.com)
  - **Close:** Marks wishlist as "closed" but keeps it in database (can be reopened)
  - **Delete:** Permanently removes wishlist from database (cannot be undone)
- **Practitioner Profile:** Contact us at [info@oss-wishlist.com](mailto:info@oss-wishlist.com) to request deletion of your practitioner profile
- **Session Data:** Log out or clear your browser cookies
- **Complete Account Deletion:** Contact us to request deletion of all your data from our database

**Deletion Timeline:** We will process deletion requests within 30 days. Some data may be retained in database backups for up to 90 days as part of our disaster recovery procedures.

**Legal Retention:** We may retain certain information if required by law or for legitimate business purposes (e.g., resolving disputes, enforcing agreements).

### Withdraw Consent
You can withdraw your consent for data processing at any time by:
- Deleting your wishlist or practitioner profile
- Contacting us to request account deletion
- Note: Withdrawal does not affect the lawfulness of processing before withdrawal

### Opt-Out of Communications
You can opt out of email communications by contacting us at [info@oss-wishlist.com](mailto:info@oss-wishlist.com)

## Data Security

We implement comprehensive security measures including:
- **Encryption in Transit:** All data transmitted between your browser and our servers is encrypted using HTTPS/TLS
- **Encryption at Rest:** Database data is encrypted at rest on Digital Ocean infrastructure
- **Secure Session Management:** httpOnly, secure cookies for session management (expires after 24 hours)
- **OAuth 2.0 Authentication:** Industry-standard authentication via GitHub
- **No Credential Storage:** We do not store passwords or sensitive authentication credentials
- **Access Controls:** Database access restricted to authorized administrators only
- **Regular Security Updates:** We maintain up-to-date dependencies and apply security patches promptly
- **Database Backups:** Regular automated backups with encryption
- **Security Monitoring:** Continuous monitoring for security threats and vulnerabilities

**Security Incident Response:** In the event of a data breach affecting your personal information, we will notify you within 72 hours as required by GDPR and applicable data protection laws.

However, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security but commit to following industry best practices.

## Cookies and Tracking

We use **essential cookies only**:
- **Session cookies:** To maintain your authenticated state (expires after 24 hours or logout)

We do **not** use:
- Analytics cookies
- Advertising cookies
- Third-party tracking cookies
- Social media tracking pixels

## International Data Transfers

**Data Location:** Our services and database are hosted in Toronto, Canada (Digital Ocean).

**For EEA/UK Users:** By using our services, you acknowledge that your personal data will be transferred to and processed in Canada. Canada is recognized by the European Commission as providing adequate protection for personal data under GDPR (adequacy decision). We also rely on:
- **Adequacy Decision:** Canada (specifically the Personal Information Protection and Electronic Documents Act - PIPEDA) is recognized by the EU as having adequate data protection
- **Standard Contractual Clauses (SCCs):** Digital Ocean provides Standard Contractual Clauses as approved by the European Commission for lawful data transfers
- **Appropriate Safeguards:** Security measures and data protection agreements

**For US Users:** Your data is processed in Toronto, Canada, which has strong privacy protections under PIPEDA.

**Data Protection Rights:** Regardless of location, you maintain all rights described in this privacy policy, including GDPR rights if you are in the EEA.

## Data Retention

We retain your data according to the following schedule:

| Data Type | Retention Period | Reason |
|-----------|------------------|--------|
| Session cookies | 24 hours or logout | Authentication |
| Approved wishlists | Until you delete/close | Service provision |
| Closed wishlists | Indefinitely (marked closed) | Historical records |
| Deleted wishlists | 90 days in backups only | Disaster recovery |
| Approved practitioner profiles | Until you request deletion | Service provision |
| Rejected applications | Indefinitely (not public) | Administrative records |
| Email notifications | Per Resend's policy | Third-party service |
| Server logs | 30 days | Security and debugging |
| Backup data | 90 days | Disaster recovery |

**Minimum Retention:** We do not retain data longer than necessary for the purposes outlined in this policy, except where required by law.

## Changes to This Policy

We may update this Privacy Policy from time to time. We will notify you of significant changes by:
- Updating the "Last Updated" date
- Posting a notice on our website
- Sending an email notification (if you have provided an email address)

Your continued use of our services after changes constitutes acceptance of the updated policy.

## Contact Us

For privacy questions, concerns, or data requests:

**Email:** [info@oss-wishlist.com](mailto:info@oss-wishlist.com)  
**GitHub Issues:** [Report a privacy concern](https://github.com/oss-wishlist/oss-wishlist-website/issues)

We'll respond to privacy requests within 30 days.

## Legal Compliance

This Privacy Policy complies with GDPR (EU), CCPA (California), and Canadian privacy laws (PIPEDA).

**Key Points:**
- We do not sell your personal information
- We do not use automated decision-making or profiling
- You can request deletion of your data at any time
- If you're in the EEA, you can lodge a complaint with your data protection authority
- Our services are not intended for children under 13

---

*Questions about this policy? Contact us at info@oss-wishlist.com*

