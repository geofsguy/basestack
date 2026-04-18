<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your Basestack app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/fd8fa4f4-964b-4d5b-94a3-5e704c121de1

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deployment notes

- Billing now runs through Supabase Edge Functions in `supabase/functions/`
- Paid plans generate exportable Next.js portfolio projects
- AWS + Supabase setup guide: [`docs/PAID_NEXTJS_AWS_SETUP.md`](docs/PAID_NEXTJS_AWS_SETUP.md)
