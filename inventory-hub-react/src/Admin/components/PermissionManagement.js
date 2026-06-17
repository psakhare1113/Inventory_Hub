import React, { useState, useEffect } from "react";

const AUTH_URL = "http://localhost:9999/api/auth";

const getAdminToken = () =>
  sessionStorage.getItem("adminToken") || localStorage.getItem("authToken") || localStorage.getItem("token");

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getAdminToken()}`,
});

// ─── Known roles styling ────────────────────────────────────────────────────
// Navi role add zali tar ROLE_STYLES madhe add kara - baaki sagla automatic
const ROLE_STYLES = {
  ADMIN:        { label: "Admin",        emoji: "👑", bg: "#fef3c7", color: "#92400e", border: "#fcd34d" },
  USER:         { label: "User",         emoji: "👤", bg: "#eff6ff", color: "#1e40af", border: "#93c5fd" },
  DELIVERY_BOY: { label: "Delivery Boy", emoji: "🚚", bg: "#f0fdf4", color: "#166534", border: "#86efac" },
  // Future roles - auto-styled with fallback colors
  MANAGER:      { label: "Manager",      emoji: "🧑‍💼", bg: "#fdf4ff", color: "#7e22ce", border: "#d8b4fe" },
  WAREHOUSE_STAFF: { label: "Warehouse", emoji: "🏭", bg: "#fff7ed", color: "#c2410c", border: "#fdba74" },
  SUPPORT:      { label: "Support",      emoji: "🎧", bg: "#f0f9ff", color: "#0369a1", border: "#7dd3fc" },
  ACCOUNTANT:   { label: "Accountant",   emoji: "📊", bg: "#f0fdf4", color: "#15803d", border: "#86efac" },
};

// Fallback palette for unknown future roles
const FALLBACK_COLORS = [
  { bg: "#fdf2f8", color: "#9d174d", border: "#f9a8d4" },
  { bg: "#ecfeff", color: "#0e7490", border: "#67e8f9" },
  { bg: "#fefce8", color: "#a16207", border: "#fde047" },
  { bg: "#f8fafc", color: "#475569", border: "#cbd5e1" },
  { bg: "#fff1f2", color: "#be123c", border: "#fda4af" },
  { bg: "#f0fdf4", color: "#166534", border: "#86efac" },
];

// Get role meta - known role tar predefined, unknown tar auto-generate
const getRoleMeta = (role, index = 0) => {
  if (ROLE_STYLES[role]) return ROLE_STYLES[role];
  const fallback = FALLBACK_COLORS[index % FALLBACK_COLORS.length];
  const label = role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return { label, emoji: "🔐", ...fallback };
};

const RESOURCE_META = {
  PRODUCT:   { emoji: "📦", bg: "#f5f3ff", color: "#6d28d9", border: "#c4b5fd" },
  ORDER:     { emoji: "🛒", bg: "#eff6ff", color: "#1d4ed8", border: "#93c5fd" },
  INVENTORY: { emoji: "🏭", bg: "#fff7ed", color: "#c2410c", border: "#fdba74" },
  USER:      { emoji: "👥", bg: "#fdf2f8", color: "#9d174d", border: "#f9a8d4" },
  PAYMENT:   { emoji: "\uD83D\uDCB3", bg: "#f0fdf4", color: "#15803d", border: "#86efac" },
  SHIPPING:  { emoji: "🚚", bg: "#ecfeff", color: "#0e7490", border: "#67e8f9" },
  WAREHOUSE: { emoji: "🏗️", bg: "#fefce8", color: "#a16207", border: "#fde047" },
  REPORT:    { emoji: "📊", bg: "#f8fafc", color: "#475569", border: "#cbd5e1" },
};

const ACTION_META = {
  CREATE:   { emoji: "➕", color: "#16a34a" },
  READ:     { emoji: "��️", color: "#2563eb" },
  UPDATE:   { emoji: "✏️", color: "#d97706" },
  DELETE:   { emoji: "🗑️", color: "#dc2626" },
  APPROVE:  { emoji: "✅", color: "#16a34a" },
  CANCEL:   { emoji: "❌", color: "#dc2626" },
  ADJUST:   { emoji: "🔧", color: "#7c3aed" },
  REFUND:   { emoji: "💰", color: "#0891b2" },
  ASSIGN:   { emoji: "📌", color: "#d97706" },
  TRANSFER: { emoji: "🔄", color: "#7c3aed" },
  VIEW:     { emoji: "👁️", color: "#2563eb" },
  EXPORT:   { emoji: "📤", color: "#0891b2" },
  BLOCK:    { emoji: "🚫", color: "#dc2626" },
};

export default function PermissionManagement() {
  const [permissions, setPermissions] = useState([]);
  const [roles, setRoles] = useState(["ADMIN", "USER", "DELIVERY_BOY"]); // dynamic - backend madhun fetch hoto
  const [rolePerms, setRolePerms] = useState({});
  const [activeRole, setActiveRole] = useState("USER");
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState("");
  const [loginStats, setLoginStats] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddRole, setShowAddRole] = useState(false);
  const [newPerm, setNewPerm] = useState({ name: "", description: "", resource: "", action: "" });
  const [newRoleName, setNewRoleName] = useState("");

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      // 1. All permissions fetch karo
      const permRes = await fetch(`${AUTH_URL}/permissions`, { headers: authHeaders() });
      const allPerms = permRes.ok ? await permRes.json() : [];
      setPermissions(allPerms);

      // 2. Roles dynamically detect karo - role_permissions table madhun unique roles
      // Backend la /roles endpoint nahi tar existing roles use karo
      let detectedRoles = ["ADMIN", "USER", "DELIVERY_BOY"]; // default
      try {
        const rolesRes = await fetch(`${AUTH_URL}/roles`, { headers: authHeaders() });
        if (rolesRes.ok) {
          const rolesData = await rolesRes.json();
          if (Array.isArray(rolesData) && rolesData.length > 0) {
            detectedRoles = rolesData;
          }
        }
      } catch (_) {
        // /roles endpoint nahi tar default use karo - no problem
      }
      setRoles(detectedRoles);

      // 3. Har role sathi permissions fetch karo
      const roleData = {};
      await Promise.all(
        detectedRoles.map(async (role) => {
          const r = await fetch(`${AUTH_URL}/permissions/role/${role}`, { headers: authHeaders() });
          const d = r.ok ? await r.json() : { permissions: [] };
          roleData[role] = d.permissions || [];
        })
      );
      setRolePerms(roleData);

      // 4. Login stats
      const statsRes = await fetch(`${AUTH_URL}/admin/login-stats?days=7`, { headers: authHeaders() });
      if (statsRes.ok) setLoginStats(await statsRes.json());

    } catch (e) {
      showToast("Failed to load: " + e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const hasPermission = (permName) => rolePerms[activeRole]?.includes(permName);

  const togglePerm = async (perm) => {
    const has = hasPermission(perm.name);
    setSaving(perm.id);
    try {
      const url = has
        ? `${AUTH_URL}/permissions/remove?role=${activeRole}&permissionId=${perm.id}`
        : `${AUTH_URL}/permissions/assign?role=${activeRole}&permissionId=${perm.id}`;
      const res = await fetch(url, { method: has ? "DELETE" : "POST", headers: authHeaders() });
      if (res.ok) {
        setRolePerms((prev) => ({
          ...prev,
          [activeRole]: has
            ? prev[activeRole].filter((p) => p !== perm.name)
            : [...prev[activeRole], perm.name],
        }));
        showToast(`${has ? "Removed" : "Granted"}: ${perm.name}`);
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Failed", "error");
      }
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setSaving(null);
    }
  };

  const createPermission = async () => {
    if (!newPerm.name || !newPerm.resource || !newPerm.action) {
      showToast("Name, Resource, Action required!", "error");
      return;
    }
    try {
      const res = await fetch(`${AUTH_URL}/permissions`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(newPerm),
      });
      if (res.ok) {
        showToast("Permission created!");
        setNewPerm({ name: "", description: "", resource: "", action: "" });
        setShowAddForm(false);
        fetchAll();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Failed", "error");
      }
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  const grouped = permissions.reduce((acc, p) => {
    if (!acc[p.resource]) acc[p.resource] = [];
    acc[p.resource].push(p);
    return acc;
  }, {});

  const filteredGroups = Object.entries(grouped).filter(([res, perms]) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return res.toLowerCase().includes(q) || perms.some((p) => p.name.toLowerCase().includes(q));
  });

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", flexDirection: "column", gap: 16 }}>
        <div style={{ width: 48, height: 48, border: "4px solid #e9d5ff", borderTopColor: "#7c3aed", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <p style={{ color: "#6b7280", fontSize: 15 }}>Loading permissions...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const roleMeta = getRoleMeta(activeRole, roles.indexOf(activeRole));
  const roleCount = rolePerms[activeRole]?.length || 0;

  return (
    <div style={{ padding: "24px", maxWidth: 1100, margin: "0 auto", fontFamily: "Inter, sans-serif" }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 9999,
          padding: "12px 20px", borderRadius: 12,
          background: toast.type === "error" ? "#ef4444" : "#22c55e",
          color: "#fff", fontWeight: 600, fontSize: 14,
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          display: "flex", alignItems: "center", gap: 8,
          animation: "slideIn 0.3s ease"
        }}>
          {toast.type === "error" ? "❌" : "✅"} {toast.msg}
        </div>
      )}

      {/* Page Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg, #7c3aed, #a855f7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
            🔑
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: 0 }}>Permission Management</h1>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "2px 0 0" }}>Control who can do what in your application</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={fetchAll} style={{ padding: "8px 16px", border: "1px solid #e5e7eb", borderRadius: 10, background: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
            🔄 Refresh
          </button>
          <button onClick={() => setShowAddForm(!showAddForm)} style={{ padding: "8px 16px", border: "none", borderRadius: 10, background: "linear-gradient(135deg, #7c3aed, #a855f7)", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
            ➕ New Permission
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Total Permissions", value: permissions.length, color: "#7c3aed", bg: "#f5f3ff", emoji: "🔑" },
          { label: `${roleMeta.label} Has`, value: roleCount, color: "#2563eb", bg: "#eff6ff", emoji: roleMeta.emoji },
          { label: "Logins (7 days)", value: loginStats["SUCCESS"] || 0, color: "#16a34a", bg: "#f0fdf4", emoji: "✅" },
          { label: "Failed Logins", value: loginStats["FAILED"] || 0, color: "#dc2626", bg: "#fef2f2", emoji: "❌" },
        ].map((s) => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 14, padding: "16px 20px", border: `1px solid ${s.color}22` }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{s.emoji}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Add Permission Form */}
      {showAddForm && (
        <div style={{ background: "#fff", border: "2px solid #e9d5ff", borderRadius: 16, padding: 20, marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: "#374151", marginBottom: 14 }}>➕ Create New Permission</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {[
              { key: "name", label: "Name *", placeholder: "PRODUCT_EXPORT", upper: true },
              { key: "resource", label: "Resource *", placeholder: "PRODUCT", upper: true },
              { key: "action", label: "Action *", placeholder: "EXPORT", upper: true },
              { key: "description", label: "Description", placeholder: "Export products to CSV", upper: false },
            ].map((f) => (
              <div key={f.key}>
                <label style={{ fontSize: 12, fontWeight: 500, color: "#6b7280", display: "block", marginBottom: 4 }}>{f.label}</label>
                <input
                  value={newPerm[f.key]}
                  onChange={(e) => setNewPerm((p) => ({ ...p, [f.key]: f.upper ? e.target.value.toUpperCase().replace(/\s/g, "_") : e.target.value }))}
                  placeholder={f.placeholder}
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" }}
                />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button onClick={createPermission} style={{ padding: "8px 20px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
              Create
            </button>
            <button onClick={() => setShowAddForm(false)} style={{ padding: "8px 20px", background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Role Tabs */}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", padding: 20, marginBottom: 20 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 12 }}>📋 Select Role to Manage Permissions:</p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {roles.map((role, idx) => {
            const m = getRoleMeta(role, idx);
            const isActive = activeRole === role;
            const count = rolePerms[role]?.length || 0;
            return (
              <button
                key={role}
                onClick={() => setActiveRole(role)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "12px 20px", borderRadius: 12, cursor: "pointer",
                  border: isActive ? `2px solid ${m.border}` : "2px solid #e5e7eb",
                  background: isActive ? m.bg : "#fafafa",
                  transition: "all 0.2s",
                }}
              >
                <span style={{ fontSize: 20 }}>{m.emoji}</span>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: isActive ? m.color : "#374151" }}>{m.label}</div>
                  <div style={{ fontSize: 11, color: "#9ca3af" }}>{count} permissions</div>
                </div>
                <span style={{
                  marginLeft: 4, padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                  background: isActive ? m.color : "#e5e7eb",
                  color: isActive ? "#fff" : "#6b7280",
                }}>
                  {count}/{permissions.length}
                </span>
              </button>
            );
          })}

          {/* Add New Role Button */}
          <button
            onClick={() => setShowAddRole(!showAddRole)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "12px 16px", borderRadius: 12, cursor: "pointer",
              border: "2px dashed #d1d5db", background: "#fafafa",
              color: "#6b7280", fontSize: 13, fontWeight: 500,
              transition: "all 0.2s",
            }}
          >
            ➕ Add Role
          </button>
        </div>

        {/* Add New Role Form */}
        {showAddRole && (
          <div style={{ marginTop: 14, padding: "14px 16px", background: "#f0f9ff", borderRadius: 10, border: "1px solid #bae6fd", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#0369a1" }}>🔐 New Role Name:</span>
            <input
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value.toUpperCase().replace(/\s/g, "_"))}
              placeholder="e.g. MANAGER or WAREHOUSE_STAFF"
              style={{ flex: 1, padding: "8px 12px", border: "1px solid #bae6fd", borderRadius: 8, fontSize: 13, outline: "none" }}
            />
            <button
              onClick={() => {
                if (!newRoleName.trim()) { showToast("Role name required!", "error"); return; }
                if (roles.includes(newRoleName)) { showToast("Role already exists!", "error"); return; }
                setRoles(prev => [...prev, newRoleName]);
                setRolePerms(prev => ({ ...prev, [newRoleName]: [] }));
                setActiveRole(newRoleName);
                setNewRoleName("");
                setShowAddRole(false);
                showToast(`Role "${newRoleName}" added! Now assign permissions.`);
              }}
              style={{ padding: "8px 18px", background: "#0369a1", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}
            >
              Add
            </button>
            <button
              onClick={() => { setShowAddRole(false); setNewRoleName(""); }}
              style={{ padding: "8px 14px", background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13 }}
            >
              Cancel
            </button>
            <span style={{ fontSize: 12, color: "#6b7280", fontStyle: "italic" }}>
              ℹ️ Backend madhe pan role add karaychi - auth-server restart nantara auto-sync hoil
            </span>
          </div>
        )}

        {/* Progress bar for selected role */}
        <div style={{ marginTop: 16, padding: "12px 16px", background: "#f9fafb", borderRadius: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 13, color: "#374151", fontWeight: 500 }}>
              {roleMeta.emoji} {roleMeta.label} — {roleCount} of {permissions.length} permissions granted
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: roleMeta.color }}>
              {permissions.length > 0 ? Math.round((roleCount / permissions.length) * 100) : 0}%
            </span>
          </div>
          <div style={{ height: 8, background: "#e5e7eb", borderRadius: 99, overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 99,
              background: `linear-gradient(90deg, ${roleMeta.border}, ${roleMeta.color})`,
              width: `${permissions.length > 0 ? (roleCount / permissions.length) * 100 : 0}%`,
              transition: "width 0.5s ease",
            }} />
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 20 }}>
        <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16 }}>🔍</span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search permissions by resource or name..."
          style={{ width: "100%", padding: "11px 16px 11px 42px", border: "1px solid #e5e7eb", borderRadius: 12, fontSize: 14, outline: "none", background: "#fff", boxSizing: "border-box" }}
        />
      </div>

      {/* Permission Groups */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filteredGroups.map(([resource, perms]) => {
          const rm = RESOURCE_META[resource] || { emoji: "🔑", bg: "#f9fafb", color: "#374151", border: "#e5e7eb" };
          const assignedCount = perms.filter((p) => hasPermission(p.name)).length;
          const isExpanded = expanded[resource];
          const pct = Math.round((assignedCount / perms.length) * 100);

          return (
            <div key={resource} style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              {/* Resource Header */}
              <button
                onClick={() => setExpanded((prev) => ({ ...prev, [resource]: !prev[resource] }))}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  {/* Resource Badge */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 10, background: rm.bg, border: `1px solid ${rm.border}` }}>
                    <span style={{ fontSize: 18 }}>{rm.emoji}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: rm.color }}>{resource}</span>
                  </div>
                  {/* Count */}
                  <span style={{ fontSize: 13, color: "#6b7280" }}>
                    <strong style={{ color: assignedCount === perms.length ? "#16a34a" : assignedCount === 0 ? "#dc2626" : "#374151" }}>{assignedCount}</strong>
                    /{perms.length} granted to {roleMeta.label}
                  </span>
                  {assignedCount === perms.length && <span style={{ fontSize: 12, color: "#16a34a", fontWeight: 600 }}>✅ Full Access</span>}
                  {assignedCount === 0 && <span style={{ fontSize: 12, color: "#dc2626", fontWeight: 600 }}>🔒 No Access</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {/* Mini progress */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 80, height: 6, background: "#e5e7eb", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? "#22c55e" : pct === 0 ? "#e5e7eb" : "#7c3aed", borderRadius: 99, transition: "width 0.4s" }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", minWidth: 32 }}>{pct}%</span>
                  </div>
                  <span style={{ fontSize: 18, color: "#9ca3af" }}>{isExpanded ? "▲" : "▼"}</span>
                </div>
              </button>

              {/* Permission Rows */}
              {isExpanded && (
                <div style={{ borderTop: "1px solid #f3f4f6" }}>
                  {perms.map((perm, idx) => {
                    const has = hasPermission(perm.name);
                    const am = ACTION_META[perm.action] || { emoji: "🔑", color: "#374151" };
                    const isSaving = saving === perm.id;

                    return (
                      <div
                        key={perm.id}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "14px 20px",
                          background: has ? "#f0fdf4" : idx % 2 === 0 ? "#fafafa" : "#fff",
                          borderBottom: idx < perms.length - 1 ? "1px solid #f3f4f6" : "none",
                          transition: "background 0.2s",
                        }}
                      >
                        {/* Left: Permission info */}
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                          <div style={{ width: 38, height: 38, borderRadius: 10, background: has ? "#dcfce7" : "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                            {am.emoji}
                          </div>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{perm.name}</div>
                            <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 1 }}>
                              {perm.description || `${perm.action} access on ${perm.resource}`}
                            </div>
                          </div>
                        </div>

                        {/* Right: Status + Toggle */}
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                          <span style={{
                            padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                            background: has ? "#dcfce7" : "#fee2e2",
                            color: has ? "#15803d" : "#dc2626",
                          }}>
                            {has ? "✅ Granted" : "🔒 Denied"}
                          </span>

                          {activeRole === "ADMIN" ? (
                            <span style={{ fontSize: 12, color: "#9ca3af", fontStyle: "italic", minWidth: 60 }}>Always on</span>
                          ) : (
                            <button
                              onClick={() => togglePerm(perm)}
                              disabled={isSaving}
                              style={{
                                width: 52, height: 28, borderRadius: 99, border: "none", cursor: isSaving ? "wait" : "pointer",
                                background: has ? "#22c55e" : "#d1d5db",
                                position: "relative", transition: "background 0.3s",
                                opacity: isSaving ? 0.6 : 1,
                              }}
                            >
                              <span style={{
                                position: "absolute", top: 3, width: 22, height: 22, borderRadius: "50%",
                                background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
                                transition: "left 0.3s",
                                left: has ? 27 : 3,
                              }} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary Table */}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", overflow: "hidden", marginTop: 24 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #f3f4f6", background: "#f9fafb", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>📊</span>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: 0 }}>All Roles — Permission Matrix</h3>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                <th style={{ textAlign: "left", padding: "12px 20px", color: "#6b7280", fontWeight: 600, borderBottom: "1px solid #e5e7eb" }}>Permission</th>
                {roles.map((r, idx) => {
                  const rm = getRoleMeta(r, idx);
                  return (
                    <th key={r} style={{ textAlign: "center", padding: "12px 20px", color: "#6b7280", fontWeight: 600, borderBottom: "1px solid #e5e7eb" }}>
                      {rm.emoji} {rm.label}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {permissions
                .filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()))
                .map((perm, idx) => {
                  const am = ACTION_META[perm.action] || { emoji: "🔑" };
                  return (
                    <tr key={perm.id} style={{ background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={{ padding: "10px 20px", borderBottom: "1px solid #f3f4f6" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 16 }}>{am.emoji}</span>
                          <div>
                            <div style={{ fontWeight: 600, color: "#111827" }}>{perm.name}</div>
                            <div style={{ fontSize: 11, color: "#9ca3af" }}>{perm.resource} → {perm.action}</div>
                          </div>
                        </div>
                      </td>
                      {roles.map((role) => (
                        <td key={role} style={{ textAlign: "center", padding: "10px 20px", borderBottom: "1px solid #f3f4f6" }}>
                          {rolePerms[role]?.includes(perm.name)
                            ? <span style={{ fontSize: 18 }}>✅</span>
                            : <span style={{ fontSize: 18, opacity: 0.3 }}>⭕</span>
                          }
                        </td>
                      ))}
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        @keyframes slideIn { from { transform: translateX(100px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        button:hover { opacity: 0.9; }
      `}</style>
    </div>
  );
}
