# bePrepared

![License](https://img.shields.io/badge/license-CC_BY--NC--SA_4.0-lightgrey?style=flat-square)
![Monorepo](https://img.shields.io/badge/workspace-bun_monorepo-blue?style=flat-square)
![Deploy](https://img.shields.io/badge/deploy-podman_quadlet-orange?style=flat-square)

---

## Table of Contents

1. [Overview](#overview)
2. [Project Structure](#project-structure)
3. [Documentation](#documentation)
4. [Development](#development)
5. [License](#license)

---

## Overview

[↑ Go to TOC](#table-of-contents)

bePrepared is a household preparedness platform with:

- `frontend/`: Next.js application
- `api/`: Elysia + Drizzle backend
- `worker/`: scheduled alert processing worker
- `deploy/`: Podman/Quadlet deployment assets
- `docs/`: operator and architecture documentation set

---

## Project Structure

[↑ Go to TOC](#table-of-contents)

```text
api/        Backend API and data access
frontend/   Web application
worker/     Background alert worker
deploy/     Container and quadlet units
docs/       Full documentation set
scripts/    Operator automation scripts
```

---

## Documentation

[↑ Go to TOC](#table-of-contents)

Start with `docs/README.md`, then follow the numbered documents (`docs/01-...md` through `docs/20-...md`).
For Playwright setup, local seeded runs, and shard debugging, see `docs/e2e-testing.md`.

---

## Development

[↑ Go to TOC](#table-of-contents)

```bash
bun install
cd api && bun run dev
cd ../frontend && bun run dev
cd ../worker && bun run dev
```

E2E quickstart:

```bash
bun run test:e2e:install
bun run db:migrate
bun run db:seed
bun run test:e2e
```

---

## License

[↑ Go to TOC](#table-of-contents)

Content licensed under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/).

---

_Content licensed under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) · bePrepared Disaster Preparedness System_
