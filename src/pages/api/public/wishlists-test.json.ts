import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const data = {
    "entries": [
      {
        "purl": "pkg:npm/lodash",
        "type": "npm",
        "name": "lodash",
        "repositoryUrl": "https://github.com/lodash/lodash",
        "has_wishlist": true,
        "links": [
          "https://oss-wishlist/oss-wishlist-website/wishlist/34"
        ]
      },
      {
        "purl": "pkg:pypi/requests",
        "type": "pypi",
        "name": "requests",
        "repositoryUrl": "https://github.com/psf/requests",
        "has_wishlist": true,
        "links": [
          "https://oss-wishlist/oss-wishlist-website/wishlist/34"
        ]
      },
      {
        "purl": "pkg:cargo/serde",
        "type": "cargo",
        "name": "serde",
        "repositoryUrl": "https://github.com/serde-rs/serde",
        "has_wishlist": true,
        "links": [
          "https://oss-wishlist/oss-wishlist-website/wishlist/34"
        ]
      },
      {
        "purl": "pkg:maven/com.google.guava/guava",
        "type": "maven",
        "name": "com.google.guava:guava",
        "repositoryUrl": "https://github.com/google/guava",
        "has_wishlist": true,
        "links": [
          "https://oss-wishlist/oss-wishlist-website/wishlist/34"
        ]
      },
      {
        "purl": "pkg:gem/rails",
        "type": "gem",
        "name": "rails",
        "repositoryUrl": "https://github.com/rails/rails",
        "has_wishlist": true,
        "links": [
          "https://oss-wishlist/oss-wishlist-website/wishlist/34"
        ]
      },
      {
        "purl": "pkg:golang/github.com/sirupsen/logrus",
        "type": "golang",
        "name": "github.com/sirupsen/logrus",
        "repositoryUrl": "https://github.com/sirupsen/logrus",
        "has_wishlist": true,
        "links": [
          "https://oss-wishlist/oss-wishlist-website/wishlist/34"
        ]
      },
      {
        "purl": "pkg:nuget/Newtonsoft.Json",
        "type": "nuget",
        "name": "Newtonsoft.Json",
        "repositoryUrl": "https://github.com/JamesNK/Newtonsoft.Json",
        "has_wishlist": true,
        "links": [
          "https://oss-wishlist/oss-wishlist-website/wishlist/34"
        ]
      },
      {
        "purl": "pkg:composer/symfony/console",
        "type": "composer",
        "name": "symfony/console",
        "repositoryUrl": "https://github.com/symfony/console",
        "has_wishlist": true,
        "links": [
          "https://oss-wishlist/oss-wishlist-website/wishlist/34"
        ]
      },
      {
        "purl": "pkg:pub/http",
        "type": "pub",
        "name": "http",
        "repositoryUrl": "https://github.com/dart-lang/http",
        "has_wishlist": true,
        "links": [
          "https://oss-wishlist/oss-wishlist-website/wishlist/34"
        ]
      },
      {
        "purl": "pkg:github/emmairwin/mcp-oss-metrics",
        "type": "github",
        "name": "emmairwin/mcp-oss-metrics",
        "repositoryUrl": "https://github.com/emmairwin/mcp-oss-metrics",
        "has_wishlist": true,
        "links": [
          "https://oss-wishlist/oss-wishlist-website/wishlist/34"
        ]
      },
      {
        "type": "npm",
        "name": "react",
        "repositoryUrl": "https://github.com/facebook/react",
        "has_wishlist": true,
        "links": [
          "https://oss-wishlist/oss-wishlist-website/wishlist/34"
        ]
      },
      {
        "repositoryUrl": "https://github.com/emmairwin/moderation",
        "has_wishlist": true,
        "links": [
          "https://oss-wishlist/oss-wishlist-website/wishlist/34"
        ]
      }
    ]
  };

  return new Response(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300'
    }
  });
};
