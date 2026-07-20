# Syncarion

AI 사업 설계 & 구축 파트너 — [syncarion.com](https://syncarion.com)

## Tech Stack

- **Framework**: [Astro 5](https://astro.build) (Static Site Generation)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com) + 2-layer design token system
- **Hosting**: [Vercel](https://vercel.com)
- **Email**: [Resend](https://resend.com) (contact form)
- **Domain**: Cloudflare (syncarion.com)

## Getting Started

```bash
npm install
npm run dev       # Start dev server
npm run build     # Production build
npm run preview   # Preview build
```

## Environment Variables

Copy `.env.example` to `.env` and fill in values:

| Variable | Required | Description |
|----------|----------|-------------|
| `RESEND_API_KEY` | Yes | Resend API key for contact form |
| `PUBLIC_ADSENSE_ID` | No | Google AdSense publisher ID |

## Project Structure

```
src/
├── pages/                       # Routes
│   ├── index.astro              # Landing page
│   ├── about.astro              # About
│   ├── privacy.astro            # Privacy policy
│   ├── blog/                    # Blog (index, [slug], category)
│   ├── products/                # Product catalog
│   └── rss.xml.ts               # RSS feed
├── content/
│   ├── config.ts                # Content Collections schema
│   └── blog/{category}/*.md     # Blog posts (markdown)
├── layouts/                     # BaseLayout, BlogPostLayout
├── components/
│   ├── layout/                  # Header, Footer
│   ├── sections/                # Landing page sections (6)
│   ├── blog/                    # PostCard, PostMeta, CategoryBadge
│   ├── product/                 # ProductCard, ProductHero
│   └── ads/                     # AdSlot (AdSense)
├── styles/
│   ├── tokens.css               # Design tokens (ref → main, 2-layer)
│   ├── global.css               # Tailwind + shared styles
│   └── prose.css                # Blog typography
├── lib/date.ts                  # Date formatting
└── consts.ts                    # Site constants, products, categories
```

## Writing Blog Posts

Create a markdown file in `src/content/blog/{category}/`:

```markdown
---
title: "Post Title"
description: "Short description (max 160 chars)"
pubDate: 2026-04-09
category: investing
tags: ["tag1", "tag2"]
draft: false
author: Tom
---

Post content here...
```

**Categories**: `investing` (투자) · `building` (개발) · `workshop-log` (작업실 일지)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview build |
| `npm run lint` | ESLint check |
| `npm run format` | Prettier auto-fix |
| `npm run format:check` | Prettier check |

## Branching & Deployment

**작업은 `dev`, 실배포는 `main`.** Vercel이 브랜치별로 자동 배포한다:

| Branch | Vercel | URL |
|--------|--------|-----|
| `main` | Production | syncarion.com |
| `dev`  | Preview    | 프리뷰 URL |

⚠️ **`dev`에만 푸시하면 실사이트(syncarion.com)에는 반영되지 않는다.** 라이브 반영이 목적이면 `dev`를 `main`에 병합한 뒤 `main`을 푸시해야 한다.

```bash
# dev에서 작업·커밋을 마친 뒤, 라이브 반영:
git checkout main
git merge --ff-only dev   # dev가 main보다 앞서 있으면 fast-forward
git push origin main      # → Vercel production 배포
git checkout dev          # 작업 브랜치로 복귀
```
