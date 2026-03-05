# 12 — Governance & License

![License](https://img.shields.io/badge/license-CC_BY--NC--SA_4.0-lightgrey?style=flat-square)
![Doc Type](https://img.shields.io/badge/doc-governance-purple?style=flat-square)
![Status](https://img.shields.io/badge/status-stable-brightgreen?style=flat-square)
![Updated](https://img.shields.io/badge/updated-2026--03--05-informational?style=flat-square)

---

## Table of Contents

1. [License Summary](#1-license-summary)
2. [Full License Text Reference](#2-full-license-text-reference)
3. [What You Can Do](#3-what-you-can-do)
4. [What You Cannot Do](#4-what-you-cannot-do)
5. [Attribution Requirements](#5-attribution-requirements)
6. [Third-Party Components](#6-third-party-components)
7. [Data Privacy Considerations](#7-data-privacy-considerations)
8. [Contributing](#8-contributing)
9. [No Warranty](#9-no-warranty)

---

## 1. License Summary

[↑ TOC](#table-of-contents)

**bePrepared** is published under the **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International** license (CC BY-NC-SA 4.0).

```
SPDX-License-Identifier: CC-BY-NC-SA-4.0
```

The full license text is available at:
https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode

Every page of the application must display the footer line:

> Content licensed under CC BY-NC-SA 4.0

---

## 2. Full License Text Reference

[↑ TOC](#table-of-contents)

This work is licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.

To view a copy of this license, visit:
https://creativecommons.org/licenses/by-nc-sa/4.0/

Or send a letter to:
Creative Commons, PO Box 1866, Mountain View, CA 94042, USA.

---

## 3. What You Can Do

[↑ TOC](#table-of-contents)

Under CC BY-NC-SA 4.0, you are free to:

- **Share** — copy and redistribute the material in any medium or format
- **Adapt** — remix, transform, and build upon the material

Under the following terms:

- **Attribution (BY)** — you must give appropriate credit (see [Section 5](#5-attribution-requirements))
- **NonCommercial (NC)** — you may not use the material for commercial purposes
- **ShareAlike (SA)** — if you remix, transform, or build upon the material, you must distribute your contributions under the same license

---

## 4. What You Cannot Do

[↑ TOC](#table-of-contents)

- Sell or commercially distribute this software or its derivative works
- Remove or obscure the license notices or footer attribution line
- Re-license derivative works under a more permissive or incompatible license
- Use this software as part of a commercial SaaS product without explicit written permission from the original authors

---

## 5. Attribution Requirements

[↑ TOC](#table-of-contents)

When redistributing or adapting this work, you must:

1. **Retain** the copyright notice in all source files
2. **Display** the CC BY-NC-SA 4.0 footer on every application page
3. **Link** to the original project (if redistributed publicly)
4. **Indicate** if changes were made (e.g., "Based on bePrepared, modified by [Your Name]")
5. **Not imply** that the original authors endorse your adaptation

### Recommended attribution format

```
bePrepared — disaster preparedness platform
Content licensed under CC BY-NC-SA 4.0
https://creativecommons.org/licenses/by-nc-sa/4.0/
```

---

## 6. Third-Party Components

[↑ TOC](#table-of-contents)

This project uses the following open-source components under their respective licenses:

| Component | License | Notes |
|-----------|---------|-------|
| Next.js | MIT | Frontend framework |
| React | MIT | UI library |
| Tailwind CSS | MIT | Utility-first CSS |
| shadcn/ui | MIT | UI component collection |
| Elysia | MIT | Bun HTTP framework |
| Drizzle ORM | Apache-2.0 | TypeScript ORM |
| mysql2 | MIT | MariaDB/MySQL driver |
| MariaDB | GPLv2 | Database (server binary, not linked) |
| Bun | MIT | JavaScript runtime |
| Podman | Apache-2.0 | Container engine |

These components retain their own licenses. CC BY-NC-SA 4.0 applies to the **bePrepared application code and documentation** only, not to the third-party libraries.

---

## 7. Data Privacy Considerations

[↑ TOC](#table-of-contents)

bePrepared is designed for **local / self-hosted deployment**. By default:

- No data leaves your host machine
- No telemetry, analytics, or external API calls are made
- No user accounts or authentication tokens are sent externally

### Data stored locally

The MariaDB database stores:
- Household name and people count
- Inventory item names, quantities, and dates
- Equipment names, models, serial numbers
- Task progress notes (free text)
- Alert history

### PII guidance

- Do not store sensitive personal identifying information (government IDs, financial data, medical records) in free-text fields
- If the application is exposed to the network beyond localhost, configure a reverse proxy with TLS and authentication
- Regular backups are the operator's responsibility (see `docs/11-operations-podman.md`)

### No hard delete

The archive-only data lifecycle means deleted records remain in the database. If a household is archived, its data (inventory, tasks, alerts) persists and can be restored. Permanent erasure requires direct SQL `DELETE` statements — this is intentional and documented.

---

## 8. Contributing

[↑ TOC](#table-of-contents)

Contributions are welcome for personal, educational, and community preparedness uses.

By contributing, you agree that your contributions will be licensed under CC BY-NC-SA 4.0.

### Contribution guidelines (draft)

1. Open an issue before large changes
2. Follow the existing code style (TypeScript, Bun, no Docker)
3. Add or update documentation for any changed behaviour
4. Test against a local MariaDB instance before submitting
5. Do not introduce external telemetry or tracking

---

## 9. No Warranty

[↑ TOC](#table-of-contents)

> **THIS SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED.**

The preparedness figures and planning calculations in bePrepared are provided as general guidance only. They do not constitute professional emergency management advice.

- Water and calorie recommendations are based on common civilian preparedness guidelines and may not be appropriate for all medical conditions, climates, or emergencies
- Always consult official emergency management authorities (FEMA, Red Cross, local civil defence) for authoritative guidance
- The authors accept no liability for inadequate preparedness resulting from use of this software

---

*Content licensed under CC BY-NC-SA 4.0*
