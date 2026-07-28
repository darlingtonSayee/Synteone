# Synteone Website

Official Synteone website with public pages, legal pages, admin-managed content, contact submissions, EmailJS configuration, and AI-assisted admin drafting.

## Run

```powershell
npm start
```

Open `http://localhost:4173`.

The local server serves both the public website and the admin/API backend.

## Admin

Admin is available at `http://localhost:4173/admin` or `http://localhost:4173/admin.html`.

Set these environment variables before deployment:

```powershell
$env:ADMIN_EMAIL="your-email@example.com"
$env:ADMIN_PASSWORD="strong-password"
$env:ADMIN_ROLE="super_admin"
$env:SESSION_SECRET="long-random-secret"
$env:OPENAI_API_KEY="optional-openai-key-for-ai-drafts"
```

For production, prefer `ADMIN_PASSWORD_HASH` instead of `ADMIN_PASSWORD`. The format is
`salt:hash`, where the hash is PBKDF2-SHA256 with 210000 iterations and 32 bytes.

Local defaults:

- Email: `admin@synteone.local`
- Password: `change-me-now`
- Role: `super_admin`

Projects are stored in `data/projects.json`. The public Projects page reads from the same
store, so admin changes appear without rebuilding the site.

Admin users and contact messages are local/private data files and are ignored by Git:

- `data/admin-users.json`
- `data/messages.json`

Use the example files when setting up a new environment:

- `data/admin-users.example.json`
- `data/messages.example.json`

Site-wide content is stored in `data/settings.json`. Admin can edit:

- Homepage hero copy
- Company announcement banner
- Homepage advertisement block
- Logo URL or path
- Homepage video URL or path
- Social sharing image path
- Custom pages such as Team, Careers, or other company pages

Admin role types:

- `super_admin`: projects, site copy, media, ads, pages, users, and role visibility
- `content_admin`: projects, site copy, and pages
- `marketing_admin`: logo/video/media and advertisements
- `viewer_admin`: view-only admin access

For multiple admin accounts, set `ADMIN_USERS` to a JSON array:

```powershell
$env:ADMIN_USERS='[
  {"email":"owner@synteone.com","password":"strong-password","role":"super_admin"},
  {"email":"content@synteone.com","password":"strong-password","role":"content_admin"},
  {"email":"marketing@synteone.com","password":"strong-password","role":"marketing_admin"},
  {"email":"viewer@synteone.com","password":"strong-password","role":"viewer_admin"}
]'
```

Each user can also use `passwordHash` instead of `password`.

## Legal Docs

Website legal pages:

- `privacy.html`
- `terms.html`

Markdown source copies:

- `docs/privacy-policy.md`
- `docs/terms-and-conditions.md`

## Deployment

See `DEPLOYMENT.md`.
