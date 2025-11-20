---
title: "How can I get a public list of wishlists?"
description: "API endpoint for accessing all approved wishlists"
category: "Developer"
order: 1
---

You can access all approved wishlists via our public API endpoint:

**Endpoint:** `https://oss-wishlist.com/api/wishlists`

**Method:** GET

**Response format:** JSON

Each wishlist includes:
- `id` - Wishlist ID
- `projectName` - Project name
- `projectDescription` - Project description
- `repositoryUrl` - GitHub repository URL
- `maintainerUsername` - Maintainer's GitHub username
- `wishes` - Array of requested services
- `technologies` - Array of technologies used
- `urgency` - Urgency level (low/medium/high)
- `wishlistUrl` - Direct link to fulfill the wishlist

**Example:**
```json
{
  "wishlists": [
    {
      "id": 140775,
      "projectName": "Example Project",
      "repositoryUrl": "https://github.com/owner/repo",
      "maintainerUsername": "maintainer",
      "wishes": ["developer-relations-strategy", "hosting-infrastructure"],
      "wishlistUrl": "https://oss-wishlist.com/fulfill?issue=140775"
    }
  ],
  "metadata": {
    "total": 1,
    "approved": 1
  }
}
```

Use this API to display OSS wishlists on your own website, create integrations, or build tools for the open source community.
