# ghost-labeler

A service to label Ghost members (new and existing) via HTML cards. Intake members from Ghost forms and apply a label to them — working around Ghost's clunky newsletter intake.

**Repository:** [mvvk-space/ghost-labeler](https://github.com/mvvk-space/ghost-labeler)

## What's here

- `server.js` — Express service that talks to the Ghost Admin API (`@tryghost/admin-api`) to apply labels to members
- `api/add-label.js` — the labeling routine, usable standalone or via the server
- `example-card.html`, `ghost-card-snippet.html`, `ghost-footer-script.html` — embeddable HTML cards/scripts for Ghost forms
- `.env.example` — required credentials (`GHOST_URL`, `GHOST_ADMIN_KEY`, `PORT`)
- `vercel.json` — deployable to Vercel

## Setup

```sh
cp .env.example .env    # add your Ghost Admin API key (Ghost Admin → Settings → Integrations)
npm install
npm start               # listens on :3000
```

Related: [netlify-ghost-forms-labeler](https://github.com/mvvk-space/netlify-ghost-forms-labeler) — the same intake flow on Netlify.