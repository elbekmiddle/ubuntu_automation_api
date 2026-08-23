const config = require('./config');
const EXIT = require('./exit-codes');

let refreshing = null;

async function tryRefresh() {
  const {
    apiUrl,
    refreshToken,
  } = config.load();

  const apiBase = `${apiUrl.replace(/\/+$/, '')}/api/v1`;

  if (!refreshToken) {
    return false;
  }

  if (!refreshing) {
    refreshing = fetch(`${apiBase}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refreshToken,
      }),
    })
        .then((res) => {
          if (!res.ok) {
            return null;
          }

          return res.json();
        })
        .catch(() => null)
        .finally(() => {
          refreshing = null;
        });
  }

  const data = await refreshing;

  if (!data?.accessToken) {
    config.clearTokens();
    return false;
  }

  config.setTokens(data);

  return true;
}

async function request(
    pathname,
    opts = {},
    _retried = false,
) {
  const {
    apiUrl,
    accessToken,
  } = config.load();

  const apiBase = `${apiUrl.replace(/\/+$/, '')}/api/v1`;

  const headers = {
    'Content-Type': 'application/json',

    ...(opts.headers || {}),
  };

  // User authentication uchun
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  let res;

  try {
    res = await fetch(
        `${apiBase}${pathname}`,
        {
          ...opts,
          headers,
        },
    );
  } catch (err) {
    const e = new Error(
        `API'ga ulanib bo'lmadi: ${apiBase} (${err.message})`,
    );

    e.cause = err;
    e.exitCode = EXIT.NETWORK_ERROR;

    throw e;
  }

  const text = await res.text();

  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  // Access token expired
  if (
      res.status === 401 &&
      !_retried &&
      !pathname.startsWith('/auth/')
  ) {
    const refreshed = await tryRefresh();

    if (refreshed) {
      return request(
          pathname,
          opts,
          true,
      );
    }
  }

  if (!res.ok) {
    const message =
        data?.message ||
        `${res.status} ${res.statusText}`;

    const err = new Error(
        Array.isArray(message)
            ? message.join(', ')
            : message,
    );

    if (res.status === 401) {
      err.exitCode = EXIT.AUTH_ERROR;
    } else if (res.status === 403) {
      err.exitCode =
          EXIT.PERMISSION_DENIED;
    } else {
      err.exitCode =
          EXIT.GENERAL_ERROR;
    }

    err.statusCode = res.status;

    throw err;
  }

  return data;
}

module.exports = {
  request,

  auth: {
    login: (email, password) =>
        request('/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            email,
            password,
          }),
        }),

    register: (
        email,
        password,
        name,
    ) =>
        request('/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            email,
            password,
            name,
          }),
        }),

    logout: (refreshToken) =>
        request('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({
            refreshToken,
          }),
        }),

    me: () =>
        request('/auth/me'),
  },

  templates: {
    list: () =>
        request('/templates'),

    public: (q) =>
        request(
            `/templates/public${
                q
                    ? `?q=${encodeURIComponent(q)}`
                    : ''
            }`,
        ),

    create: (payload) =>
        request('/templates', {
          method: 'POST',
          body: JSON.stringify(payload),
        }),
  },

  jobs: {
    list: (
        page = 1,
        limit = 10,
    ) =>
        request(
            `/jobs?page=${page}&limit=${limit}`,
        ),

    get: (id) =>
        request(`/jobs/${id}`),

    logs: (id) =>
        request(`/jobs/${id}/logs`),

    create: (
        templateSlug,
        action,
        args = {},
    ) =>
        request('/jobs', {
          method: 'POST',
          body: JSON.stringify({
            templateSlug,
            action,
            args,
          }),
        }),
  },

  schedules: {
    list: () =>
        request('/schedules'),
  },

  devices: {
    list: () =>
        request('/devices'),
  },

  auditLogs: {
    list: (limit = 20) =>
        request(
            `/audit-logs?limit=${limit}`,
        ),
  },

  system: {
    overview: () =>
        request('/system'),
  },
};