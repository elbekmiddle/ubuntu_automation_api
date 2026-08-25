export const API_HOST =
    import.meta.env.VITE_API_URL || "https://screen-api.honeymedia.uz";

/** REST so'rovlar shu bilan boshlanadi. Socket.IO ulanishlari uchun
 *  esa `API_HOST` ishlatiladi (`/api/v1` prefix HTTP routelarga tegishli,
 *  Socket.IO namespace'lariga emas — qarang: lib/socket.js). */
export const API_BASE = `${API_HOST}/api/v1`;

const ACCESS_KEY = "screenctl:access-token";
const REFRESH_KEY = "screenctl:refresh-token";

export function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens({ accessToken, refreshToken }) {
  if (accessToken) {
    localStorage.setItem(ACCESS_KEY, accessToken);
  }

  if (refreshToken) {
    localStorage.setItem(REFRESH_KEY, refreshToken);
  }
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

// AuthProvider shu eventni tinglab,
// refresh muvaffaqiyatsiz bo'lganda user holatini tozalaydi.
function emitLoggedOut() {
  window.dispatchEvent(new Event("screenctl:logged-out"));
}

let refreshPromise = null;

/**
 * Backend API uchun umumiy headerlar.
 *
 * Authorization:
 *   Access token mavjud bo'lsa yuboriladi. Autentifikatsiya to'liq
 *   JWT (access/refresh token) orqali — statik API key endi yo'q.
 */
function getApiHeaders(extraHeaders = {}) {
  return {
    "Content-Type": "application/json",
    ...extraHeaders,
  };
}

/**
 * Access token bilan request headerlarini tayyorlaydi.
 */
function getRequestHeaders(extraHeaders = {}) {
  const headers = getApiHeaders(extraHeaders);

  const accessToken = getAccessToken();

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return headers;
}

/**
 * Refresh token orqali access tokenni yangilash.
 *
 * Bir vaqtning o'zida bir nechta request 401 qaytarsa,
 * faqat bitta refresh request yuboriladi.
 */
async function tryRefresh() {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    return false;
  }

  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: getApiHeaders(),
      body: JSON.stringify({
        refreshToken,
      }),
    })
        .then(async (res) => {
          const text = await res.text();

          let data = null;

          if (text) {
            try {
              data = JSON.parse(text);
            } catch {
              data = null;
            }
          }

          if (!res.ok) {
            return null;
          }

          return data;
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

/**
 * Asosiy API request funksiyasi.
 */
async function request(path, opts = {}, _retried = false) {
  const headers = getRequestHeaders(opts.headers || {});

  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers,
  });

  // Response body'ni avval text sifatida o'qiymiz.
  // Bu 204 yoki bo'sh 200 response'larda JSON parse xatosini oldini oladi.
  const text = await res.text();

  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  /**
   * Access token expired bo'lsa:
   *
   * 1. refresh token orqali yangi token olamiz
   * 2. original request'ni qayta yuboramiz
   */
  if (
      res.status === 401 &&
      !_retried &&
      !path.startsWith("/auth/") &&
      getRefreshToken()
  ) {
    const refreshed = await tryRefresh();

    if (refreshed) {
      return request(path, opts, true);
    }
  }

  if (!res.ok) {
    const message =
        data?.message || `${res.status} ${res.statusText}`;

    throw new Error(
        Array.isArray(message)
            ? message.join(", ")
            : message
    );
  }

  return data;
}

export const api = {
  // ============================================================
  // AUTH
  // ============================================================

  auth: {
    register: (email, password, name) =>
        request("/auth/register", {
          method: "POST",
          body: JSON.stringify({
            email,
            password,
            name,
          }),
        }),

    login: (email, password) =>
        request("/auth/login", {
          method: "POST",
          body: JSON.stringify({
            email,
            password,
          }),
        }),

    logout: () => {
      const refreshToken = getRefreshToken();

      clearTokens();

      if (!refreshToken) {
        return Promise.resolve({
          loggedOut: true,
        });
      }

      return request("/auth/logout", {
        method: "POST",
        body: JSON.stringify({
          refreshToken,
        }),
      }).catch(() => ({}));
    },

    me: () => request("/auth/me"),
  },

  // ============================================================
  // SYSTEM
  // ============================================================

  system: {
    overview: () => request("/system"),
  },

  // ============================================================
  // TEMPLATES
  // ============================================================

  templates: {
    list: () =>
        request("/templates"),

    get: async (id) => {
      const all = await request("/templates");

      const found = all.find((t) => t.id === id);

      if (!found) {
        throw new Error(`Template "${id}" not found`);
      }

      return found;
    },

    public: (q = "") =>
        request(
            `/templates/public${
                q ? `?q=${encodeURIComponent(q)}` : ""
            }`
        ),

    setVisibility: (id, isPublic) =>
        request(`/templates/${id}/visibility`, {
          method: "PUT",
          body: JSON.stringify({
            isPublic,
          }),
        }),

    sync: () =>
        request("/templates/sync", {
          method: "POST",
        }),

    create: (payload) =>
        request("/templates", {
          method: "POST",
          body: JSON.stringify(payload),
        }),

    files: {
      list: (id) =>
          request(`/templates/${id}/files`),

      read: (id, fileName) =>
          request(`/templates/${id}/files/${fileName}`),

      write: (id, fileName, content) =>
          request(`/templates/${id}/files/${fileName}`, {
            method: "PUT",
            body: JSON.stringify({
              content,
            }),
          }),
    },

    versions: {
      list: (id) =>
          request(`/templates/${id}/versions`),

      restore: (id, version) =>
          request(
              `/templates/${id}/versions/${version}/restore`,
              {
                method: "POST",
              }
          ),
    },
  },

  // ============================================================
  // JOBS
  // ============================================================

  jobs: {
    list: (page = 1, limit = 10) =>
        request(
            `/jobs?page=${page}&limit=${limit}`
        ),

    get: (id) =>
        request(`/jobs/${id}`),

    logs: (id) =>
        request(`/jobs/${id}/logs`),

    create: (templateSlug, action, args = {}) =>
        request("/jobs", {
          method: "POST",
          body: JSON.stringify({
            templateSlug,
            action,
            args,
          }),
        }),
  },

  // ============================================================
  // SCHEDULES
  // ============================================================

  schedules: {
    list: () =>
        request("/schedules"),

    create: (
        templateSlug,
        action,
        cron,
        args = {}
    ) =>
        request("/schedules", {
          method: "POST",
          body: JSON.stringify({
            templateSlug,
            action,
            cron,
            args,
          }),
        }),

    setEnabled: (id, enabled) =>
        request(`/schedules/${id}/enabled`, {
          method: "PATCH",
          body: JSON.stringify({
            enabled,
          }),
        }),

    remove: (id) =>
        request(`/schedules/${id}`, {
          method: "DELETE",
        }),
  },

  // ============================================================
  // DEVICES
  // ============================================================

  devices: {
    list: () =>
        request("/devices"),

    activeCount: () =>
        request("/devices/active-count"),
  },

  // ============================================================
  // APPS
  // ============================================================

  apps: {
    list: () =>
        request("/apps"),

    get: (id) =>
        request(`/apps/${id}`),

    create: (name) =>
        request("/apps", {
          method: "POST",
          body: JSON.stringify({
            name,
          }),
        }),

    updateTags: (id, tags) =>
        request(`/apps/${id}/tags`, {
          method: "PATCH",
          body: JSON.stringify({
            tags,
          }),
        }),

    remove: (id) =>
        request(`/apps/${id}`, {
          method: "DELETE",
        }),
  },

  organizations: {
    list: () =>
        request("/organizations"),

    get: (id) =>
        request(`/organizations/${id}`),

    create: (name) =>
        request("/organizations", {
          method: "POST",
          body: JSON.stringify({ name }),
        }),

    remove: (id) =>
        request(`/organizations/${id}`, {
          method: "DELETE",
        }),

    listMembers: (id) =>
        request(`/organizations/${id}/members`),

    inviteMember: (id, email, role) =>
        request(`/organizations/${id}/members`, {
          method: "POST",
          body: JSON.stringify({ email, role }),
        }),

    updateMemberRole: (id, memberId, role) =>
        request(`/organizations/${id}/members/${memberId}/role`, {
          method: "PATCH",
          body: JSON.stringify({ role }),
        }),

    removeMember: (id, memberId) =>
        request(`/organizations/${id}/members/${memberId}`, {
          method: "DELETE",
        }),
  },

  // AUDIT LOGS
  // ============================================================

  auditLogs: {
    list: (limit = 50) =>
        request(`/audit-logs?limit=${limit}`),
  },
};