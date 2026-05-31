/* ──────────────────────────────────────────────────────────────────────────
   Workspace model — "one workspace = one memory context".

   For now there is a single default workspace, but every memory carries a
   workspace_id and retrieval is scoped to it, so multiple workspaces (CIRO,
   research, cybersecurity, …) can be added later without a data migration.
   ────────────────────────────────────────────────────────────────────────── */

export const DEFAULT_WORKSPACE_ID = 'mnemos-demo';

export interface Workspace {
  id: string;
  label: string;
  description: string;
}

export const WORKSPACES: Workspace[] = [
  { id: 'mnemos-demo', label: 'Mnemos Demo', description: 'Default memory context' },
];

export function getWorkspace(id: string | undefined): Workspace {
  return WORKSPACES.find((w) => w.id === id) ?? WORKSPACES[0];
}

/** Normalize an incoming workspace id (treat missing/unknown as the default). */
export function normalizeWorkspaceId(id: string | undefined | null): string {
  if (!id) return DEFAULT_WORKSPACE_ID;
  return WORKSPACES.some((w) => w.id === id) ? id : id; // accept custom ids for future use
}
