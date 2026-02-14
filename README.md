# Multi-Vendor DB

Dynamic multi-vendor database SaaS platform built with Nuxt 4.

## Tech Stack

- **Framework**: Nuxt 4
- **UI**: Nuxt UI + Tailwind CSS
- **Database**: PGlite (dev) / PostgreSQL (prod) + Electric SQL
- **File Storage**: Nuxt Hub Blob
- **Monorepo**: pnpm workspaces

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 10+

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Start development server
pnpm dev
```

Open http://localhost:3000

## Project Structure

```
├── apps/
│   └── web/           # Nuxt 4 application
├── packages/
│   └── shared/        # Shared types & utilities
└── docs/              # Obsidian vault (project docs)
```

## Available Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm lint` | Run ESLint |
| `pnpm test` | Run tests |
| `pnpm typecheck` | Run TypeScript type checking |

## Documentation

Project documentation is managed in the `docs/` folder using Obsidian.

See [docs/_index.md](docs/_index.md) for project dashboard.