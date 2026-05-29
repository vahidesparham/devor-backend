# Devor Development Context

Read this first before making non-trivial changes. Keep it short and update it when project rules change.

## Project Shape

- Workspace:
  - `backend`: Express + Prisma + MySQL admin API.
  - `frontpanel`: Next.js admin panel.
- `frontsample` was removed. Do not reference or recreate it.
- Product was fully removed. Do not reintroduce Product routes, Prisma models, migrations, UI, docs, or permissions.
- Prisma currently has one clean init migration: `backend/prisma/migrations/20260529190000_init`.

## Backend Contracts

- Main route registry: `backend/src/routes/admin.routes.js`.
- Feature modules live in `backend/src/modules/<feature>` with:
  - `<feature>.routes.js`
  - `<feature>.controller.js`
  - `<feature>.service.js`
  - `<feature>.schemas.js`
- Prisma schema: `backend/prisma/schema.prisma`.
- Seed: `backend/prisma/seed.js`.
- Generated Prisma client is local only: `backend/src/generated/prisma-client`.
- Use existing response/error helpers from `backend/src/shared/http`.
- Use Zod schemas through the existing `validate` middleware.
- Keep business logic in services; controllers should stay thin.

## Permissions

- Permission key format: `resource.action`.
- Standard actions: `read`, `create`, `update`, `delete`.
- Add every new permission to `backend/prisma/seed.js`.
- Protect backend routes with `requirePermission("<permission>")` unless the route is public or only requires authentication.
- If editing role permissions can affect the current user, call `refreshMe()` on the frontend after save so menu/permissions refresh.

## Admin Menu

- Backend menu registry: `backend/src/modules/menu/menu.registry.js`.
- Add manageable features to the backend menu registry, not as hardcoded frontend menu items.
- Menu item contract:
  - `key`
  - `title`
  - `route`
  - `icon`
  - `order`
  - `permission` when access-controlled, normally `<resource>.read`.

## Image Config Rule

- Every image upload type needs an `ImageConfig`.
- Add image config seed data in `backend/prisma/seed.js`.
- Existing example: `admin_avatar`.
- New image feature checklist:
  - Stable `code`, for example `banner_desktop`.
  - `width`, `height`, `thumbnailWidth`, `thumbnailHeight`.
  - `folderName`.
  - Frontend upload field/service uses the same config code.
- Do not add image upload behavior without a config.

## Frontend Contracts

- Admin pages live under `frontpanel/src/app/(admin)`.
- Auth pages live under `frontpanel/src/app/(auth)`.
- Shared UI: `frontpanel/src/components`.
- API access: `frontpanel/src/services`.
- Global styles: `frontpanel/src/styles/globals.css`.
- Icon font/styles: `frontpanel/src/styles/icons.css`.
- HGI icon data: `frontpanel/src/data/hgiIcons.js`.

Reuse before creating new components:

- Forms: `AdminFormPage`, `FormPageShell`, `FloatingFormActions`, `FieldLabelWithHelp`, `AutoDisplayOrderField`.
- Lists: `AdminListPage`, `ListFiltersBar`, `ListFilterDropdown`, `ListSearchBox`, `RowActionsMenu`, `PaginationBar`, `SortableTh`.
- Inputs: `ImageUploadField`, `FileUploadField`, `ColorPickerField`, `IconPickerField`, `SearchableSelect`, `ShamsiDateTimeField`, `FroalaEditorField`, `SeoCharCounter`.
- Feedback: `Toast`, `ConfirmDialog`, `FormAlert`.

## Translations

- Locale files:
  - `frontpanel/src/locales/fa.json`
  - `frontpanel/src/locales/en.json`
- Add new UI strings to both locales.
- Prefer existing namespaces:
  - `common`
  - `actions`
  - `messages`
  - `placeholders`
  - `list`
  - `form`
  - `permissionsUi`
- Avoid hardcoded UI text in JSX unless it is temporary/debug-only.

## Lists

- Use `AdminListPage`.
- Use list components for filtering/search/actions:
  - `ListSearchBox`
  - `ListFiltersBar`
  - `ListFilterDropdown`
  - `RowActionsMenu`
- Include loading, empty, error, pagination, and delete confirmation states.
- Prefer existing query/debounce hooks: `useUrlQueryState`, `useDebouncedValue`.

## Forms

- Prefer one form route for create/update using query `id`.
- Use frontend validation for obvious local constraints; backend validation remains authoritative.
- Use `FloatingFormActions` for long/important forms.
- Use `Toast` for success/error feedback when the page should not reserve inline alert space.
- Translation-heavy forms should follow the existing `banners` / `slideshows` pattern with `TranslationCard` and `useTranslationsManager`.
- Use `AutoDisplayOrderField` for display ordering when relevant.
- Use `FieldLabelWithHelp` for non-obvious fields.

## Multilingual Content

- Languages come from backend `Language`.
- Multilingual entities need translation tables/models.
- List/form language selection should follow existing `lang` query patterns.
- Keep default language behavior visible and consistent.

## Prisma / Migration Notes

- This project intentionally starts with one clean init migration.
- After Prisma schema changes:
  - Validate schema.
  - Create migration.
  - Run `npm run prisma:generate`.
  - Run `npm run seed` if permissions, languages, image configs, or defaults changed.
- On Windows, if Prisma generate fails due to locked engine files, stop the backend dev server and rerun generate.

## Verification

Backend:

- `node -e "require('./src/app'); console.log('backend app loads')"`
- `npm run prisma:generate` when Prisma schema changed.
- `npm run seed` when seed data changed.
- `GET http://localhost:3001/health`.

Frontend:

- `npm run lint`.
- `npm run build`.
- Browser smoke test for the changed page.

Before finishing:

- Use `rg` for stale imports/routes/strings related to removed or renamed features.
- Check `git status --short --branch`.

## New Feature Checklist

1. Add/update Prisma model.
2. Add backend module.
3. Register backend route.
4. Add permissions to seed and route guards.
5. Add menu item if it is panel-managed.
6. Add image config seed if it uploads images.
7. Add frontend service.
8. Add list/form pages using existing components.
9. Add `fa` and `en` locale keys.
10. Run backend/frontend verification.
11. Smoke test in browser.
