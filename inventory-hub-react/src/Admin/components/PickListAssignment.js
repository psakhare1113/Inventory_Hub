import React, { useEffect, useState, useCallback } from "react";
import { useWarehouseSocket } from "../../services/useWarehouseSocket";
import { pushNotification } from "../../services/notificationStore";

const PICKLIST_API = "http://localhost:9999/api/warehouse/pick-lists";
const STATUS_API   = "http://localhost:9999/api/warehouse/staff-status";
const AUTH_API     = "http://localhost:9999/api/auth/warehouse/manager/staff";

const ONLINE_CFG = {
  ONLINE:  { label: 'Online',  dot: '#22c55e', color: '#16a34a', bg: '#dcfce7' },
  BUSY:    { label: 'Busy',    dot: '#f59e0b', color: '#d97706', bg: '#fef3c7' },
  OFFLINE: { label: 'Offline', dot: '#6b7280', color: '#4b5563', bg: '#f3f4f6' },
};

// ── Best available staff निवडतो: ONLINE → BUSY → skip OFFLINE ──────────────
// Tie-break: कमी active pick lists असलेला first
const getBestStaff = (staffList, liveStatuses, assignedPickLists, role) => {
  const roleStaff = staffList.filter(s => s.role === role);
  if (roleStaff.length === 0) return null;

  const activeCounts = {};
  roleStaff.forEach(s => { activeCounts[String(s.id)] = 0; });
  assignedPickLists.forEach(pl => {
    const id = role === 'PICKER'   ? String(pl.assignedPickerId)
             : role === 'PACKER'   ? String(pl.assignedPackerId)
             : String(pl.assignedShippingId);
    if (activeCounts[id] !== undefined) activeCounts[id]++;
  });

  const priority = { ONLINE: 0, BUSY: 1, OFFLINE: 2 };
  const sorted = [...roleStaff].sort((a, b) => {
    const pa = priority[liveStatuses[String(a.id)] || 'OFFLINE'] ?? 2;
    const pb = priority[liveStatuses[String(b.id)] || 'OFFLINE'] ?? 2;
    if (pa !== pb) return pa - pb;
    return (activeCounts[String(a.id)] || 0) - (activeCounts[String(b.id)] || 0);
  });

  // OFFLINE असला तरी assign करायचं — ज्याला कमी orders तो first
  // जेव्हा तो online येईल तेव्हा त्याला pick list दिसेल
  return sorted[0] || null;
};

const fullName = (s) => s ? `${s.firstName || ''} ${s.lastName || ''}`.trim() : '';

// ── Edit Assignment Modal ────────────────────────────────────────────────────
function EditAssignmentModal({ pickList, allStaff, liveStatuses, onSave, onClose, saving, saveError }) {
  const pickers  = allStaff.filter(s => s.role === 'PICKER');
  const packers  = allStaff.filter(s => s.role === 'PACKER');
  const shippers = allStaff.filter(s => s.role === 'SHIPPING');

  const [sel, setSel] = useState({
    pickerId:     pickList.assignedPickerId   ? String(pickList.assignedPickerId)   : '',
    packerId:     pickList.assignedPackerId   ? String(pickList.assignedPackerId)   : '',
    shippingId:   pickList.assignedShippingId ? String(pickList.assignedShippingId) : '',
  });

  const handleChange = (role, id) => setSel(p => ({ ...p, [role]: id }));

  const handleSave = () => {
    const picker   = allStaff.find(s => String(s.id) === sel.pickerId);
    const packer   = allStaff.find(s => String(s.id) === sel.packerId);
    const shipper  = allStaff.find(s => String(s.id) === sel.shippingId);
    onSave({
      pickerId:      picker?.id   || null, pickerName:    fullName(picker),   pickerEmail:   picker?.email   || '',
      packerId:      packer?.id   || null, packerName:    fullName(packer),   packerEmail:   packer?.email   || '',
      shippingId:    shipper?.id  || null, shippingName:  fullName(shipper),  shippingEmail: shipper?.email  || '',
    });
  };

  const canSave = sel.pickerId && sel.packerId && sel.shippingId;

  return (
    <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.55)', backdropFilter:'blur(3px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:480, boxShadow:'0 20px 60px rgba(0,0,0,0.25)', overflow:'hidden' }}>
        {/* Header */}
        <div style={{ background:'linear-gradient(135deg,#2563eb,#60a5fa)', padding:'18px 24px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ color:'#fff', fontWeight:700, fontSize:16 }}>✏️ Edit Assignment</div>
            <div style={{ color:'rgba(255,255,255,0.85)', fontSize:12, marginTop:2 }}>
              Order #{pickList.orderNumber?.slice(0,20)}…
            </div>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.2)', border:'none', borderRadius:8, color:'#fff', fontSize:18, width:32, height:32, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
        </div>

        {/* Body */}
        <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:16 }}>
          {[
            { role:'PICKER',   list:pickers,  key:'pickerId',   label:'🏃 Picker',   color:'#2563eb' },
            { role:'PACKER',   list:packers,  key:'packerId',   label:'📦 Packer',   color:'#7c3aed' },
            { role:'SHIPPING', list:shippers, key:'shippingId', label:'🚚 Shipping', color:'#ea580c' },
          ].map(({ role, list, key, label, color }) => {
            const priority = { ONLINE:0, BUSY:1, OFFLINE:2 };
            const sorted = [...list].sort((a,b) => {
              const pa = priority[liveStatuses[String(a.id)] || 'OFFLINE'] ?? 2;
              const pb = priority[liveStatuses[String(b.id)] || 'OFFLINE'] ?? 2;
              return pa - pb;
            });
            return (
              <div key={role}>
                <label style={{ display:'block', fontSize:11, fontWeight:700, color, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:6 }}>{label}</label>
                <div style={{ display:'flex', flexDirection:'column', gap:5, maxHeight:160, overflowY:'auto' }}>
                  {sorted.map(s => {
                    const st  = liveStatuses[String(s.id)] || 'OFFLINE';
                    const cfg = ONLINE_CFG[st] || ONLINE_CFG.OFFLINE;
                    const isSelected = sel[key] === String(s.id);
                    return (
                      <div key={s.id} onClick={() => handleChange(key, String(s.id))}
                        style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'7px 10px', borderRadius:8, cursor:'pointer', border:`2px solid ${isSelected ? color : '#e2e8f0'}`, background: isSelected ? `${color}0d` : '#f8fafc', transition:'all 0.12s' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ position:'relative', width:9, height:9, flexShrink:0 }}>
                            <div style={{ width:9, height:9, borderRadius:'50%', background:cfg.dot }} />
                            {st === 'ONLINE' && <div style={{ position:'absolute', inset:-3, borderRadius:'50%', border:`2px solid ${cfg.dot}`, animation:'pulse 1.5s ease-in-out infinite', opacity:0.6 }} />}
                          </div>
                          <div>
                            <div style={{ fontSize:12, fontWeight:600, color:'#1e293b' }}>{fullName(s)}</div>
                            {s.email && <div style={{ fontSize:10, color:'#94a3b8' }}>{s.email}</div>}
                          </div>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                          <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:20, color:cfg.color, background:cfg.bg }}>{cfg.label}</span>
                          {isSelected && <span style={{ fontSize:14, color, fontWeight:700 }}>✓</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ padding:'0 24px 20px', display:'flex', flexDirection:'column', gap:8 }}>
          {saveError && (
            <div style={{ padding:'8px 12px', background:'#fee2e2', border:'1px solid #fecaca', borderRadius:8, fontSize:12, color:'#dc2626' }}>
              ❌ {saveError}
            </div>
          )}
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={onClose} style={{ flex:1, padding:'10px', background:'#f1f5f9', border:'1px solid #e2e8f0', borderRadius:8, fontWeight:600, fontSize:13, color:'#64748b', cursor:'pointer' }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={!canSave || saving}
              style={{ flex:2, padding:'10px', background: canSave ? '#2563eb' : '#93c5fd', border:'none', borderRadius:8, fontWeight:700, fontSize:13, color:'#fff', cursor: canSave ? 'pointer' : 'not-allowed' }}>
              {saving ? '⏳ Saving…' : '✅ Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Status Dot ───────────────────────────────────────────────────────────────
function StatusDot({ status }) {
  const cfg = ONLINE_CFG[status] || ONLINE_CFG.OFFLINE;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5 }}>
      <span style={{ position:'relative', width:9, height:9, display:'inline-block', flexShrink:0 }}>
        <span style={{ width:9, height:9, borderRadius:'50%', background:cfg.dot, display:'block' }} />
        {status === 'ONLINE' && <span style={{ position:'absolute', inset:-3, borderRadius:'50%', border:`2px solid ${cfg.dot}`, animation:'pulse 1.5s ease-in-out infinite', opacity:0.6 }} />}
      </span>
      <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:20, color:cfg.color, background:cfg.bg }}>{cfg.label}</span>
    </span>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function PickListAssignment() {
  const [unassigned, setUnassigned]     = useState([]);
  const [assigned, setAssigned]         = useState([]);
  const [allStaff, setAllStaff]         = useState([]);
  const [liveStatuses, setLiveStatuses] = useState({});
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");
  const [success, setSuccess]           = useState("");
  const [autoAssigning, setAutoAssigning] = useState({}); // { [pickListId]: true }
  const [editModal, setEditModal]       = useState(null); // pickList object
  const [editSaving, setEditSaving]     = useState(false);
  const [editError, setEditError]       = useState(''); // modal मधला error — modal बंद होत नाही

  const pickers  = allStaff.filter(s => s.role === "PICKER");
  const packers  = allStaff.filter(s => s.role === "PACKER");
  const shippers = allStaff.filter(s => s.role === "SHIPPING");

  // 🔌 WebSocket — real-time STAFF_STATUS_CHANGE + PICK_LIST_ASSIGNED
  useWarehouseSocket({
    topics: ['/topic/warehouse/managers', '/topic/warehouse/all'],
    onMessage: (event) => {
      if (event.type === 'STAFF_STATUS_CHANGE' && event.data) {
        const { staffId, staffEmail, status } = event.data;
        if (status) {
          setLiveStatuses(prev => {
            const next = { ...prev };
            if (staffEmail) {
              setAllStaff(currentStaff => {
                const matched = currentStaff.find(s => s.email?.toLowerCase() === staffEmail.toLowerCase());
                if (matched) next[String(matched.id)] = status;
                return currentStaff;
              });
            }
            if (staffId) next[String(staffId)] = status;
            return next;
          });
        }
      }
      if (event.type === 'PICK_LIST_ASSIGNED') fetchData();
    },
    enabled: true,
  });

  const getToken = () =>
    sessionStorage.getItem("warehouseAuthToken") ||
    sessionStorage.getItem("warehouseToken") ||
    localStorage.getItem("token");

  const fetchData = useCallback(async () => {
    const token = getToken();
    setLoading(true); setError("");
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [unassignedRes, pendingRes, inProgressRes, completedRes, staffRes, pickerStatusRes, packerStatusRes, shippingStatusRes] =
        await Promise.all([
          fetch(`${PICKLIST_API}/unassigned`,         { headers }).then(r => r.json()).catch(() => []),
          fetch(`${PICKLIST_API}/status/PENDING`,     { headers }).then(r => r.json()).catch(() => []),
          fetch(`${PICKLIST_API}/status/IN_PROGRESS`, { headers }).then(r => r.json()).catch(() => []),
          fetch(`${PICKLIST_API}/status/COMPLETED`,   { headers }).then(r => r.json()).catch(() => []),
          fetch(AUTH_API,                             { headers }).then(r => r.json()).catch(() => []),
          fetch(`${STATUS_API}/role/PICKER`,          { headers }).then(r => r.json()).catch(() => []),
          fetch(`${STATUS_API}/role/PACKER`,          { headers }).then(r => r.json()).catch(() => []),
          fetch(`${STATUS_API}/role/SHIPPING`,        { headers }).then(r => r.json()).catch(() => []),
        ]);

      const unassignedList = Array.isArray(unassignedRes) ? unassignedRes : [];
      setUnassigned(unassignedList);

      const allActive = [
        ...(Array.isArray(pendingRes)    ? pendingRes    : []),
        ...(Array.isArray(inProgressRes) ? inProgressRes : []),
        ...(Array.isArray(completedRes)  ? completedRes  : []),
      ];
      setAssigned(allActive.filter(pl => pl.assignedPickerId));

      const staff = Array.isArray(staffRes) ? staffRes : [];
      setAllStaff(staff);

      // Build live status map by email (ID mismatch fix)
      const statusByEmail = {};
      const statusByName  = {};
      [
        ...(Array.isArray(pickerStatusRes)   ? pickerStatusRes   : []),
        ...(Array.isArray(packerStatusRes)   ? packerStatusRes   : []),
        ...(Array.isArray(shippingStatusRes) ? shippingStatusRes : []),
      ].forEach(s => {
        if (s.staffEmail) statusByEmail[s.staffEmail.toLowerCase().trim()] = s.status || 'OFFLINE';
        if (s.staffName)  statusByName[s.staffName.toLowerCase().trim()]   = s.status || 'OFFLINE';
      });

      const statusMap = {};
      staff.forEach(p => {
        const email    = p.email?.toLowerCase().trim();
        const name     = fullName(p).toLowerCase().trim();
        statusMap[String(p.id)] = (email && statusByEmail[email]) || (name && statusByName[name]) || 'OFFLINE';
      });
      setLiveStatuses(statusMap);

      // ── Auto-assign all unassigned pick lists immediately ──────────────────
      const activeAssigned = allActive.filter(pl => pl.assignedPickerId);
      if (unassignedList.length > 0) {
        autoAssignAll(unassignedList, staff, statusMap, activeAssigned, token);
      }

    } catch (err) {
      setError("Failed to load data: " + err.message);
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-assign: सर्व unassigned pick lists ला best staff assign करतो ──────
  const autoAssignAll = async (unassignedList, staff, statusMap, activeAssigned, token) => {
    for (const pl of unassignedList) {
      const picker   = getBestStaff(staff, statusMap, activeAssigned, 'PICKER');
      const packer   = getBestStaff(staff, statusMap, activeAssigned, 'PACKER');
      const shipper  = getBestStaff(staff, statusMap, activeAssigned, 'SHIPPING');

      if (!picker && !packer && !shipper) continue; // staff च नाही (empty list)

      setAutoAssigning(prev => ({ ...prev, [pl.id]: true }));
      try {
        const res = await fetch(`${PICKLIST_API}/${pl.id}/assign`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            pickerId:      picker?.id    || null, pickerName:    fullName(picker),   pickerEmail:   picker?.email   || '',
            packerId:      packer?.id    || null, packerName:    fullName(packer),   packerEmail:   packer?.email   || '',
            shippingId:    shipper?.id   || null, shippingName:  fullName(shipper),  shippingEmail: shipper?.email  || '',
          }),
        });
        if (res.ok) {
          // Optimistically add to activeAssigned so next iteration gets different staff if possible
          activeAssigned.push({
            assignedPickerId:   picker?.id,
            assignedPackerId:   packer?.id,
            assignedShippingId: shipper?.id,
          });
          setSuccess(`✅ Auto-assigned Order #${pl.orderNumber?.slice(0,18)}… → ${fullName(picker)} / ${fullName(packer)} / ${fullName(shipper)}`);
          setTimeout(() => setSuccess(""), 5000);

          // 🔔 Picker च्या bell वर notification push करा
          // PICK_LIST_ASSIGNED type — PickerDashboard च्या PICKER_NOTIF_TYPES मध्ये आहे
          if (picker) {
            pushNotification({
              type:    'PICK_LIST_ASSIGNED',
              title:   `📋 New Pick List Assigned`,
              message: `Order #${pl.orderNumber?.slice(0, 20)} assigned to you by Manager. Check your Pending list.`,
              source:  'WAREHOUSE',
              data:    {
                pickListId:  pl.id,
                orderNumber: pl.orderNumber,
                pickerName:  fullName(picker),
                pickerId:    picker.id,
              },
            });
          }
        }
      } catch (_) { /* silent — fetchData will show final state */ }
      finally {
        setAutoAssigning(prev => { const n = { ...prev }; delete n[pl.id]; return n; });
      }
    }
    // Refresh to get final assigned state
    setTimeout(() => fetchData(), 800);
  };

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Edit save ────────────────────────────────────────────────────────────────
  const handleEditSave = async (pickListId, newAssignment) => {
    setEditSaving(true);
    setEditError('');
    try {
      const res = await fetch(`${PICKLIST_API}/${pickListId}/assign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(newAssignment),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setEditError(err.error || 'Reassign failed');
        return; // modal बंद होणार नाही
      }
      setSuccess(`✅ Reassigned → ${newAssignment.pickerName} / ${newAssignment.packerName} / ${newAssignment.shippingName}`);
      setTimeout(() => setSuccess(""), 4000);
      setEditModal(null); // success तरच close
      setEditError('');

      // 🔔 Reassigned picker ला notification push करा
      if (newAssignment.pickerId) {
        pushNotification({
          type:    'PICK_LIST_ASSIGNED',
          title:   `📋 Pick List Reassigned`,
          message: `Order #${editModal?.orderNumber?.slice(0, 20) || pickListId} reassigned to ${newAssignment.pickerName} by Manager.`,
          source:  'WAREHOUSE',
          data:    {
            pickListId,
            orderNumber: editModal?.orderNumber,
            pickerName:  newAssignment.pickerName,
            pickerId:    newAssignment.pickerId,
          },
        });
      }

      fetchData();
    } catch (err) {
      setEditError(err.message);
    } finally {
      setEditSaving(false);
    }
  };

  const handleUnassign = async (pickListId) => {
    setError("");
    try {
      const res = await fetch(`${PICKLIST_API}/${pickListId}/unassign`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Unassign failed");
      setSuccess(`Pick List #${pickListId} unassigned`);
      setTimeout(() => setSuccess(""), 3000);
      fetchData();
    } catch (err) {
      setError("Unassign error: " + err.message);
    }
  };

  if (loading) return <div style={S.loading}>Loading pick lists…</div>;

  const onlinePickerCount  = pickers.filter(p  => liveStatuses[String(p.id)] === 'ONLINE').length;
  const busyPickerCount    = pickers.filter(p  => liveStatuses[String(p.id)] === 'BUSY').length;
  const onlinePackerCount  = packers.filter(p  => liveStatuses[String(p.id)] === 'ONLINE').length;
  const onlineShipperCount = shippers.filter(s => liveStatuses[String(s.id)] === 'ONLINE').length;

  return (
    <div style={S.container}>
      <style>{`
        @keyframes pulse {
          0%   { transform:scale(1);   opacity:0.6; }
          50%  { transform:scale(1.8); opacity:0; }
          100% { transform:scale(1);   opacity:0; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Edit Modal */}
      {editModal && (
        <EditAssignmentModal
          pickList={editModal}
          allStaff={allStaff}
          liveStatuses={liveStatuses}
          saving={editSaving}
          saveError={editError}
          onSave={(assignment) => handleEditSave(editModal.id, assignment)}
          onClose={() => { setEditModal(null); setEditError(''); }}
        />
      )}

      {/* Header */}
      <div style={S.header}>
        <div>
          <h2 style={S.title}>📋 Pick List Assignment</h2>
          <p style={S.subtitle}>System automatically assigns the best available staff. Manager can edit anytime.</p>
        </div>
        <button onClick={fetchData} style={S.refreshBtn}>↻ Refresh</button>
      </div>

      {/* Summary bar */}
      <div style={S.summaryBar}>
        <div style={{ ...S.summaryChip, display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ width:8, height:8, borderRadius:'50%', background:'#22c55e', display:'inline-block' }} />
          Pickers Online: <strong style={{ color:'#16a34a' }}>{onlinePickerCount}</strong>
          {busyPickerCount > 0 && <span style={{ color:'#d97706' }}> · Busy: {busyPickerCount}</span>}
        </div>
        <div style={{ ...S.summaryChip, display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ width:8, height:8, borderRadius:'50%', background:'#7c3aed', display:'inline-block' }} />
          Packers Online: <strong style={{ color:'#7c3aed' }}>{onlinePackerCount}</strong>
        </div>
        <div style={{ ...S.summaryChip, display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ width:8, height:8, borderRadius:'50%', background:'#ea580c', display:'inline-block' }} />
          Shipping Online: <strong style={{ color:'#ea580c' }}>{onlineShipperCount}</strong>
        </div>
        <div style={S.summaryChip}>⏳ Pending: <strong>{unassigned.length}</strong></div>
        <div style={{ ...S.summaryChip, borderColor:'#22c55e', color:'#16a34a' }}>
          ✅ Assigned: <strong>{assigned.length}</strong>
        </div>
      </div>

      {error   && <div style={S.error}>❌ {error}</div>}
      {success && <div style={S.success}>{success}</div>}

      {/* ── Auto-assigning spinner ── */}
      {Object.keys(autoAssigning).length > 0 && (
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:8, marginBottom:12, fontSize:13, color:'#1d4ed8' }}>
          <span style={{ width:16, height:16, border:'2px solid #93c5fd', borderTopColor:'#2563eb', borderRadius:'50%', display:'inline-block', animation:'spin 0.7s linear infinite' }} />
          Auto-assigning {Object.keys(autoAssigning).length} pick list(s)…
        </div>
      )}

      {/* ── Unassigned (being auto-assigned) ── */}
      {unassigned.length > 0 && (
        <>
          <h3 style={S.sectionTitle}>⏳ Pending Auto-Assignment</h3>
          <div style={S.grid}>
            {unassigned.map(pl => (
              <div key={pl.id} style={{ ...S.card, borderColor:'#fde68a', background:'#fffbeb' }}>
                <div style={S.cardHeader}>
                  <div>
                    <div style={S.orderNum}>Order #{pl.orderNumber?.slice(0,18)}…</div>
                    <div style={S.cardMeta}>{pl.lines?.length || 0} item{pl.lines?.length !== 1 ? 's' : ''} &nbsp;·&nbsp; {pl.createdAt ? new Date(pl.createdAt).toLocaleDateString('en-IN') : '—'}</div>
                  </div>
                  <span style={S.pendingBadge}>PENDING</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 0', color:'#1d4ed8', fontSize:13 }}>
                  <span style={{ width:14, height:14, border:'2px solid #93c5fd', borderTopColor:'#2563eb', borderRadius:'50%', display:'inline-block', animation:'spin 0.7s linear infinite' }} />
                  {autoAssigning[pl.id] ? 'Assigning best available staff…' : 'Queued for assignment…'}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Assigned Pick Lists ── */}
      <h3 style={{ ...S.sectionTitle, marginTop: unassigned.length > 0 ? 32 : 0 }}>✅ Assigned Pick Lists</h3>
      {assigned.length === 0 ? (
        <div style={S.emptyBox}><div style={{ fontSize:32, marginBottom:8 }}>📭</div>No pick lists assigned yet.</div>
      ) : (
        <div style={S.grid}>
          {assigned.map(pl => {
            const pickerSt   = liveStatuses[String(pl.assignedPickerId)]   || 'OFFLINE';
            const packerSt   = liveStatuses[String(pl.assignedPackerId)]   || 'OFFLINE';
            const shippingSt = liveStatuses[String(pl.assignedShippingId)] || 'OFFLINE';
            const isInProgress = pl.status === 'IN_PROGRESS';
            const isCompleted  = pl.status === 'COMPLETED';

            // allStaff मधून email lookup — id ने match
            const pickerStaff   = allStaff.find(s => String(s.id) === String(pl.assignedPickerId));
            const packerStaff   = allStaff.find(s => String(s.id) === String(pl.assignedPackerId));
            const shipperStaff  = allStaff.find(s => String(s.id) === String(pl.assignedShippingId));

            // Card style — COMPLETED = green tint, IN_PROGRESS = blue tint, PENDING = default
            const cardStyle = isCompleted
              ? { ...S.card, borderColor:'#86efac', background:'#f0fdf4' }
              : isInProgress
              ? { ...S.card, borderColor:'#93c5fd', background:'#eff6ff' }
              : { ...S.card, borderColor:'#bbf7d0', background:'#f8fafc' };

            return (
              <div key={pl.id} style={cardStyle}>
                {/* Card header */}
                <div style={S.cardHeader}>
                  <div>
                    <div style={S.orderNum}>Order #{pl.orderNumber?.slice(0,18)}…</div>
                    <div style={S.cardMeta}>{pl.lines?.length || 0} item{pl.lines?.length !== 1 ? 's' : ''}</div>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
                    {isCompleted  && <span style={S.completedBadge}>✅ PICKED</span>}
                    {isInProgress && <span style={S.inProgressBadge}>🏃 PICKING</span>}
                    {!isCompleted && !isInProgress && <span style={S.assignedBadge}>ASSIGNED</span>}
                  </div>
                </div>

                {/* Staff rows — name + email + status */}
                {[
                  { label:'🏃 Picker',   name: pl.assignedPickerName,   email: pickerStaff?.email,  status: pickerSt },
                  { label:'📦 Packer',   name: pl.assignedPackerName,   email: packerStaff?.email,  status: packerSt },
                  { label:'🚚 Shipping', name: pl.assignedShippingName, email: shipperStaff?.email, status: shippingSt },
                ].map(({ label, name, email, status }) => (
                  <div key={label} style={{ ...S.staffRow, alignItems:'flex-start' }}>
                    <span style={{ ...S.staffLabel, paddingTop:2 }}>{label}</span>
                    <span style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:2 }}>
                      <span style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <span style={{ fontSize:13, fontWeight:600, color:'#1e293b' }}>{name || '—'}</span>
                        <StatusDot status={status} />
                      </span>
                      {email && (
                        <span style={{ fontSize:11, color:'#64748b', fontFamily:'monospace' }}>{email}</span>
                      )}
                    </span>
                  </div>
                ))}

                {pl.assignedAt && (
                  <div style={{ fontSize:11, color:'#94a3b8', marginTop:6 }}>
                    Assigned: {new Date(pl.assignedAt).toLocaleString('en-IN')}
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ display:'flex', gap:8, marginTop:12 }}>
                  {/* Edit button — always visible */}
                  <button
                    onClick={() => { setEditModal(pl); setEditError(''); }}
                    style={{ flex:2, padding:'9px', background:'#2563eb', color:'#fff', border:'none', borderRadius:8, fontWeight:600, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}
                  >
                    ✏️ Edit Assignment
                  </button>
                  {/* Unassign — disabled if picking in progress or completed */}
                  <button
                    onClick={() => !isInProgress && !isCompleted && handleUnassign(pl.id)}
                    disabled={isInProgress || isCompleted}
                    title={isInProgress ? 'Cannot unassign — picking in progress' : isCompleted ? 'Cannot unassign — already picked' : 'Remove assignment'}
                    style={{ flex:1, padding:'9px', background:'#f1f5f9', color: (isInProgress || isCompleted) ? '#cbd5e1' : '#64748b', border:'1px solid #e2e8f0', borderRadius:8, fontWeight:500, fontSize:12, cursor: (isInProgress || isCompleted) ? 'not-allowed' : 'pointer' }}
                  >
                    ↩ Unassign
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  container:      { padding:'24px', fontFamily:'Inter, sans-serif', maxWidth:1200, margin:'0 auto' },
  header:         { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 },
  title:          { fontSize:22, fontWeight:700, color:'#1e293b', margin:0 },
  subtitle:       { color:'#64748b', fontSize:13, marginTop:4 },
  refreshBtn:     { padding:'7px 16px', background:'#f1f5f9', border:'1px solid #e2e8f0', borderRadius:8, fontSize:13, fontWeight:600, color:'#475569', cursor:'pointer' },
  summaryBar:     { display:'flex', gap:10, marginBottom:20, flexWrap:'wrap' },
  summaryChip:    { background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:8, padding:'7px 14px', fontSize:13, color:'#475569' },
  error:          { background:'#fee2e2', color:'#dc2626', padding:'10px 14px', borderRadius:8, marginBottom:12, fontSize:13 },
  success:        { background:'#dcfce7', color:'#16a34a', padding:'10px 14px', borderRadius:8, marginBottom:12, fontSize:13 },
  sectionTitle:   { fontSize:16, fontWeight:700, color:'#334155', marginBottom:14 },
  emptyBox:       { textAlign:'center', padding:'32px 20px', color:'#94a3b8', background:'#f8fafc', borderRadius:12, border:'1px dashed #e2e8f0', fontSize:14 },
  grid:           { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(340px, 1fr))', gap:16 },
  card:           { background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:12, padding:18, boxShadow:'0 1px 4px rgba(0,0,0,0.05)' },
  cardHeader:     { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 },
  orderNum:       { fontWeight:700, color:'#1e293b', fontSize:14 },
  cardMeta:       { fontSize:12, color:'#94a3b8', marginTop:3 },
  pendingBadge:   { background:'#fef3c7', color:'#d97706', borderRadius:6, padding:'3px 10px', fontSize:11, fontWeight:700, whiteSpace:'nowrap' },
  assignedBadge:  { background:'#dcfce7', color:'#16a34a', borderRadius:6, padding:'3px 10px', fontSize:11, fontWeight:700, whiteSpace:'nowrap' },
  completedBadge: { background:'#d1fae5', color:'#065f46', borderRadius:6, padding:'3px 10px', fontSize:11, fontWeight:700, whiteSpace:'nowrap' },
  inProgressBadge:{ background:'#dbeafe', color:'#1d4ed8', borderRadius:6, padding:'3px 8px', fontSize:10, fontWeight:700, whiteSpace:'nowrap' },
  staffRow:       { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8, flexWrap:'wrap', gap:4 },
  staffLabel:     { fontSize:12, color:'#94a3b8', fontWeight:500, minWidth:80 },
  loading:        { padding:40, textAlign:'center', color:'#64748b', fontSize:14 },
};
