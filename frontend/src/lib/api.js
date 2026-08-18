export const API_BASE = "http://localhost:3000";

const ACCESS_KEY = "screenctl:access-token";
const REFRESH_KEY = "screenctl:refresh-token";

export function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY);
}
export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY);
}
export function setTokens({ accessToken, refreshToken }) {
  if (accessToken) localStorage.setItem(ACCESS_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
}
export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

// AuthProvider shu eventni tinglab, refresh muvaffaqiyatsiz bo'lganda user holatini tozalaydi.
function emitLoggedOut() {
  window.dispatchEvent(new Event("screenctl:logged-out"));
}

let refreshPromise = null;

async function tryRefresh() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  // Bir vaqtda bir nechta 401 kelsa ham faqat bitta refresh so'rovi yuborilishi uchun
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  const data = await refreshPromise;
  if (!data?.accessToken) {
    clearTokens();
    emitLoggedOut();
    return false;
  }
  setTokens(data);
  return true;
}

async function request(path, opts = {}, _retried = false) {
  const accessToken = getAccessToken();
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });

  // Javob tanasini avval matn sifatida o'qiymiz — 204 yoki bo'sh 200 (masalan
  // DELETE endpointlari) kelganda to'g'ridan-to'g'ri res.json() chaqirish
  // "Unexpected end of JSON input" xatosini berardi.
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (res.status === 401 && !_retried && !path.startsWith("/auth/") && getRefreshToken()) {
    const refreshed = await tryRefresh();
    if (refreshed) return request(path, opts, true);
  }

  if (!res.ok) {
    const message = data?.message || `${res.status} ${res.statusText}`;
    throw new Error(Array.isArray(message) ? message.join(", ") : message);
  }
  return data;
}

export const api = {
  auth: {
    register: (email, password, name) =>
      request("/auth/register", { method: "POST", body: JSON.stringify({ email, password, name }) }),
    login: (email, password) =>
      request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
    logout: () => {
      const refreshToken = getRefreshToken();
      clearTokens();
      if (!refreshToken) return Promise.resolve({ loggedOut: true });
      return request("/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken }) }).catch(() => ({}));
    },
    me: () => request("/auth/me"),
  },
  system: {
    overview: () => request("/system"),
  },
  templates: {
    list: () => request("/templates"),
    get: async (id) => {
      const all = await request("/templates");
      const found = all.find((t) => t.id === id);
      if (!found) throw new Error(`Template "${id}" not found`);
      return found;
    },
    public: (q = "") => request(`/templates/public${q ? `?q=${encodeURIComponent(q)}` : ""}`),
    setVisibility: (id, isPublic) =>
      request(`/templates/${id}/visibility`, { method: "PUT", body: JSON.stringify({ isPublic }) }),
    sync: () => request("/templates/sync", { method: "POST" }),
    create: (payload) =>
      request("/templates", { method: "POST", body: JSON.stringify(payload) }),
    files: {
      list: (id) => request(`/templates/${id}/files`),
      read: (id, fileName) => request(`/templates/${id}/files/${fileName}`),
      write: (id, fileName, content) =>
        request(`/templates/${id}/files/${fileName}`, {
          method: "PUT",
          body: JSON.stringify({ content }),
        }),
    },
    versions: {
      list: (id) => request(`/templates/${id}/versions`),
      restore: (id, version) =>
        request(`/templates/${id}/versions/${version}/restore`, { method: "POST" }),
    },
  },
  jobs: {
    list: (page = 1, limit = 10) => request(`/jobs?page=${page}&limit=${limit}`),
    get: (id) => request(`/jobs/${id}`),
    logs: (id) => request(`/jobs/${id}/logs`),
    create: (templateSlug, action, args = {}) =>
      request("/jobs", {
        method: "POST",
        body: JSON.stringify({ templateSlug, action, args }),
      }),
  },
  schedules: {
    list: () => request("/schedules"),
    create: (templateSlug, action, cron, args = {}) =>
      request("/schedules", {
        method: "POST",
        body: JSON.stringify({ templateSlug, action, cron, args }),
      }),
    setEnabled: (id, enabled) =>
      request(`/schedules/${id}/enabled`, {
        method: "PATCH",
        body: JSON.stringify({ enabled }),
      }),
    remove: (id) => request(`/schedules/${id}`, { method: "DELETE" }),
  },
  devices: {
    list: () => request("/devices"),
    activeCount: () => request("/devices/active-count"),
  },
  apps: {
    list: () => request("/apps"),
    get: (id) => request(`/apps/${id}`),
    create: (name) => request("/apps", { method: "POST", body: JSON.stringify({ name }) }),
    remove: (id) => request(`/apps/${id}`, { method: "DELETE" }),
  },
  auditLogs: {
    list: (limit = 50) => request(`/audit-logs?limit=${limit}`),
  },
};
