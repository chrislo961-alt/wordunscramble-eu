# Weekly Google Search Console SEO report setup

This repository contains a **read-only** SEO opportunity report. It does not publish pages, change metadata, or submit indexing requests.

## Google access (owner action required)

1. In Google Cloud Console, create/select a project and enable **Google Search Console API**.
2. Create a dedicated service account with no project-wide Editor/Owner role.
3. Add its `client_email` address as a **Restricted** user (read access) for this property's Search Console settings.
4. In this GitHub repository, go to Settings > Secrets and variables > Actions.
   - Set repository **secret** `GSC_SERVICE_ACCOUNT_JSON` to the complete service-account key JSON. Never commit the key, share it in chat, or paste it in an issue.
   - Set repository **variable** `GSC_SITE_URL` to the **exact Search Console property identifier**. For a Domain property, use `sc-domain:wordunscramble.eu` *only if that is the identifier visible in Search Console*. For a URL-prefix property, use its exact HTTPS URL including trailing slash.
5. Review and merge the PR. Scheduled GitHub Actions run from the default branch; simply creating a PR does not activate the weekly schedule.
6. In Actions > Weekly GSC (or Search Console) workflow, use **Run workflow**. Confirm that it succeeds and download the Markdown report artifact.

## What it does

- Exports query-level Search Console data over a recent 28-day window with a 3-day lag for data finalization.
- Ranks possible improvements based on real impressions and positions.
- Uploads only the Markdown recommendation report as a GitHub Actions artifact.
- Keeps publishing and SEO recommendations behind manual review.

## Troubleshooting

- Missing environment settings: verify both repository Actions settings entries.
- Google OAuth 401: verify key JSON and service account status.
- Search Console 403: confirm the service account is added to the **same exact property** and the API is enabled.
- Search Console 404: check the property identifier, e.g. domain vs URL-prefix.
- Empty report: verify queries exist for the date range and impressions threshold; an empty report is not necessarily a failure.
- Scheduled runs are disabled on a repo or only pending in PR: activate after merge, then manually test.

## Security

Use a read-only permission scope; do not grant write access. Rotate credentials if exposed. The raw query CSV is generated during each job but is **not included in the uploaded report artifact**. Do not commit query CSVs, account credentials or API tokens.
