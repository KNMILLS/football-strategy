# Gridiron Project - Essential Distribution

This is a compressed distribution of the Gridiron football strategy game project, optimized for sharing and deployment.

## What's Included (4.2MB total)
- **Source Code** (`src/`) - Core TypeScript implementation
- **Game Data** (`data/`) - Game rules, plays, and configuration
- **Documentation** (`docs/*.md`) - Essential markdown documentation
- **Configuration** - Build and development setup files
- **Assets** (`assets/cards/`, `assets/nfl shield logo.png`, `assets/placeholder_light_gray_block.png`) - Essential game assets
- **Scripts & Tools** - Development and validation scripts

## What's Excluded (to reduce size)
- `node_modules/` (156MB) - Install with `npm install`
- `assets/archive/` (8.7MB) - Archived zip files
- `coverage/` (0.6MB) - Test coverage reports
- `artifacts/` (0.05MB) - Build artifacts
- `dist/` (2.4MB) - Built files (rebuild with `npm run build`)
- Large PDF/DOCX files in `docs/` (8.6MB) - Reference documentation
- Build cache files

## Getting Started
1. Extract the archive
2. Run `npm install` to install dependencies
3. Run `npm run dev` to start development
4. Run `npm run build` to build for production

## Full Repository
For the complete repository with all files, visit: [GitHub Repository]

## Size Breakdown
- **This distribution**: 4.2MB (under 25MB target)
- **Complete repository**: ~200MB (with all dependencies and artifacts)

This distribution contains everything needed to run, develop, and understand the Gridiron project while staying well under common file size limits.
