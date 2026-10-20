# Lead Round-Robin Automation (Google Sheets + Apps Script)

Distributes incoming leads from **Meta Lead Ads, Google Ads lead forms and website forms** evenly across a sales team, straight inside Google Sheets. No paid CRM needed.

I built this kind of setup for a GCC lead-generation client, where leads from Meta and Google lead-form campaigns had to be split fairly across a **7-person sales team** and followed up fast. This repo is a clean, client-free version you can copy.

## What it does

- **Round-robin assignment:** each new lead goes to the next rep in rotation; the position is remembered between runs.
- **Skips inactive reps:** set `Active` to `FALSE` for anyone on leave and the rotation skips them.
- **Duplicate detection:** the same phone number (or email) is marked `Duplicate` instead of being assigned twice.
- **Instant rep alerts:** the assigned rep gets an email with the lead's details.
- **Safe concurrency:** a script lock stops two runs from assigning the same lead.
- **Runs every 5 minutes** and on Google Form submits.

## Sheet layout

**Leads**

| Timestamp | Name | Phone | Email | Source | Assigned To | Assigned At | Status |
|---|---|---|---|---|---|---|---|

**Reps**

| Rep Name | Email | Active |
|---|---|---|
| Rep A | rep.a@example.com | TRUE |
| Rep B | rep.b@example.com | TRUE |
| Rep C | rep.c@example.com | FALSE |

Leads can arrive in the `Leads` tab from any source: a Zapier/Make zap, the Meta Lead Ads → Google Sheets integration, Google Ads lead form webhooks, or a linked Google Form.

## Setup (5 minutes)

1. Create the two tabs above in a Google Sheet.
2. Go to **Extensions → Apps Script**, paste [`Code.gs`](Code.gs) and save.
3. Run `setup()` once and approve the permissions.
4. Done. New rows are assigned automatically.

Settings live in the `CONFIG` block at the top of the script (sheet names, dedupe column, email alerts on/off, trigger interval).

## Why it matters for paid media

Lead quality reporting is only as good as follow-up speed. Fair, instant distribution means:

- faster first contact → higher lead-to-sale rate,
- clean data on which rep and which campaign closes,
- better feedback for optimising Meta/Google campaigns toward qualified leads.

---

Built by **[Ali Raza](https://ali-raza-ppc.github.io)**, Performance Marketing Specialist · [LinkedIn](https://www.linkedin.com/in/ali-raza-ads-manager/)
