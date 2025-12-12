# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EC2Instances.info is a cloud instance comparison website supporting AWS (EC2, RDS, ElastiCache, Redshift, OpenSearch), Azure VMs, and GCP instances. The project consists of:

- **next/**: Next.js 16 frontend (React 19, Tailwind CSS 4, TypeScript)
- **scraper/**: Go-based data scraper for AWS, Azure, and GCP APIs
- **www/**: Static output data (instances.json, compressed variants)
- **diff-writer/**: Go tool for tracking instance data changes

## Common Commands

### Frontend Development (run from `next/` directory)

```bash
nvm use                    # Use correct Node version (.nvmrc specifies v22)
npm ci                     # Install dependencies
npm run init               # Compress data (required before first dev run)
npm run dev                # Start dev server with Turbopack
npm run check-types        # TypeScript type checking
npm run test               # Run Vitest tests
npm run build              # Full build (init + llms + images + next build)
```

### Formatting (run from root)

```bash
make format                # Run gofmt and prettier via Docker
```

### Data Fetching

```bash
# Quick way (if not touching scraper):
curl -L https://instances.vantagestaging.sh/www_pre_build.tar.gz | tar -xzf -

# Full scrape (requires AWS, Azure, GCP credentials):
./fetch_data.sh
```

### Full Release Build

Don't do this generally unless explicitly asked.

```bash
make all                   # fetch-data + compress-www + next build
```

## Architecture

### Frontend Structure (next/)

- **app/**: Next.js App Router pages
    - `aws/ec2/[slug]/`, `aws/rds/[slug]/`, etc. - Instance detail pages
    - `azure/`, `gcp/` - Cloud provider listing pages
- **components/**: React components (Radix UI, shadcn/ui patterns)
- **utils/**: Shared utilities and data processing
- **llms/**: LLM-generated content for SEO
- **imageGen/**: OG image generation

### Data Flow

1. Go scraper fetches from AWS/Azure/GCP APIs → writes to `www/`
2. `npm run init` compresses JSON data with LZMA
3. Frontend loads compressed data client-side via `@/utils/data/`

### Scraper Structure (scraper/)

- **aws/**, **azure/**, **gcp/**: Provider-specific scrapers
- **utils/**: Shared scraper utilities
- Requires environment variables: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_SUBSCRIPTION_ID`, `GCP_PROJECT_ID`, `GCP_CLIENT_EMAIL`, `GCP_PRIVATE_KEY`
- When running the scraper, the cwd is important. Run within the root.

## Testing Guidelines

- Use **Vitest** (never Jest)
- Tests go in same folder as source, suffixed `.test.ts`
- Component tests use `@/utils/testing/componentTests` helper which handles describe/test blocks automatically
- Never use `describe` or `test` directly in component tests - use the test table pattern
- Use `vi.mock()` at module root instead of `Object.defineProperty`
- Don't use `@testing-library/jest-dom` or `screen` - use `component.container`
- Prefer `.ts` over `.tsx` for tests
- No snapshot tests - use assertions

## Git Workflow

- PRs target `develop` (staging)
- `main` is production
- Run `make format` before PRs
