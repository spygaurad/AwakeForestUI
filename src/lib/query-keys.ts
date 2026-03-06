export const qk = {
  projects: {
    list: (orgId: string) => ['projects', orgId] as const,
    detail: (id: string) => ['projects', id] as const,
    members: (id: string) => ['projects', id, 'members'] as const,
  },
  datasets: {
    list: (orgId: string, params?: Record<string, unknown>) =>
      ['datasets', orgId, params] as const,
    detail: (id: string) => ['datasets', id] as const,
    items: (id: string, params?: Record<string, unknown>) =>
      ['datasets', id, 'items', params] as const,
  },
  annotations: {
    list: (params: Record<string, unknown>) => ['annotations', params] as const,
    detail: (id: string) => ['annotations', id] as const,
    versions: (id: string) => ['annotations', id, 'versions'] as const,
  },
  labelSchemas: {
    list: (orgId: string) => ['label-schemas', orgId] as const,
    detail: (id: string) => ['label-schemas', id] as const,
  },
  tracking: {
    list: (params: Record<string, unknown>) => ['tracking', params] as const,
    detail: (id: string) => ['tracking', id] as const,
    observations: (id: string) => ['tracking', id, 'observations'] as const,
  },
  alerts: {
    list: (params: Record<string, unknown>) => ['alerts', params] as const,
    detail: (id: string) => ['alerts', id] as const,
    subscriptions: (orgId: string) => ['alert-subscriptions', orgId] as const,
  },
  models: {
    list: (orgId: string) => ['models', orgId] as const,
    detail: (id: string) => ['models', id] as const,
  },
  jobs: {
    list: (orgId: string) => ['jobs', orgId] as const,
    detail: (id: string) => ['jobs', id] as const,
  },
  settings: {
    apiKeys: (orgId: string) => ['api-keys', orgId] as const,
    basemaps: (orgId: string) => ['basemaps', orgId] as const,
    bookmarks: (orgId: string) => ['bookmarks', orgId] as const,
    auditLog: (orgId: string, params?: Record<string, unknown>) =>
      ['audit-log', orgId, params] as const,
  },
  stac: {
    collections: () => ['stac-collections'] as const,
    search: (params: Record<string, unknown>) => ['stac-search', params] as const,
  },
} as const;
