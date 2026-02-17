export const BASE_URL = 'https://api.prod.whoop.com/developer/v2';

export const ENDPOINTS = {
  profile: '/user/profile/basic',
  body: '/user/measurement/body',
  workout: '/activity/workout',
  sleep: '/activity/sleep',
  recovery: '/recovery',
  cycle: '/cycle',
  revokeAccess: '/user/access',
} as const;

// By-ID endpoints (parametric)
export const byId = {
  sleep: (id: string) => `/activity/sleep/${id}`,
  workout: (id: string) => `/activity/workout/${id}`,
  cycle: (id: number) => `/cycle/${id}`,
  cycleSleep: (cycleId: number) => `/cycle/${cycleId}/sleep`,
  cycleRecovery: (cycleId: number) => `/cycle/${cycleId}/recovery`,
} as const;
