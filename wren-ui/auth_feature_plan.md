# Plan: Authentication & Project Access DB

## 1. Goal

Add a simple authentication model and per-user chat history on top of the current Wren UI database schema.

The system has three global roles:

- `dev`: creates and manages projects, connections, MDL, semantic models, dashboards, and instructions.
- `user`: can access all existing projects in the system, select a project, and chat inside that project.
- `admin`: reserved for future system-level administration.

Core business rules:

- A project is created and owned by a `dev` user.
- All users can see and select all existing projects.
- A user must select a project before chatting.
- Threads always belong to both a project and a user.
- Inside project A, the user only sees their own threads for project A.
- Inside project B, the user only sees their own threads for project B.
- A normal `user` can chat and view project metadata needed for chat, but cannot modify connection, MDL, semantic model, or project configuration.
- Project access does not require membership checking in this phase.

## 2. Required Database Changes

Add new tables:

- `user`
- `user_session`

Modify existing tables:

- `project`: add `owner_id`
- `thread`: add `user_id` if missing; keep/use `project_id`

Do not add:

- `user_identity`: OAuth is out of scope for now.
- `project_member`: all users can access all projects, so per-user project membership is not needed.
- `thread_id` in any membership table: membership is out of scope.
- `ip_address` or `user_agent` in `user_session`: device/audit tracking is out of scope for now.

## 3. Table `user`

### Purpose

Stores internal email/password accounts.

### Columns

| Column | Suggested type | Required | Notes |
|---|---|---:|---|
| `id` | integer/serial | yes | Primary key |
| `email` | varchar | yes | Unique login email |
| `password_hash` | text | yes | Hashed password only |
| `role` | varchar | yes | `dev`, `user`, `admin` |
| `created_at` | timestamptz | yes | Follow existing timestamp convention |
| `updated_at` | timestamptz | yes | Follow existing timestamp convention |

### Constraints and indexes

- Primary key: `id`.
- Unique index: `email`.
- Optional check constraint: `role IN ('dev', 'user', 'admin')`.

### Naming note

The requested table name is `user`.

In PostgreSQL, `user` can be confusing because it is close to a reserved/system concept. If the codebase uses Knex or another query builder, ensure identifiers are quoted correctly by the migration/query layer.

## 4. Table `user_session`

### Purpose

Stores login sessions, session token hashes, refresh token hashes, and revoke/logout state.

### Columns

| Column | Suggested type | Required | Notes |
|---|---|---:|---|
| `id` | integer/serial or uuid | yes | Primary key |
| `user_id` | integer | yes | FK to `user.id` |
| `session_token_hash` | text | yes | Hash of the session/access token |
| `refresh_token_hash` | text | yes | Hash of the refresh token |
| `expires_at` | timestamptz | yes | Session/access token expiry |
| `refresh_expires_at` | timestamptz | yes | Refresh token expiry |
| `revoked_at` | timestamptz | no | Set on logout/revoke |
| `created_at` | timestamptz | yes | Follow existing timestamp convention |
| `updated_at` | timestamptz | yes | Follow existing timestamp convention |

### Constraints and indexes

- FK: `user_session.user_id -> user.id`.
- Index: `user_id`.
- Unique index: `session_token_hash`.
- Unique index: `refresh_token_hash`.

### Rules

A session token is valid when:

- `session_token_hash` matches.
- `expires_at > now()`.
- `revoked_at IS NULL`.

A refresh token is valid when:

- `refresh_token_hash` matches.
- `refresh_expires_at > now()`.
- `revoked_at IS NULL`.

Logout/revoke:

- Set `revoked_at = now()`.

## 5. Table `project`

### Change

Add:

| Column | Suggested type | Required | Notes |
|---|---|---:|---|
| `owner_id` | integer | yes after backfill | FK to `user.id` |

### Constraints and indexes

- FK: `project.owner_id -> user.id`.
- Index: `owner_id`.

### Rules

- `owner_id` is the dev who owns and manages the project.
- Only a `user` record with `role = 'dev'` can create a project.
- On project creation, set `project.owner_id = current_user.id`.
- The dev owner can modify connection info, MDL, models, metrics, views, dashboards, instructions, and deploy config.
- Normal `user` accounts can select and chat in any existing project.
- Normal `user` accounts cannot modify project configuration or semantic definitions.

### Existing data migration

If the database already has projects:

1. Create a default dev account.
2. Backfill existing `project.owner_id` with that default dev user.
3. Keep `owner_id` nullable during the first migration if needed.
4. Set `owner_id NOT NULL` in a later migration after data is clean.

## 6. Table `thread`

### Required model

A thread must be scoped to both:

- the selected project, through `thread.project_id`
- the current user, through `thread.user_id`

This means:

- Project A contains threads A1, A2, A3, etc.
- Project B contains threads B1, B2, B3, etc.
- A user's thread list inside project A must not include project B threads.
- A user's thread list inside project A must not include other users' project A threads.
- The selected project determines which connection, MDL, model, metrics, and instructions are used for chat.

### Change

Ensure `thread` has:

| Column | Suggested type | Required | Notes |
|---|---|---:|---|
| `project_id` | integer | yes | FK to `project.id`; required for model/MDL context |
| `user_id` | integer | yes after backfill | FK to `user.id`; required for per-user chat history |

If `project_id` already exists, keep it and add only `user_id`.

### Constraints and indexes

- FK: `thread.project_id -> project.id`.
- FK: `thread.user_id -> user.id`.
- Index: `(project_id, user_id, created_at)` for loading a user's threads in a selected project.
- Optional index: `user_id` if a global user history page is needed.

### Rules

When creating a thread:

- Validate the selected project exists.
- Create the thread with `project_id = selected_project.id`.
- Create the thread with `user_id = current_user.id`.

When listing threads after a user selects a project:

```sql
SELECT *
FROM thread
WHERE project_id = :selected_project_id
  AND user_id = :current_user_id
ORDER BY created_at DESC;
```

When reading or writing `thread_response`:

- Check the parent `thread.project_id` matches the selected project.
- Check the parent `thread.user_id` matches the current user.


## 7. Authentication UI Flow

### 7.1 Sign in screen

The application must provide a sign in screen.

Required fields:

- `email`
- `password`

Expected behavior:

1. User enters email and password.
2. Backend validates credentials against `user.email` and `user.password_hash`.
3. Backend creates a `user_session` record on successful login.
4. Backend returns session/access token and refresh token to the client.
5. Client redirects the user to the project selection screen.

### 7.2 Sign up screen

The application must provide a sign up screen.

Required fields:

- `email`
- `password`
- `role`

Role selection options:

- `dev`
- `user`
- `admin`

Expected behavior:

1. User enters email, password, and selected role.
2. Backend validates email uniqueness.
3. Backend validates role is one of `dev`, `user`, or `admin`.
4. Backend hashes the password and stores it in `user.password_hash`.
5. Backend creates the `user` record.
6. Backend may automatically sign the user in after successful sign up, or redirect them to the sign in screen.

Security note:

- Allowing users to self-select `dev` or `admin` is acceptable for this phase only if explicitly intended for internal/testing use.
- For production, `admin` and possibly `dev` role assignment should be restricted or approval-based.

## 8. Project Selection Flow

### 8.1 Dev creates a project

1. Dev logs in.
2. Backend checks `current_user.role = 'dev'`.
3. Dev creates a project.
4. Backend sets `project.owner_id = current_user.id`.
5. Dev configures connection, MDL, semantic model, metrics, views, dashboards, and instructions.

### 8.2 User selects a project

1. User logs in.
2. UI lists all projects in the system.
3. Backend returns all available projects without membership filtering:

```sql
SELECT *
FROM project
ORDER BY updated_at DESC;
```

4. User selects project A.
5. Backend validates project A exists.
6. Backend loads project A metadata needed for chat and model/MDL context.
7. Backend loads only the user's threads for project A.

### 8.3 User chats inside selected project

1. User selects project A.
2. User sends a question.
3. Backend validates project A exists.
4. Backend creates or reuses a `thread` with:
   - `project_id = project_A.id`
   - `user_id = current_user.id`
5. Backend creates `thread_response` under that thread.
6. The AI/chat flow uses project A's connection, MDL, model, metrics, and instructions.

### 8.4 User switches project

1. User switches from project A to project B.
2. Backend validates project B exists.
3. Backend loads project B metadata and model/MDL context.
4. Backend loads only threads where:
   - `thread.project_id = project_B.id`
   - `thread.user_id = current_user.id`
5. Project A threads are not shown in project B.

## 9. Authorization Rules

### Dev owner permissions

A dev owner can manage only projects they own.

Dev owner can:

- Create/update/delete project.
- Update connection info.
- Create/update/delete model.
- Create/update/delete model columns and nested columns.
- Create/update/delete relations.
- Create/update/delete metrics and measures.
- Create/update/delete views.
- Create/update/delete dashboards and dashboard items.
- Create/update/delete instructions and SQL pairs if they are project config.
- Deploy manifest/config.

### Normal user permissions

A normal user can:

- List all projects in the system.
- Select any existing project.
- Read project metadata needed for chat.
- Create/read their own threads inside the selected project.
- Create/read responses under their own threads.

A normal user cannot:

- Create/update/delete project.
- Change connection info.
- Change MDL or semantic model.
- Change metrics, views, dashboards, instructions, or SQL pairs.
- Read another user's threads.
- Read threads from a different project than the selected project.

## 10. Migration Order

1. Create table `user`.
2. Create table `user_session`.
3. Add nullable `owner_id` to `project`.
4. Backfill a default dev user if old projects exist.
5. Backfill `project.owner_id` for old projects.
6. Add or verify `thread.project_id`.
7. Add nullable `user_id` to `thread`.
8. Backfill `thread.user_id` if legacy thread ownership can be inferred; otherwise keep nullable temporarily.
9. Add FK/indexes for `project.owner_id`, `thread.project_id`, and `thread.user_id`.
10. After the app writes new data correctly, consider setting `project.owner_id`, `thread.project_id`, and `thread.user_id` to NOT NULL.

## 11. Questions for the Coding Agent

1. Which migration system is used: Knex, Prisma, TypeORM, or raw SQL?
2. Does `thread` already have `project_id`?
3. Does the current API already scope chat requests by project?
4. Where is project selection currently handled in the UI?
5. Should the project list show all projects to all authenticated users, or should any project visibility flag be added later?
6. Which password hashing library fits the current stack: bcrypt, argon2, or another existing utility?

## 12. Acceptance Criteria

The implementation is acceptable when:

- Table `user` exists with `id`, `email`, `password_hash`, `role`, `created_at`, and `updated_at`.
- Table `user_session` exists with only session/token management fields.
- `project.owner_id` links each project to its dev owner.
- `thread.project_id` identifies the project context for the thread.
- `thread.user_id` identifies the user who owns the thread.
- Project list returns all projects for authenticated users.
- Thread list is filtered by both `project_id` and `user_id`.
- A user selecting project A only sees their own project A threads.
- A user selecting project B only sees their own project B threads.
- A normal user cannot modify project config, connection info, MDL, or semantic definitions.
- Make sure the authentication integration MAKE NO ERROR for the original feature of wrenAI.