# Taste (Continuously Learned by [CommandCode][cmd])

[cmd]: https://commandcode.ai/

# docker
- Use Docker for deployment instead of Vercel. Confidence: 0.50
- Use Docker Compose profile flags for local development services to selectively start only necessary containers (e.g., only start Postgres, not the app). Confidence: 0.65

# workflow
- Only build the app with `npm run build`; do not start it — the user will run it themselves. Confidence: 0.65
- Strictly limit implementation scope to exactly what the user asked for — do not expand into building full admin pages, nav items, API routes, migrations, or other infrastructure when the request is for a specific, narrow change. Confidence: 0.85
- For admin-only UI elements (status dropdowns, admin notes, etc.), restrict visibility on the frontend only — do not add backend-side validation or guards unless explicitly asked. Confidence: 0.75
