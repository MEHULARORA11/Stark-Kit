# Stark-Kit Frontend

This is the frontend application for [Stark-Kit](https://github.com/MEHULARORA11/Stark-Kit), containing the official landing page and documentation.

## Overview

The frontend is built with:
- **[Next.js](https://nextjs.org)** (App Router)
- **[Tailwind CSS](https://tailwindcss.com/)** for styling
- **[Shadcn UI](https://ui.shadcn.com/)** for accessible component primitives (sidebar, buttons, cards)
- **[Bun](https://bun.sh/)** as the package manager and runtime

## Getting Started

First, install the dependencies if you haven't already:

```bash
bun install
```

Then, run the development server:

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Folder Structure

- `app/page.tsx`: The main landing page for Stark-Kit, showcasing its features and supported providers.
- `app/stark-kit/docs/`: The documentation section. Each subfolder represents a different guide (e.g., `quick-start`, `installation`, `human-in-the-loop`).
- `components/`: Contains UI components like the `DocsSidebar`, `ThemeToggle`, `CodeBlock`, and primitive styling elements used throughout the docs.
- `components/ui/`: Reusable, accessible components generated via shadcn/ui.
- `lib/`: Utility functions (e.g., `cn` for Tailwind class merging).

## Editing the Documentation

The documentation pages are written as React components using custom typographic primitives (`DocPage`, `DocH1`, `DocP`, etc.) to ensure consistent styling and responsiveness.

To add a new documentation page:
1. Create a new folder inside `app/stark-kit/docs/` (e.g., `app/stark-kit/docs/new-feature`).
2. Add a `page.tsx` inside that folder utilizing the `Doc*` components from `@/components/doc-primitives`.
3. Update the `NAV_ITEMS` array inside `components/docs-sidebar.tsx` to include a link to your new page.

## Deployment

This Next.js application is optimized for deployment on [Vercel](https://vercel.com). Just connect the repository to your Vercel account and deploy with the default Next.js settings.
