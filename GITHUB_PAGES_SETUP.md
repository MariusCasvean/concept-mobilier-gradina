# GitHub Pages Custom Domain Setup Guide

This guide explains how to fix the DNS verification issue for the custom domain `concept-mobila-gradina.com`.

## Problem

GitHub cannot verify ownership of the domain because it can't find the required TXT record in your DNS settings.

## Solution Overview

The repository now includes:
1. **CNAME file** (`public/CNAME`) - Tells GitHub Pages which custom domain to use
2. **GitHub Actions workflow** (`.github/workflows/deploy.yml`) - Automatically builds and deploys the site
3. **Updated documentation** - Instructions for DNS configuration

## Steps to Fix the Issue

### 1. Merge This Pull Request

First, merge this pull request to the `main` branch. This will:
- Add the CNAME file to the repository
- Set up automatic deployment via GitHub Actions
- Update the documentation

### 2. Configure GitHub Pages

In your GitHub repository settings:

1. Go to **Settings** → **Pages**
2. Under **Source**, select **GitHub Actions**
3. Under **Custom domain**, enter: `concept-mobila-gradina.com`
4. Click **Save**

GitHub will perform a DNS check. This will initially fail because the DNS records are not configured yet.

### 3. Configure DNS Records

Go to your domain registrar (where you purchased `concept-mobila-gradina.com`) and add the following DNS records:

#### A Records (Required)

Add these four A records to point your apex domain to GitHub Pages:

| Type | Name | Value            |
|------|------|------------------|
| A    | @    | 185.199.108.153 |
| A    | @    | 185.199.109.153 |
| A    | @    | 185.199.110.153 |
| A    | @    | 185.199.111.153 |

#### TXT Record (Required for Verification)

This record proves you own the domain:

1. In GitHub, go to **Settings** → **Pages**
2. Enter your custom domain: `concept-mobila-gradina.com`
3. GitHub will provide specific instructions with the exact TXT record name and value
4. The record name will be in the format: `_github-pages-challenge-<username>`
5. Copy both the record name and verification code provided by GitHub
6. Add a TXT record in your DNS settings with:
   - **Name/Host**: The exact name provided by GitHub (e.g., `_github-pages-challenge-MariusCasvean`)
   - **Value**: The verification code from GitHub (a long alphanumeric string)

**Important**: Do not guess the TXT record name - always use the exact name shown in your GitHub Pages settings.

#### CNAME Record (Optional - for www subdomain)

If you want `www.concept-mobila-gradina.com` to work:

| Type  | Name | Value                           |
|-------|------|---------------------------------|
| CNAME | www  | mariuscasvean.github.io        |

### 4. Wait for DNS Propagation

DNS changes can take anywhere from a few minutes to 48 hours to propagate globally. Typically it's much faster (15 minutes to a few hours).

You can check DNS propagation at: https://dnschecker.org

### 5. Verify in GitHub

1. Go back to **Settings** → **Pages** in your GitHub repository
2. Wait for the DNS check to complete (refresh the page periodically)
3. Once verified, you'll see a checkmark next to your custom domain
4. Enable **Enforce HTTPS** (this option will appear after verification)

### 6. Test Your Site

After the first deployment completes:
- Visit http://concept-mobila-gradina.com
- Verify the site loads correctly
- Once HTTPS is enforced, visit https://concept-mobila-gradina.com

## Common Issues

### "DNS check failed"

- **Cause**: DNS records haven't propagated yet
- **Solution**: Wait longer (up to 24-48 hours) and keep refreshing the GitHub Pages settings

### "We couldn't find the TXT record"

- **Cause**: The TXT record is missing or incorrect
- **Solution**: 
  1. Double-check the TXT record name and value in your DNS settings
  2. Make sure you copied the exact verification code from GitHub
  3. Wait for DNS propagation

### "CNAME already taken"

- **Cause**: Another GitHub Pages site is using this domain
- **Solution**: Remove the domain from the other repository first

### Workflow fails on first run

- **Cause**: GitHub Pages may not be fully enabled yet
- **Solution**: 
  1. Make sure you selected "GitHub Actions" as the source in Settings → Pages
  2. Re-run the failed workflow from the Actions tab

## Manual Deployment Trigger

If you need to manually trigger a deployment:

1. Go to the **Actions** tab in your GitHub repository
2. Click on **Deploy to GitHub Pages** workflow
3. Click **Run workflow**
4. Select the `main` branch
5. Click **Run workflow**

## Verification Checklist

- [ ] Pull request merged to main branch
- [ ] GitHub Pages source set to "GitHub Actions"
- [ ] Custom domain entered in GitHub Pages settings
- [ ] A records added to DNS
- [ ] TXT record added to DNS (with correct verification code)
- [ ] DNS propagation completed (verify at dnschecker.org)
- [ ] GitHub shows domain verification success
- [ ] HTTPS enforced in GitHub Pages settings
- [ ] Site accessible at https://concept-mobila-gradina.com

## Support

If you continue to experience issues after following these steps:
1. Check the Actions tab for deployment errors
2. Verify DNS records at https://dnschecker.org
3. Ensure your domain registrar allows custom DNS records (some free domains have restrictions)

## Additional Resources

- [GitHub Pages Custom Domain Documentation](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)
- [GitHub Pages DNS Configuration](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)
