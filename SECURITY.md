# Security — HoldSlot

**Date:** 2026-09-06  
**Context:** Public portfolio / demo deploy.

## Threat model

Public internet visitors can open the live URL. There is no expectation of
tenant isolation beyond what the app documents. Secrets belong in host env
vars (Vercel / GitHub Actions), never in the client bundle or git history.

Pure static WebMCP booking desk. No backend, no auth, no secrets. Agents can hold slots in-page; only the human confirm button commits.

## Residual risk

Accepted for a portfolio demo. Harden further (auth, rate limits, private repo)
before treating this as a production product.


## Repository visibility

This repository is currently **public** for portfolio review. When the open-source
build story is no longer needed, **the GitHub repo will go private**. Making the
repo private reduces source disclosure; it does **not** replace strong production
secrets, auth allow-lists, webhook signatures, or Vercel/Actions environment
hygiene. Rotate any credential that was pasted into chat, tickets, or screenshots.

