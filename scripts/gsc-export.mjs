/**
 * Exports GSC query-level performance via an approved Google service account.
 * Secrets: GSC_SERVICE_ACCOUNT_JSON (raw JSON), GSC_SITE_URL (GSC property identifier).
 * The service account email must have access to the property in Search Console.
 */
import { createSign } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";

const credentials = JSON.parse(process.env.GSC_SERVICE_ACCOUNT_JSON || "null");
const site = process.env.GSC_SITE_URL;
if (!credentials?.client_email || !credentials?.private_key || !site) {
  throw Error("Set GSC_SERVICE_ACCOUNT_JSON and GSC_SITE_URL (e.g. sc-domain:example.com or https://example.com/).");
}
const b64 = value => Buffer.from(JSON.stringify(value)).toString("base64url");
const now = Math.floor(Date.now() / 1000);
const header = b64({ alg: "RS256", typ: "JWT" });
const payload = b64({
  iss: credentials.client_email, scope: "https://www.googleapis.com/auth/webmasters.readonly",
  aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3500
});
const sign = createSign("RSA-SHA256"); sign.update(header + "." + payload); sign.end();
const assertion = header + "." + payload + "." + sign.sign(credentials.private_key, "base64url");
const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
  method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion })
});
if (!tokenResponse.ok) throw Error("Google OAuth error " + tokenResponse.status + ": " + (await tokenResponse.text()).slice(0,400));
const { access_token: token } = await tokenResponse.json();
const today = new Date();
const iso = n => new Date(today.getTime() - n * 86400000).toISOString().slice(0,10);
const endpoint = "https://searchconsole.googleapis.com/webmasters/v3/sites/" + encodeURIComponent(site) + "/searchAnalytics/query";
const rows = []; let startRow = 0;
for (let page = 0; page < 25; page++) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { authorization: "Bearer " + token, "content-type": "application/json" },
    body: JSON.stringify({ startDate: iso(31), endDate: iso(3), dimensions: ["query"],
      type: "web", rowLimit: 1000, startRow, dataState: "final" })
  });
  if (!response.ok) throw Error("Search Console API error " + response.status + ": " + (await response.text()).slice(0,500));
  const body = await response.json();
  const batch = body.rows || [];
  rows.push(...batch);
  if (batch.length < 1000) break;
  startRow += batch.length;
}
const quote = value => '"' + String(value ?? "").replace(/"/g,'""') + '"';
const csv = ["Top queries,Clicks,Impressions,CTR,Position",
  ...rows.map(row => [row.keys?.[0] || "", row.clicks || 0, row.impressions || 0,
    (row.ctr || 0) * 100 + "%", row.position || 0].map(quote).join(","))].join("\n") + "\n";
await mkdir("reports", {recursive:true});
await writeFile("reports/gsc-queries.csv", csv, {mode:0o600});
console.log("Exported " + rows.length + " GSC queries for " + site + " (" + iso(31) + " to " + iso(3) + ").");
