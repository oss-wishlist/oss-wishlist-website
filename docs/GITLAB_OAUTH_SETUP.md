# GitLab OAuth Setup Guide

This guide explains how to set up GitLab OAuth authentication for OSS Wishlist.

## Prerequisites

- A GitLab account (GitLab.com or self-hosted instance)
- Admin access to your GitLab profile

## Step-by-Step Setup

### 1. Create a GitLab OAuth Application

1. **Go to Applications page**:
   - For GitLab.com: https://gitlab.com/-/profile/applications
   - For self-hosted: `https://your-gitlab-instance.com/-/profile/applications`

2. **Fill in application details**:
   - **Name**: `OSS Wishlist` (or your preferred name)
   - **Redirect URI**: This must match your deployed URL + `/auth/callback`
     - **Development**: `http://localhost:4321/oss-wishlist-website/auth/callback`
     - **Production**: `https://your-domain.com/auth/callback` (adjust based on your BASE_PATH)
   
   ⚠️ **Important**: The redirect URI must EXACTLY match what's in your environment variables, including the base path.

3. **Select scopes** (permissions):
   - ✅ **read_user** - Read user profile information
   - ✅ **read_api** - Read-only access to API
   - ✅ **read_repository** - Read access to repositories
   
   These scopes allow the app to:
   - Fetch your GitLab profile (username, email, avatar)
   - List your GitLab projects/repositories
   - Read basic project information

4. **Save the application**
   - Click "Save application"
   - GitLab will generate your credentials

### 2. Get Your OAuth Credentials

After creating the application, GitLab will show:
- **Application ID** - This is your `GITLAB_CLIENT_ID`
- **Secret** - This is your `GITLAB_CLIENT_SECRET`

⚠️ **Important**: Copy the secret immediately - GitLab only shows it once!

### 3. Configure Environment Variables

Add these to your `.env` file:

```env
# GitLab OAuth Configuration
GITLAB_CLIENT_ID=your_application_id_here
GITLAB_CLIENT_SECRET=your_secret_here
GITLAB_REDIRECT_URI=http://localhost:4321/oss-wishlist-website/auth/callback

# For self-hosted GitLab (optional)
# Leave as https://gitlab.com for GitLab.com
GITLAB_BASE_URL=https://gitlab.com
```

### 4. Update Redirect URI for Production

When deploying to production, update the redirect URI:

```env
# Production example
GITLAB_REDIRECT_URI=https://oss-wishlist.com/auth/callback
```

### 5. Test the Integration

1. Start your development server: `npm run dev`
2. Go to the login page: `http://localhost:4321/oss-wishlist-website/login`
3. Click "Sign in with GitLab"
4. You'll be redirected to GitLab to authorize
5. After authorization, you'll be redirected back to the app

## Self-Hosted GitLab Instances

If you're using a self-hosted GitLab instance:

1. Set `GITLAB_BASE_URL` to your GitLab URL:
   ```env
   GITLAB_BASE_URL=https://gitlab.yourcompany.com
   ```

2. Create the OAuth application at:
   `https://gitlab.yourcompany.com/-/profile/applications`

3. Ensure your GitLab instance is accessible from where your app is deployed

## Troubleshooting

### "Redirect URI mismatch" error
- Verify your `GITLAB_REDIRECT_URI` exactly matches what you configured in GitLab
- Check that `PUBLIC_BASE_PATH` is correctly set
- The URI is case-sensitive

### "Invalid client" error
- Double-check your `GITLAB_CLIENT_ID` and `GITLAB_CLIENT_SECRET`
- Ensure there are no extra spaces or quotes

### "Insufficient scope" error
- Verify you enabled all required scopes: `read_user`, `read_api`, `read_repository`

### GitLab button doesn't appear on login page
- Check that all GitLab environment variables are set
- The login page only shows providers that are properly configured
- Check browser console for errors

## Security Best Practices

1. **Never commit secrets**: Keep `.env` file out of version control
2. **Use different credentials**: Use separate OAuth apps for development and production
3. **Rotate secrets**: Periodically regenerate your client secret
4. **Restrict scopes**: Only request the minimum scopes needed
5. **HTTPS in production**: Always use HTTPS for production deployments

## Comparison: GitHub vs GitLab OAuth

| Feature | GitHub | GitLab |
|---------|--------|--------|
| Setup Location | https://github.com/settings/developers | https://gitlab.com/-/profile/applications |
| Credential Names | Client ID, Client Secret | Application ID, Secret |
| Scopes | `read:user user:email read:org` | `read_user read_api read_repository` |
| Self-hosted | GitHub Enterprise | GitLab CE/EE |
| Callback URL | Same for both | Same for both |

## Additional Resources

- [GitLab OAuth2 Documentation](https://docs.gitlab.com/ee/api/oauth2.html)
- [GitLab Application Settings](https://gitlab.com/-/profile/applications)
- [GitLab API Scopes](https://docs.gitlab.com/ee/api/oauth2.html#authorized-applications)
