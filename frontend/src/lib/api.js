export const API_BASE = "http://localhost:3000";

async function request(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });

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

  if (!res.ok) {
    const message = data?.message || `${res.status} ${res.statusText}`;
    throw new Error(message);
  }
  return data;
}

export const api = {
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
  auditLogs: {
    list: (limit = 50) => request(`/audit-logs?limit=${limit}`),
  },
};
