const { useEffect, useMemo, useState } = React;

const API_BASE = localStorage.getItem("hireasy_api_base") || "http://localhost:5050";
const tabs = ["Dashboard", "Users", "Documents", "Jobs", "Applications", "Audit Logs"];

function api(path, options = {}) {
  const token = localStorage.getItem("hireasy_admin_token");
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  }).then(async (response) => {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "Request failed");
    return data;
  });
}

function statusPill(value) {
  return React.createElement("span", { className: `pill ${value || ""}` }, value || "-");
}

async function downloadDocument(userId) {
  const token = localStorage.getItem("hireasy_admin_token");
  const response = await fetch(`${API_BASE}/api/admin/users/${userId}/document/download`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    alert(data.message || "Download failed");
    return;
  }
  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition") || "";
  const match = disposition.match(/filename="?([^"]+)"?/i);
  const filename = match?.[1] || "document";
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function App() {
  const [token, setToken] = useState(localStorage.getItem("hireasy_admin_token"));
  const [active, setActive] = useState("Dashboard");

  if (!token) return React.createElement(Login, { onLogin: setToken });

  return React.createElement(
    "div",
    { className: "shell" },
    React.createElement(
      "aside",
      { className: "sidebar" },
      React.createElement("p", { className: "brand" }, "Hireasy Admin"),
      React.createElement(
        "nav",
        { className: "nav" },
        tabs.map((tab) =>
          React.createElement(
            "button",
            {
              key: tab,
              className: active === tab ? "active" : "",
              onClick: () => setActive(tab),
            },
            tab
          )
        )
      )
    ),
    React.createElement(
      "main",
      { className: "main" },
      React.createElement(
        "div",
        { className: "topbar" },
        React.createElement("h1", null, active),
        React.createElement(
          "button",
          {
            onClick: () => {
              localStorage.removeItem("hireasy_admin_token");
              setToken("");
            },
          },
          "Logout"
        )
      ),
      active === "Dashboard" && React.createElement(Dashboard),
      active === "Users" && React.createElement(Users),
      active === "Documents" && React.createElement(Documents),
      active === "Jobs" && React.createElement(Jobs),
      active === "Applications" && React.createElement(Applications),
      active === "Audit Logs" && React.createElement(AuditLogs)
    )
  );
}

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      const data = await api("/api/admin/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem("hireasy_admin_token", data.token);
      onLogin(data.token);
    } catch (err) {
      setError(err.message);
    }
  }

  return React.createElement(
    "form",
    { className: "login stack", onSubmit: submit },
    React.createElement("h1", null, "Hireasy Admin"),
    React.createElement("input", {
      placeholder: "Email",
      value: email,
      onChange: (event) => setEmail(event.target.value),
    }),
    React.createElement("input", {
      placeholder: "Password",
      type: "password",
      value: password,
      onChange: (event) => setPassword(event.target.value),
    }),
    error && React.createElement("p", { className: "error" }, error),
    React.createElement("button", { className: "primary" }, "Login")
  );
}

function Dashboard() {
  const [data, setData] = useState(null);
  useEffect(() => {
    api("/api/admin/dashboard").then((response) => setData(response.data));
  }, []);
  if (!data) return React.createElement("p", null, "Loading...");
  return React.createElement(
    "div",
    { className: "grid" },
    Object.entries(data.counts).map(([label, value]) =>
      React.createElement(
        "div",
        { className: "metric", key: label },
        React.createElement("span", null, label.replace(/([A-Z])/g, " $1")),
        React.createElement("strong", null, value)
      )
    )
  );
}

function useList(path, deps = []) {
  const [state, setState] = useState({ rows: [], loading: true, error: "" });
  useEffect(() => {
    setState((current) => ({ ...current, loading: true }));
    api(path)
      .then((response) => setState({ rows: response.data || [], loading: false, error: "" }))
      .catch((error) => setState({ rows: [], loading: false, error: error.message }));
  }, deps);
  return state;
}

function Users() {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const path = useMemo(() => {
    const params = new URLSearchParams();
    if (query) params.set("search", query);
    if (role) params.set("role", role);
    if (status) params.set("status", status);
    return `/api/admin/users?${params.toString()}`;
  }, [query, role, status]);
  const { rows, loading, error } = useList(path, [path]);

  async function setUserStatus(id, nextStatus) {
    await api(`/api/admin/users/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: nextStatus }),
    });
    location.reload();
  }

  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      "div",
      { className: "toolbar" },
      React.createElement("input", { placeholder: "Search", value: query, onChange: (e) => setQuery(e.target.value) }),
      React.createElement("select", { value: role, onChange: (e) => setRole(e.target.value) },
        React.createElement("option", { value: "" }, "All roles"),
        React.createElement("option", { value: "user" }, "Workers"),
        React.createElement("option", { value: "company" }, "Companies"),
        React.createElement("option", { value: "admin" }, "Admins")
      ),
      React.createElement("select", { value: status, onChange: (e) => setStatus(e.target.value) },
        React.createElement("option", { value: "" }, "All statuses"),
        ["pending", "verified", "rejected", "blocked", "suspended"].map((item) => React.createElement("option", { key: item, value: item }, item))
      )
    ),
    React.createElement(Table, {
      loading,
      error,
      columns: ["Name", "Email", "Role", "Status", "Actions"],
      rows: rows.map((user) => [
        user.companyName || `${user.firstName || ""} ${user.lastName || ""}`.trim() || "-",
        user.email,
        user.role,
        statusPill(user.status),
        React.createElement("div", { className: "actions" },
          React.createElement("button", { onClick: () => setUserStatus(user._id, "verified") }, "Verify"),
          React.createElement("button", { onClick: () => setUserStatus(user._id, "blocked") }, "Block"),
          React.createElement("button", { onClick: () => downloadDocument(user._id) }, "Doc")
        ),
      ]),
    })
  );
}

function Documents() {
  const { rows, loading, error } = useList("/api/admin/documents/pending", []);
  async function approve(id) {
    await api(`/api/admin/users/${id}/document/approve`, { method: "PATCH", body: "{}" });
    location.reload();
  }
  async function reject(id) {
    const reason = prompt("Rejection reason");
    if (!reason) return;
    await api(`/api/admin/users/${id}/document/reject`, { method: "PATCH", body: JSON.stringify({ reason }) });
    location.reload();
  }
  return React.createElement(Table, {
    loading,
    error,
    columns: ["Owner", "Role", "Document", "Uploaded", "Actions"],
    rows: rows.map((user) => [
      user.companyName || `${user.firstName || ""} ${user.lastName || ""}`.trim(),
      user.role,
      user.document?.originalName || "-",
      user.document?.uploadedAt ? new Date(user.document.uploadedAt).toLocaleString() : "-",
      React.createElement("div", { className: "actions" },
        React.createElement("button", { onClick: () => downloadDocument(user._id) }, "Download"),
        React.createElement("button", { onClick: () => approve(user._id) }, "Approve"),
        React.createElement("button", { className: "danger", onClick: () => reject(user._id) }, "Reject")
      ),
    ]),
  });
}

function Jobs() {
  const [status, setStatus] = useState("");
  const path = status ? `/api/admin/jobs?status=${status}` : "/api/admin/jobs";
  const { rows, loading, error } = useList(path, [path]);
  async function update(id, nextStatus) {
    await api(`/api/admin/jobs/${id}/status`, { method: "PATCH", body: JSON.stringify({ status: nextStatus }) });
    location.reload();
  }
  return React.createElement(
    React.Fragment,
    null,
    React.createElement("div", { className: "toolbar" },
      React.createElement("select", { value: status, onChange: (e) => setStatus(e.target.value) },
        React.createElement("option", { value: "" }, "All job statuses"),
        ["pending", "open", "verified", "rejected", "closed", "filled", "cancelled"].map((item) => React.createElement("option", { key: item, value: item }, item))
      )
    ),
    React.createElement(Table, {
      loading,
      error,
      columns: ["Role", "Company", "Location", "Date", "Status", "Actions"],
      rows: rows.map((job) => [
        (job.roleType || []).join(", "),
        job.companyId?.companyName || "-",
        (job.location || []).join(", "),
        job.job_date ? new Date(job.job_date).toLocaleDateString() : "-",
        statusPill(job.status),
        React.createElement("div", { className: "actions" },
          React.createElement("button", { onClick: () => update(job._id, "verified") }, "Approve"),
          React.createElement("button", { onClick: () => update(job._id, "rejected") }, "Reject"),
          React.createElement("button", { onClick: () => update(job._id, "closed") }, "Close")
        ),
      ]),
    })
  );
}

function Applications() {
  const { rows, loading, error } = useList("/api/admin/applications", []);
  return React.createElement(Table, {
    loading,
    error,
    columns: ["Worker", "Job", "Company", "Status", "Applied"],
    rows: rows.map((item) => [
      `${item.worker?.firstName || ""} ${item.worker?.lastName || ""}`.trim() || item.worker?.email || "-",
      (item.job?.roleType || []).join(", "),
      item.job?.company?.companyName || "-",
      statusPill(item.status),
      item.appliedAt ? new Date(item.appliedAt).toLocaleString() : "-",
    ]),
  });
}

function AuditLogs() {
  const { rows, loading, error } = useList("/api/admin/audit-logs", []);
  return React.createElement(Table, {
    loading,
    error,
    columns: ["Admin", "Action", "Target", "Reason", "Time"],
    rows: rows.map((log) => [
      log.adminId?.email || "-",
      log.action,
      `${log.targetType}:${log.targetId}`,
      log.reason || "-",
      log.timestamp ? new Date(log.timestamp).toLocaleString() : "-",
    ]),
  });
}

function Table({ columns, rows, loading, error }) {
  if (loading) return React.createElement("p", null, "Loading...");
  if (error) return React.createElement("p", { className: "error" }, error);
  return React.createElement(
    "div",
    { className: "table-wrap" },
    React.createElement(
      "table",
      null,
      React.createElement("thead", null, React.createElement("tr", null, columns.map((column) => React.createElement("th", { key: column }, column)))),
      React.createElement("tbody", null, rows.map((row, index) => React.createElement("tr", { key: index }, row.map((cell, cellIndex) => React.createElement("td", { key: cellIndex }, cell)))))
    )
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App));
