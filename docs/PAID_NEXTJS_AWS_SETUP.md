# BaseStack Paid Plans on AWS

This guide is for getting your first working AWS setup online even if you have never deployed anything on AWS before.

It is intentionally opinionated:

- Use **Supabase** for auth, database, and billing webhooks
- Use **Stripe** for subscriptions
- Use **one EC2 server** for the BaseStack app itself
- Add Nginx in front of the app
- Add paid-user exported Next.js portfolio projects later, after the main app is live

If you follow this guide in order, you will end up with:

1. your BaseStack app running on AWS
2. paid plans working through Stripe + Supabase Edge Functions
3. a path for hosting exported paid-user Next.js sites later

## What runs where

Before touching AWS, it helps to know what each service is doing.

### Supabase

Supabase handles:

- authentication
- your Postgres database
- Stripe billing functions:
  - `create-checkout-session`
  - `create-billing-portal-session`
  - `stripe-webhook`

### Stripe

Stripe handles:

- collecting payment
- managing subscriptions
- sending subscription updates back to Supabase using the webhook

### AWS

AWS runs your BaseStack app server:

- frontend app
- authenticated AI endpoints (`/api/ai/*`)

### Exported paid-user sites

Paid users can export a Next.js project zip.

Those exported projects do **not** need to be hosted on the same day you launch the main app. Get the main app working first.

## Part 1: Finish Supabase and Stripe first

Do this before touching AWS.

### Step 1. Apply the database SQL

Run [`supabase.sql`](../supabase.sql) in your Supabase SQL editor.

This creates or updates:

- `user_profiles`
- `user_subscriptions`
- `pages`
- usage limit functions
- billing-related fields such as:
  - `stripe_customer_id`
  - `stripe_subscription_id`
  - `stripe_price_id`
  - `subscription_status`
  - `current_period_end`
  - `cancel_at_period_end`

### Step 2. Set Supabase function secrets

Set these secrets in your linked Supabase project:

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_PRO_PRICE_ID=price_...
supabase secrets set STRIPE_STUDIO_PRICE_ID=price_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set APP_URL=http://localhost:3000
```

Important:

- Do **not** try to set `SUPABASE_SERVICE_ROLE_KEY` manually with `supabase secrets set`.
- Supabase already provides `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, and `SUPABASE_ANON_KEY` to Edge Functions in the hosted environment.

When you move to production later, change:

```bash
APP_URL=https://your-domain.com
```

### Step 3. Deploy the billing functions

Use the latest supported CLI path if possible:

```bash
npx supabase functions deploy create-checkout-session --no-verify-jwt
npx supabase functions deploy create-billing-portal-session --no-verify-jwt
npx supabase functions deploy stripe-webhook --no-verify-jwt
```

Why `--no-verify-jwt` here?

- `stripe-webhook` must be public because Stripe calls it directly
- depending on your current Supabase setup, the checkout/portal functions may also need gateway JWT verification disabled because the function code already validates the bearer token itself

### Step 4. Create the Stripe webhook endpoint

In Stripe test mode:

1. Open **Developers** or **Workbench**
2. Create a **Webhook endpoint**
3. Use this URL:

```text
https://<your-project-ref>.supabase.co/functions/v1/stripe-webhook
```

4. Subscribe to these events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Copy the webhook signing secret (`whsec_...`)
6. Save it as `STRIPE_WEBHOOK_SECRET`

### Step 5. Test billing locally

Before AWS, make sure this works locally:

- click `Upgrade to Pro`
- get redirected to Stripe Checkout
- complete checkout in test mode
- return to Settings
- see the welcome message
- see the plan update

If this does not work locally, stop and fix it before deploying to AWS.

## Part 2: Launch the main BaseStack app on AWS

This is the first AWS goal.

You are **not** trying to host every generated user portfolio yet.
You are only trying to host the main app.

## Why EC2?

I recommend **Amazon EC2** for your first deployment because this repo already uses a custom Node server:

- `npm run dev` runs `tsx server/index.ts`
- `npm run preview` runs the app server in production mode

EC2 is the easiest AWS option when you want direct control and simple “SSH into a server and run Node” deployment.

## AWS overview in plain English

You are going to:

1. create a virtual Linux machine on AWS
2. connect to it with SSH
3. install Node.js
4. copy or clone your code onto it
5. run the BaseStack app on port `3000`
6. put Nginx in front so your domain works on ports `80` and `443`

## Step 6. Create an EC2 instance

In AWS:

1. Open **EC2**
2. Click **Launch instance**
3. Name it something like:
   - `basestack-app`
4. Choose:
   - **Ubuntu Server 24.04 LTS**
5. Instance type:
   - `t3.small` is a good starter
   - `t3.micro` may work for testing, but `t3.small` is safer
6. Create or select a key pair
   - download the `.pem` file
   - keep it somewhere safe
7. Allow these inbound rules:
   - SSH (`22`) from your IP
   - HTTP (`80`) from anywhere
   - HTTPS (`443`) from anywhere
8. Launch the instance

## Step 7. Attach a public IP and note the server address

After launch, AWS will show the public IPv4 address or public DNS name.

You will use this to SSH in.

## Step 8. Connect to the server

From your terminal:

```bash
ssh -i /path/to/your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

On Windows, if you are using PowerShell and OpenSSH:

```powershell
ssh -i C:\path\to\your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

If Windows complains about key permissions, fix that first.

## Step 9. Update the server and install Node.js

Once connected:

```bash
sudo apt update
sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git nginx
node -v
npm -v
```

You want Node 20 or newer.

## Step 10. Put your code on the server

If the repo is on GitHub:

```bash
git clone <your-repo-url>
cd basestack
```

If the repo is not on GitHub yet, you can upload it another way later, but Git is easiest.

## Step 11. Install dependencies and build the app

On the server:

```bash
npm ci
npm run build
```

## Step 12. Create the production environment file

Create a `.env.local` or equivalent runtime env file on the server.

At minimum, your app server needs:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
GEMINI_API_KEY=your_gemini_key
APP_URL=https://your-domain.com
```

Notes:

- the Stripe secret key is **not** needed on the EC2 app server anymore
- Stripe billing happens in Supabase Edge Functions now
- if you are testing before the domain is ready, `APP_URL` can temporarily be `http://YOUR_EC2_PUBLIC_IP`

## Step 13. Start the app manually first

Before setting up background services, make sure the app starts.

```bash
PORT=3000 npm run preview
```

Now visit:

```text
http://YOUR_EC2_PUBLIC_IP:3000
```

If you see the app, that is a very good sign.

Press `Ctrl+C` after verifying.

## Step 14. Keep the app running with PM2

Install PM2:

```bash
sudo npm install -g pm2
```

Start the app:

```bash
cd ~/basestack
pm2 start "PORT=3000 npm run preview" --name basestack
pm2 save
pm2 startup
```

PM2 will print one more command. Copy and run that command too.

Useful PM2 commands:

```bash
pm2 status
pm2 logs basestack
pm2 restart basestack
```

## Step 15. Put Nginx in front of the app

Create an Nginx config:

```bash
sudo nano /etc/nginx/sites-available/basestack
```

Paste:

```nginx
server {
  listen 80;
  server_name your-domain.com www.your-domain.com;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

Enable it:

```bash
sudo ln -s /etc/nginx/sites-available/basestack /etc/nginx/sites-enabled/basestack
sudo nginx -t
sudo systemctl restart nginx
```

If the config test fails, do not continue until it passes.

## Step 16. Point your domain to the EC2 server

In your domain provider:

- create an `A` record pointing your domain to the EC2 public IP
- optionally create `www` too

Wait for DNS to update.

## Step 17. Add HTTPS

Once the domain points to your server, install Certbot:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

After that, your site should be available at:

```text
https://your-domain.com
```

## Step 18. Update Supabase to use the real production URL

Now that the domain is real, update the function secret:

```bash
supabase secrets set APP_URL=https://your-domain.com
```

Then redeploy the billing functions:

```bash
npx supabase functions deploy create-checkout-session --no-verify-jwt
npx supabase functions deploy create-billing-portal-session --no-verify-jwt
npx supabase functions deploy stripe-webhook --no-verify-jwt
```

This matters because Stripe return URLs and portal return URLs come from `APP_URL`.

## Part 3: Only after the main app works

Do this later.

Do **not** start here.

## Step 19. Export a paid-user Next.js project

Paid users can export a zip that contains:

- `app/page.tsx`
- `app/layout.tsx`
- `app/globals.css`
- `next.config.ts`
- `package.json`

These projects use Next.js standalone output.

## Step 20. Run an exported portfolio project on the server

For one exported project:

```bash
unzip my-portfolio.zip -d my-portfolio
cd my-portfolio
npm install
npm run build
cp -r .next/static .next/standalone/.next/static
node .next/standalone/server.js
```

That will start on port `3000` by default unless you change `PORT`.

If you want multiple exported sites on one server, you will need:

- one port per site
- one Nginx server block or subdomain per site

Example:

- `portfolio1.your-domain.com -> 127.0.0.1:3101`
- `portfolio2.your-domain.com -> 127.0.0.1:3102`

## Recommended order of operations

If you feel lost, follow this exact order:

1. Get billing working locally
2. Launch EC2
3. SSH into EC2
4. Install Node, Git, and Nginx
5. Clone repo
6. Add env vars
7. Run `npm ci`
8. Run `npm run build`
9. Run `PORT=3000 npm run preview`
10. Confirm the app loads on `:3000`
11. Put PM2 in place
12. Put Nginx in place
13. Point domain to EC2
14. Add HTTPS
15. Update `APP_URL` in Supabase
16. Redeploy functions
17. Test Stripe checkout on production

## Troubleshooting

### The app does not load on port 3000

Check:

```bash
pm2 logs basestack
```

and make sure:

- `npm run build` completed
- env vars are present
- port `3000` is actually being used by the app

### The domain does not work but port 3000 does

Usually this means:

- DNS is not pointed at the EC2 IP yet
- Nginx config is wrong
- port `80` or `443` is blocked in the EC2 security group

### Stripe checkout works locally but not on AWS

Usually this means:

- `APP_URL` is still `http://localhost:3000`
- billing functions were not redeployed after changing `APP_URL`
- the Stripe webhook endpoint was not created for the production project URL

### The cancellation warning or plan update is stale

Usually this means:

- the Stripe webhook is not firing
- `STRIPE_WEBHOOK_SECRET` is wrong
- the webhook endpoint is pointing at the wrong Supabase project

## Copy-paste checklist

### On your local machine

```bash
npx supabase functions deploy create-checkout-session --no-verify-jwt
npx supabase functions deploy create-billing-portal-session --no-verify-jwt
npx supabase functions deploy stripe-webhook --no-verify-jwt
```

### On the EC2 server

```bash
sudo apt update
sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git nginx
git clone <your-repo-url>
cd basestack
npm ci
npm run build
PORT=3000 npm run preview
```

### Then turn it into a persistent service

```bash
sudo npm install -g pm2
pm2 start "PORT=3000 npm run preview" --name basestack
pm2 save
```

## Official docs used for this guide

- [Supabase Edge Functions: Deploy to Production](https://supabase.com/docs/guides/functions/deploy)
- [Supabase Edge Functions overview](https://supabase.com/docs/guides/functions)
- [Next.js output: standalone](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)

I am recommending EC2 here as an implementation choice based on your current codebase using a custom Node server. If you want later, I can also write a second guide specifically for a simpler “lowest-friction AWS choice” using Elastic Beanstalk instead of raw EC2.
