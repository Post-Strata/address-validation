# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build/Lint/Test Commands

- Install dependencies: `npm install`
- Development: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Setup DB: `npm run setup` (prisma generate && prisma migrate deploy)
- Deploy: `npm run deploy`

## Code Style Guidelines

- **Framework**: Remix + Shopify App Remix
- **Formatting**: Uses Prettier
- **Linting**: ESLint with @remix-run/eslint-config, @remix-run/eslint-config/node
- **TypeScript**: Strict mode enabled
- **Components**: Use Polaris for UI components
- **Naming**: Use camelCase for variables, PascalCase for components
- **Imports**: Group imports by type (React, Remix, Shopify, local)
- **Links**: Use `Link` from `@remix-run/react` or `@shopify/polaris`, not `<a>`
- **Redirects**: Use `redirect` from `authenticate.admin`, not from `@remix-run/node`
- **Forms**: Use `useSubmit` or `<Form/>` from `@remix-run/react`, not lowercase `<form/>`
- **Error Handling**: Use appropriate error boundaries and logging