# Ride2View Premium — standalone Vercel deployment

The premium customer interface is a static site at `apps/premium-web/index.html`. Account actions are routed through its same-origin Vercel function in `apps/premium-web/api/[...path].js`; browser requests never receive provider API keys. The legacy root `index.html` and Next.js app at `apps/web` are separate entry points. Do not configure this static project to replace the existing `ride-2-view` project.

## Vercel project setup

1. In Vercel, select **Add New → Project** and import `aison7437/RIDE2VIEW`.
2. Create a **new** project (suggested name: `ride2view-premium`), rather than changing the existing deployment.
3. Set **Root Directory** to `apps/premium-web`.
4. Set **Framework Preset** to **Other**. This is plain HTML/CSS/JavaScript; no build command or install command is required.
5. Leave the output directory at the project root/default for static files. `vercel.json` sets no custom build or output directory.
6. Deploy a preview first. Verify that the deployment serves the premium `index.html` (page title: **Ride2View Pro — Theme System + Inventory**), not the existing Next.js `apps/web` application.
7. Only after preview validation, promote the separate project to production and configure its custom domain, if desired.

## Authentication connection

Before enabling account registration on this static project, deploy the Ride2View Node API over HTTPS and set the Vercel project environment variable `R2V_API_ORIGIN` to that API origin (scheme and host only, for example `https://api.example.com`). The proxy forwards only the approved auth routes and `/api/config`, rewrites the upstream `Origin` for the API's same-origin check, and passes back the secure HttpOnly session cookie. It intentionally returns `503` while no API origin is configured. Do not expose provider credentials in this static project's browser code.

The API host must separately configure `AT_USERNAME`, `AT_API_KEY`, optional `AT_SENDER_ID`, `RESEND_API_KEY`, `R2V_AUTH_EMAIL_FROM`, and `R2V_AUTH_OTP_SECRET`. Configure the sender ID with Africa's Talking and verify the email sender domain with Resend before real sends. The Vercel proxy being deployed does not prove that the upstream API or SMS/email providers are active; complete the staging message-delivery and sign-in checks before announcing registration as live.

## Release acceptance checklist

- [ ] Premium page responds with HTTP 200; correct document title and asset loading
- [ ] Navigation, shop inventory/cards, and bottom navigation operate on desktop and mobile
- [ ] No fatal browser console errors; links and interactive controls work
- [ ] Existing `apps/web` deployment remains unchanged
- [ ] Legacy root `index.html` remains available in GitHub
- [ ] No real payments, customer data collection, or booking claims until verified backend integration, security, and compliance reviews

**Limitation:** A Vercel GitHub status for the existing `ride-2-view` project does not validate this new project's root-directory configuration. Vercel project creation and production promotion must be confirmed in Vercel itself.
