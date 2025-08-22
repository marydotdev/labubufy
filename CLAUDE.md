# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 15.5.0 application named "labubufy" built with TypeScript, React 19, and Tailwind CSS v4. It follows the Next.js App Router architecture and uses the latest versions of all major dependencies.

## Development Commands

- `npm run dev` - Start development server (runs on http://localhost:3000)
- `npm run build` - Build production application
- `npm start` - Start production server
- `npm run lint` - Run ESLint with Next.js TypeScript configuration

# For each new feature
git checkout main
git pull origin main
git checkout -b feature/[feature-name]

# After implementation
git add .
git commit -m "feat: [description of feature]"
git push origin feature/[feature-name]

# PR creation message format
Title: feat: Add [feature name]
Description:
- What was implemented
- How it works
- Any dependencies added
- Testing performed

## Architecture

### App Router Structure
- Uses Next.js App Router (`app/` directory)
- Root layout in `app/layout.tsx` with global font configuration (Geist Sans/Mono)
- Main page component in `app/page.tsx`
- Global styles in `app/globals.css`

### Styling & Design System
- Tailwind CSS v4 with PostCSS integration
- CSS custom properties for theming with dark mode support
- Theme tokens defined in `globals.css` using `@theme inline`
- Font system: Geist Sans (primary) and Geist Mono (code/monospace)

### TypeScript Configuration
- Strict TypeScript setup with path alias `@/*` pointing to root directory
- ESM module resolution with bundler strategy
- Next.js plugin for enhanced TypeScript integration

### Linting & Code Quality
- ESLint with Next.js core-web-vitals and TypeScript extensions
- Ignores standard build directories (`.next/`, `out/`, `build/`)

## Key Files
- `next.config.ts` - Next.js configuration (currently minimal)
- `tsconfig.json` - TypeScript configuration with path aliases
- `eslint.config.mjs` - ESM-based ESLint configuration
- `postcss.config.mjs` - PostCSS setup for Tailwind CSS v4
- `app/layout.tsx` - Root layout with font loading and metadata
- `app/globals.css` - Global styles with CSS custom properties and dark mode

