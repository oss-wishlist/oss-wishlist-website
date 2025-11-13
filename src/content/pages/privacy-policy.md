---
title: Privacy Policy
description: How OSS Wishlist collects, uses, and protects your data
date: 2025-10-23
---

# Privacy <span class="text-accent">Policy</span>

**Effective Date:** October 23, 2025  
**Last Updated:** October 23, 2025

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

**Purpose:** To publicly display open source maintainer project's needs and connect maintainers with sponsors and practitioners.

**Storage:** All wishlists are stored as **public issues** in our GitHub repository ([oss-wishlist/wishlists](https://github.com/oss-wishlist/wishlists)). This data is publicly accessible by design.

**Retention:** Wishlists remain public until you close them or request deletion.

### 3. Practitioner Application Data

When you apply to become a practitioner, we collect:
- Full name
- Contact email
- Service expertise
- Professional background
- LinkedIn/website (optional)

**Purpose:** To review and verify your qualifications.

**Storage:** Application data is **sent directly to our administrators via email** and is **not stored in any database**. If approved, we create a public profile page (markdown file) in our repository with the information you provided.

**Retention:** Email applications are retained according to our email provider's policies. Public profiles remain until you request deletion.

### 4. Sponsor Request Data

When you submit a fulfillment request, we collect:
- Your contact information
- Organization details (if applicable)
- Service offering details

**Purpose:** To facilitate connections between sponsors/practitioners and maintainers.

**Storage:** Request data is **sent directly to the wishlist creator via email** and is **not stored in any database**. Our administrative email address (info@oss-wishlist.com) is hosted by PrivateEmail.com.

**Retention:** Email requests are retained according to our email hosting provider's policies. We do not maintain a separate copy.

## Information We Do NOT Collect

We explicitly do not collect:
- Financial or payment information
- Detailed analytics or tracking data
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
The following information is **intentionally public**:
- Wishlists (stored as GitHub issues)
- Approved practitioner profiles
- Project repository information

### Public JSON Data Feed
We provide a **public JSON data feed** of all wishlists at `/wishlist-cache/all-wishlists.json`. This feed contains:
- All public wishlist information (project names, services needed, descriptions, etc.)
- No personal authentication data or private information

**Purpose:** To enable third-party integrations and discovery tools.

**Third-Party Access:** This JSON feed is publicly accessible and may be ingested by third-party services, including:
- **[Ecosyste.ms](https://ecosyste.ms/):** An open source project discovery and analysis platform (see [Ecosyste.ms Privacy Policy](https://ecosyste.ms/privacy))

**Data Synchronization:** When you delete or close a wishlist through our UI:
1. The wishlist is immediately removed from our JSON feed
2. Third-party services that have ingested the data (like ecosyste.ms) will receive the update on their next synchronization cycle
3. **Note:** We cannot control the exact timing of when third-party services refresh their cached data. Most services sync periodically (daily or weekly).

**Deletion Propagation:** While we remove data immediately from our systems, it may take additional time for third-party integrations to reflect deletions. Contact the third-party service directly if you need urgent removal from their systems.

### Third-Party Services
We use the following third-party services:
- **GitHub:** For authentication and wishlist storage (see [GitHub Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement))
- **Resend:** For sending email notifications (see [Resend Privacy Policy](https://resend.com/legal/privacy-policy))
- **Digital Ocean:** For hosting our application (see [Digital Ocean Privacy Policy](https://www.digitalocean.com/legal/privacy-policy))

We do not share your personal information with these services beyond what is necessary for their operation.

### Legal Requirements
We may disclose your information if required by law, legal process, or governmental request, or to protect:
- Our legal rights and property
- User safety and security
- Against fraud or security threats

## Your Rights and Choices

### Access and Control
You have the right to:
- **Access:** View your public wishlist data at any time on GitHub
- **Correction:** Update or correct your practitioner profile by contacting us
- **Deletion:** Request deletion of your data (see below)
- **Export:** Download your data from our public GitHub repository

### Data Deletion
To delete your data:
- **Wishlist:** Open an issue at [oss-wishlist/wishlists](https://github.com/oss-wishlist/wishlists/issues) requesting closure, or contact us at [info@oss-wishlist.com](mailto:info@oss-wishlist.com)
- **Practitioner Profile:** Open an issue at our [website repository](https://github.com/oss-wishlist/oss-wishlist-website/issues) requesting profile deletion, or email us at [info@oss-wishlist.com](mailto:info@oss-wishlist.com)
- **Session Data:** Log out or clear your browser cookies

**Note:** Deleted wishlists and profiles may remain in GitHub's history and public archives (e.g., Internet Archive). This is inherent to public version control systems.

### Opt-Out of Communications
You can opt out of email communications by contacting us at [info@oss-wishlist.com](mailto:info@oss-wishlist.com)

## Data Security

We implement security measures including:
- Encrypted HTTPS connections for all traffic
- Secure, httpOnly cookies for session management
- OAuth 2.0 authentication via GitHub
- No storage of sensitive credentials
- Regular security reviews and updates

However, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security.

## Cookies and Tracking

We use **essential cookies only**:
- **Session cookies:** To maintain your authenticated state (expires after 24 hours or logout)

We do **not** use:
- Analytics cookies
- Advertising cookies
- Third-party tracking cookies
- Social media tracking pixels

## International Data Transfers

Our services are hosted in the United States (Digital Ocean). By using our services, you consent to the transfer of your information to the United States and processing in accordance with this Privacy Policy.

## Changes to This Policy

We may update this Privacy Policy from time to time. We will notify you of significant changes by:
- Updating the "Last Updated" date
- Posting a notice on our website
- Sending an email notification (if you have provided an email address)

Your continued use of our services after changes constitutes acceptance of the updated policy.

## Contact Us

For privacy-related questions, concerns, or requests, please contact us at:

**Email:** [info@oss-wishlist.com](mailto:info@oss-wishlist.com)  
**GitHub Issues:** [Report a privacy concern](https://github.com/oss-wishlist/oss-wishlist-website/issues)

## Compliance

This Privacy Policy complies with:
- General Data Protection Regulation (GDPR) principles
- California Consumer Privacy Act (CCPA) requirements
- GitHub's Terms of Service and Privacy Policies

---

*This privacy policy is designed to be transparent and user-friendly. If you have questions or need clarification, please don't hesitate to reach out.*
