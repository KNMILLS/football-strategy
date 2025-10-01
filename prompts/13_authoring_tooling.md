# 13_authoring_tooling.md — Table Author Spreadsheet/CLI

## Title & Goal
Create CLI tooling to scaffold new dice tables with 3–39 keys prefilled, implement a Google Sheets/CSV importer for bulk table creation, and add histogram preview functionality for rapid iteration on table distributions.

## Context
**What exists:**
- Table validation from prompt 01
- Schema definitions from prompt 02
- Balance analysis from prompt 09

**What must change:**
- Add CLI tool for scaffolding new tables with proper structure
- Implement CSV/Sheets importer for bulk table creation
- Create histogram preview for distribution visualization
- Enable rapid iteration workflow for table authors
- Provide validation feedback during authoring process

## Inputs
- `src/data/schemas/MatchupTable.ts` (schema for table structure)
- `src/sim/balance/Guardrails.ts` (balance requirements from prompt 09)
- `scripts/` (existing script patterns)

## Outputs
- `scripts/scaffold-table.mjs` (CLI tool for creating new tables)
- `scripts/import-csv-tables.mjs` (CSV/Sheets importer)
- `scripts/preview-distribution.mjs` (histogram preview tool)
- `src/tools/table-authoring/` (authoring utilities and helpers)
- `src/tools/table-authoring/TableScaffolder.ts` (programmatic table creation)
- `src/tools/table-authoring/CsvImporter.ts` (CSV parsing and validation)
- `src/tools/table-authoring/DistributionPreview.ts` (visualization helpers)
- `tests/tools/table-authoring/` (authoring tool tests)
- `docs/table-authoring-guide.md` (comprehensive authoring workflow)

## Constraints & Guardrails
- Follow `/docs/agent_best_practices.md` - single purpose, strict types, pure functions
- Do **not** delete or mass-move files outside stated scope
- Keep PRs small, single-topic, and reversible
- Enforce TS strictness; no `any`; small, single-purpose modules
- Tools must provide clear feedback for validation errors

## Step-by-Step Plan
1. **Create table scaffolder** - CLI tool generating 3-39 structure with placeholders
2. **Implement CSV importer** - Parse and validate bulk table data from spreadsheets
3. **Add distribution preview** - Histogram visualization for balance checking
4. **Build authoring utilities** - Helper functions for common table operations
5. **Add validation feedback** - Real-time checking during authoring
6. **Write comprehensive tests** - Tool functionality and error handling validation

## Testing & Acceptance Criteria
- **Scaffolding**: `scaffold-table.mjs west-coast deep-shot` creates valid 3-39 structure
- **CSV import**: Successfully imports tables from properly formatted CSV files
- **Distribution preview**: Generates accurate histograms for table analysis
- **Validation feedback**: Clear error messages for malformed table data
- **Performance**: Table operations complete in < 100ms
- **Error handling**: Graceful handling of malformed input files
- **Type safety**: All authoring operations strictly typed, no `any` usage
- **CI passes**: `npm run ci` succeeds with new authoring tools

## Edge Cases
- **Invalid CSV format**: Clear error messages for malformed spreadsheet data
- **Duplicate entries**: Detection and reporting of duplicate dice sums
- **Missing values**: Handling of incomplete table definitions
- **Large files**: Performance with bulk import of many tables
- **Special characters**: Proper handling of unicode in table names/descriptions

## Docs & GDD Update
- Add "Table Authoring Tools" section to GDD explaining the workflow
- Document CLI usage patterns and CSV format requirements
- Include examples of table scaffolding and distribution preview

## Version Control
- **Branch name**: `feature/migration-authoring-tools`
- **Commit format**:
  - `feat(tools): create table scaffolding CLI with 3-39 structure`
  - `feat(tools): implement CSV/Sheets importer for bulk table creation`
  - `feat(tools): add distribution histogram preview tool`
  - `feat(tools): build authoring utilities for common operations`
  - `feat(tools): add real-time validation feedback during authoring`
  - `test(tools): comprehensive authoring tool functionality tests`
  - `docs(authoring): workflow guide and tool documentation`
- **PR description**: "Implement table authoring toolchain for dice engine. Features CLI scaffolding, CSV import, distribution preview, validation feedback, and comprehensive documentation for rapid table iteration."
- **Risks**: None - authoring tools don't affect runtime gameplay
- **Rollback**: Remove authoring tools, existing table creation methods unaffected

## References
- `/docs/agent_best_practices.md` (required reading)
- `src/data/schemas/MatchupTable.ts` (schema requirements for scaffolding)
- `src/sim/balance/Guardrails.ts` (balance requirements for preview)
- `scripts/` (existing script patterns to follow)
