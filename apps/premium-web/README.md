# Ride2View Premium — standalone Vercel deployment

The premium customer interface is a **static demonstration** at `apps/premium-web/index.html`. The legacy root `index.html` and Next.js app at `apps/web` are separate entry points. Do not configure this static project to replace the existing `ride-2-view` project.

## Vercel project setup

1. In Vercel, select **Add New → Project** and import `aison7437/RIDE2VIEW`.
2. Create a **new** project (suggested name: `ride2view-premium`), rather than changing the existing deployment.
3. Set **Root Directory** to `apps/premium-web`.
4. Set **Framework Preset** to **Other**. This is plain HTML/CSS/JavaScript; no build command or install command is required.
5. Leave the output directory at the project root/default for static files. `vercel.json` sets no custom build or output directory.
6. Deploy a preview first. Verify that the deployment serves the premium `index.html` (page title: **Ride2View Pro — Theme System + Inventory**), not the existing Next.js `apps/web` application.
7. Only after preview validation, promote the separate project to production and configure its custom domain, if desired.

## Release acceptance checklist

- [ ] Premium page responds with HTTP 200; correct document title and asset loading
- [ ] Navigation, shop inventory/cards, and bottom navigation operate on desktop and mobile
- [ ] No fatal browser console errors; links and interactive controls work
- [ ] Existing `apps/web` deployment remains unchanged
- [ ] Legacy root `index.html` remains available in GitHub
- [ ] No real payments, customer data collection, or booking claims until verified backend integration, security, and compliance reviews

**Limitation:** A Vercel GitHub status for the existing `ride-2-view` project does not validate this new project's root-directory configuration. Vercel project creation and production promotion must be confirmed in Vercel itself.
