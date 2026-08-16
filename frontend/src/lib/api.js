export const API_BASE = "http://localhost:3000";

async function request(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  if (res.status === 204) return null;
  return res.json();
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
  },
  jobs: {
    list: () => request("/jobs"),
    get: (id) => request(`/jobs/${id}`),
    logs: (id) => request(`/jobs/${id}/logs`),
    create: (templateSlug, action, args = {}) =>
      request("/jobs", {
        method: "POST",
        body: JSON.stringify({ templateSlug, action, args }),
      }),
  },
};
