# 00_agent_best_practices.md — Author the Standards Document

## Title & Goal
Create `/docs/agent_best_practices.md` with comprehensive prompt engineering guidelines, TypeScript best practices, testing standards, and migration methodology to establish the foundational standards for all subsequent migration prompts.

## Context
**What exists:**
- Basic project structure with existing TypeScript configuration
- Current deterministic card system as baseline
- CI/CD pipeline in `package.json` scripts

**What must change:**
- Establish coding standards and methodology before migration begins
- Define single-purpose task patterns for prompt engineering
- Set TypeScript strictness and testing quality bars
- Create rollback and safety patterns for migration work

## Inputs
- `package.json` (CI scripts and project configuration)
- `tsconfig.json` (TypeScript configuration)
- `eslint.config.js` (linting rules)

## Outputs
- `/docs/agent_best_practices.md` (comprehensive standards document)
- Foundation for all subsequent migration prompts

## Constraints & Guardrails
- This is a **foundational prompt** - all later prompts must reference this document
- Establish patterns that enable safe, reversible migration work
- Define quality standards that prevent technical debt accumulation

## Step-by-Step Plan
1. **Analyze existing codebase** - Review current structure, CI, and quality standards
2. **Define prompt engineering principles** - Single-purpose, clear I/O, bounded scope
3. **Establish TypeScript standards** - Strict typing, module organization, import hygiene
4. **Set testing requirements** - Coverage thresholds, golden tests, integration testing
5. **Create migration safety patterns** - Rollback plans, non-destructive changes, validation
6. **Document methodology** - ReAct loop, conventional commits, PR structure

## Testing & Acceptance Criteria
- **Standards completeness**: Document covers all areas needed for migration prompts
- **Actionability**: Clear, specific guidance for prompt authors and implementers
- **Consistency**: Establishes patterns that enable systematic migration work
- **Safety**: Includes rollback and validation patterns for safe migration

## Edge Cases
- **Standards evolution**: Document structure supports ongoing refinement
- **Team coordination**: Clear patterns for multi-agent collaboration
- **Technical debt prevention**: Standards that maintain code quality during migration

## Docs & GDD Update
- Creates the foundational standards document referenced by all migration prompts
- Establishes methodology for the entire migration project

## Version Control
- **Branch name**: `chore/migration-standards-foundation`
- **Commit format**:
  - `docs(standards): create comprehensive agent best practices document`
- **PR description**: "Create foundational standards document for migration prompt series. Establishes prompt engineering principles, TypeScript best practices, testing standards, and safety patterns for systematic, reversible migration work."
- **Risks**: None - documentation-only foundation
- **Rollback**: Remove standards document if needed

## References
- `package.json` (CI and project structure)
- `tsconfig.json` (TypeScript configuration)
- `eslint.config.js` (existing linting standards)
