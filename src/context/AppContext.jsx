
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, clearSession, saveSession } from '../services/api.js';
import { vehicleCatalog } from '../data/vehicleCatalog.js';

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

const roleAccess = {
  admin: ['dashboard', 'vehicles', 'assessments', 'inventory', 'garage', 'fuel', 'vehicle-out', 'transactions', 'reports', 'support', 'audit-trail', 'settings', 'notifications'],
  mechanic: ['dashboard', 'vehicles', 'assessments', 'garage', 'guest-pending', 'support', 'notifications'],
  store: ['dashboard', 'vehicles', 'assessments', 'inventory', 'transactions', 'reports', 'support', 'notifications'],
  fuel: ['fuel', 'reports', 'support', 'notifications'],
  vehicle_manager: ['vehicle-out', 'reports', 'support', 'notifications'],
  guest: ['guest']
};
const roleToApi = { admin: 'ADMIN', mechanic: 'MECHANIC', store: 'STORE_KEEPER', fuel: 'FUEL_MANAGER', vehicle_manager: 'VEHICLE_MANAGER' };
const apiToRole = { ADMIN: 'admin', MECHANIC: 'mechanic', STORE_KEEPER: 'store', FUEL_MANAGER: 'fuel', VEHICLE_MANAGER: 'vehicle_manager' };
const roleLabel = { admin: 'Admin', mechanic: 'Mechanic', store: 'Store Keeper', fuel: 'Fuel Management System', vehicle_manager: 'Vehicles Management System', guest: 'Guest Drop-off' };
const statusToApi = { Active: 'ACTIVE', 'Under Repair': 'UNDER_REPAIR', 'Out of Service': 'OUT_OF_SERVICE', 'Build in Progress': 'BUILD_IN_PROGRESS', 'Built and Testing': 'BUILT_TESTING', Delivered: 'DELIVERED' };
const apiToStatus = { ACTIVE: 'Active', UNDER_REPAIR: 'Under Repair', OUT_OF_SERVICE: 'Out of Service', BUILD_IN_PROGRESS: 'Build in Progress', BUILT_TESTING: 'Built and Testing', DELIVERED: 'Delivered' };
const assessmentToApi = { Opened: 'OPEN', 'In Diagnosis': 'IN_PROGRESS', 'Ready for Parts': 'READY_FOR_PARTS', 'Parts Issued': 'PARTS_ISSUED', Completed: 'COMPLETED', Reopened: 'REOPENED' };
const apiToAssessment = { OPEN: 'Opened', IN_PROGRESS: 'In Diagnosis', READY_FOR_PARTS: 'Ready for Parts', PARTS_ISSUED: 'Parts Issued', COMPLETED: 'Completed', REOPENED: 'Reopened' };
const garageToApi = { Repair: 'REPAIR', Maintenance: 'MAINTENANCE', Servicing: 'SERVICING', 'Build / Assembly': 'ASSEMBLY', Testing: 'TESTING', 'Pre Delivery Inspection': 'TESTING' };
const apiToGarage = { REPAIR: 'Repair', MAINTENANCE: 'Maintenance', SERVICING: 'Servicing', ASSEMBLY: 'Build / Assembly', TESTING: 'Testing' };
const garageStatusToApi = { Pending: 'PENDING', Ongoing: 'IN_PROGRESS', 'In Progress': 'IN_PROGRESS', 'Build in Progress': 'IN_PROGRESS', Completed: 'COMPLETED', Cancelled: 'CANCELLED', Delivered: 'COMPLETED', 'Built and Testing': 'IN_PROGRESS' };
const apiToGarageStatus = { PENDING: 'Pending', IN_PROGRESS: 'Ongoing', COMPLETED: 'Completed', CANCELLED: 'Cancelled' };
const txTypeToApi = { 'Parts Re-order': 'PART_PURCHASE', 'External Vehicle Order': 'VEHICLE_ORDER', 'Repair / Service Billing': 'SERVICE_INVOICE' };
const apiToTxType = { PART_PURCHASE: 'Parts Re-order', VEHICLE_ORDER: 'External Vehicle Order', SERVICE_INVOICE: 'Repair / Service Billing' };
const txStatusToApi = { Pending: 'PENDING', 'In Progress': 'IN_PROGRESS', 'Build in Progress': 'IN_PROGRESS', Completed: 'COMPLETED', Paid: 'PAID', Cancelled: 'CANCELLED' };
const apiToTxStatus = { PENDING: 'Pending', IN_PROGRESS: 'In Progress', COMPLETED: 'Completed', PAID: 'Paid', CANCELLED: 'Cancelled' };

const arr = v => Array.isArray(v) ? v : [];
const nextId = (prefix, length, offset = 1) => `${prefix}-${String(offset).padStart(length, '0')}`;
export const nowLocalInput = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0,16); };
export const todayLocal = () => nowLocalInput().slice(0,10);
const normalizeDate = value => value ? String(value).slice(0,16) : '';
const normPlate = p => String(p || '').trim().toUpperCase();
const catalogByPlate = plate => vehicleCatalog.find(v => normPlate(v.plate) === normPlate(plate));

function normalizeUser(u) { const role = apiToRole[u.role] || u.role || 'mechanic'; return { id: u.id, name: u.name, email: (u.email || '').replace('@valle.com','@vallepark.com'), role, label: roleLabel[role] || role, password: u.password || '' }; }
function enrichFromCatalog(obj) { const c = catalogByPlate(obj.plate || obj.plateNumber); return c ? { ...c, ...obj, model: obj.model || c.model, cc: obj.cc || c.cc, imageUrl: obj.imageUrl || c.imageUrl } : obj; }
function normalizeVehicle(v) { const base = { id: v.id, dbId: v.id, plate: v.plateNumber || v.plate || '', vin: v.vin || '', type: v.vehicleType || v.type || 'Quad', customType: v.customType || '', ownership: v.ownership === 'EXTERNAL' ? 'External' : v.ownership === 'CUSTOMER_ORDER' ? 'External' : v.ownership || 'Internal', owner: v.ownerName || v.owner || 'Vallé Adventure Park', companyName: v.companyName || '', deliveryPersonName: v.deliveryPersonName || '', contactNumber: v.contactNumber || '', email: v.email || '', manufacturer: v.manufacturer || 'CFMOTO', status: apiToStatus[v.status] || v.status || 'Active', hours: Number(v.currentHourMeter ?? v.hours ?? 0), nextService: Number(v.nextServiceDueAtHours ?? v.nextService ?? 100), checkInDateTime: normalizeDate(v.checkInDateTime), expectedDeliveryDate: v.expectedDeliveryDate ? String(v.expectedDeliveryDate).slice(0,10) : '', notes: v.notes || '', mechanic: v.mechanic || '', mechanicIds: arr(v.mechanicIds || v.assignedMechanicIds || v.vehicleMechanics).map(m => typeof m === 'string' ? m : (m.mechanicId || m.userId || m.mechanic?.id || m.id)).filter(Boolean), mechanicNames: arr(v.mechanicNames || v.vehicleMechanics).map(m => typeof m === 'string' ? m : (m.mechanic?.name || m.name)).filter(Boolean), sourceTransactionId: v.transactionId || v.sourceTransactionId || '', model: v.model || '', cc: v.cc || '', imageUrl: v.imageUrl || '' }; return enrichFromCatalog(base); }

function vehicleKey(v) {
  const plate = normPlate(v?.plate || v?.plateNumber || v?.vehiclePlate || '');
  return plate || String(v?.dbId || v?.id || '').trim();
}

function uniqueVehicles(list = []) {
  const map = new Map();

  (list || []).forEach((vehicle) => {
    const normalized = normalizeVehicle(vehicle);
    const key = vehicleKey(normalized);

    if (!key) return;

    const existing = map.get(key);

    if (!existing) {
      map.set(key, normalized);
      return;
    }

    // Keep one current profile only. Prefer the DB-backed/latest object,
    // while merging fields so an edit cannot appear as a second vehicle row.
    map.set(key, {
      ...existing,
      ...normalized,
      id: normalized.id || existing.id,
      dbId: normalized.dbId || existing.dbId,
      plate: normalized.plate || existing.plate,
    });
  });

  return Array.from(map.values());
}

function normalizeInventory(i) { return { id: i.id, dbId: i.id, sku: i.sku, name: i.name, category: i.category || '', barcode: i.barcode || '', stock: Number(i.currentStock ?? i.stock ?? 0), currentStock: Number(i.currentStock ?? i.stock ?? 0), reorderLevel: Number(i.reorderLevel ?? 0), costPrice: Number(i.costPrice ?? 0), sellingPrice: Number(i.sellingPrice ?? i.lastPrice ?? i.price ?? 0), lastPrice: Number(i.sellingPrice ?? i.lastPrice ?? i.price ?? 0), supplier: i.supplierName || i.supplier || '', supplierName: i.supplierName || i.supplier || '', supplierEmail: i.supplierEmail || '', location: i.location || '' }; }
function normalizeMoneyPart(p) {
  const qty = Number(p.qty || p.quantity || 1);
  const costPrice = Number(p.costPrice ?? p.unitCostPrice ?? p.inventoryItem?.costPrice ?? 0);
  const sellingPrice = Number(p.sellingPrice ?? p.unitSellingPrice ?? p.price ?? p.unitPrice ?? p.lastPrice ?? p.inventoryItem?.sellingPrice ?? 0);
  const lineCostTotal = Number(p.lineCostTotal ?? p.costTotal ?? qty * costPrice);
  const lineSellingTotal = Number(p.lineSellingTotal ?? p.sellingTotal ?? p.lineTotal ?? qty * sellingPrice);
  const margin = Number(p.margin ?? lineSellingTotal - lineCostTotal);
  return { partId: p.partId || p.inventoryItemId || p.id || 'manual', sku: p.sku || '', name: p.name || p.partName || p.part || p.inventoryItem?.name || '', qty, costPrice, sellingPrice, lineCostTotal, lineSellingTotal, lineTotal: lineSellingTotal, margin, issuedBy: p.issuedBy?.name || p.issuedBy || p.createdBy?.name || '', issuedAt: p.issuedAt || p.createdAt || '' };
}
function normalizeAssessment(a) { const v = a.vehicle ? normalizeVehicle(a.vehicle) : null; const partRows = arr(a.partIssues && a.partIssues.length ? a.partIssues : (a.requiredParts || a.parts)).map(normalizeMoneyPart); return { id: a.ticketNo || a.id, dbId: a.id, vehicleId: a.vehicleId, vehicle: v?.plate || a.vehiclePlate || a.vehicle || '', mechanic: a.assignedMechanics?.map?.(m=>m.mechanic?.name).filter(Boolean).join(', ') || a.mechanic?.name || a.mechanic || '', issue: a.issuesDetected || a.issue || '', conclusion: a.conclusion || '', parts: partRows, partsTotalCost: a.partsTotalCost, status: apiToAssessment[a.status] || a.status || 'Opened', reopenedBy: a.reopenedBy?.name || a.reopenedBy || '', reopenReason: a.reopenReason || '', issuedPartsNote: a.issuedPartsNote || '', photos: arr(a.photos), createdAt: a.createdAt ? new Date(a.createdAt).toLocaleString() : '' }; }
function normalizeGarage(g) { const v = g.vehicle ? normalizeVehicle(g.vehicle) : null; const a = g.assessment ? normalizeAssessment(g.assessment) : null; const mh = arr(g.mechanicHours).map(m=>({ mechanicId:m.mechanicId, mechanic:m.mechanic?.name || '', hours:Number(m.hours||0) })); const partRows = arr(g.partSales && g.partSales.length ? g.partSales : g.partsUsed).map(normalizeMoneyPart); return { id: g.processNo || g.id, dbId: g.id, vehicleId: g.vehicleId, vehicle: v?.plate || g.vehicle || '', assessmentId: a?.id || g.assessmentId || '', transactionId: g.transactionId || '', type: apiToGarage[g.processType] || g.type || 'Repair', mechanic: mh.map(x=>x.mechanic).filter(Boolean).join(', ') || g.mechanic?.name || g.mechanic || '', mechanicHours: mh, checkInDateTime: normalizeDate(g.checkInDateTime), start: normalizeDate(g.startDateTime) || g.start || '', end: normalizeDate(g.endDateTime) || g.end || 'Pending', endDateTime: normalizeDate(g.endDateTime) || g.endDateTime || '', labor: g.laborHours ? `${g.laborHours} hrs` : g.labor || '0 hrs', expectedDeliveryDate: g.expectedDeliveryDate ? String(g.expectedDeliveryDate).slice(0,10) : '', status: apiToGarageStatus[g.status] || g.status || 'Pending', paymentStatus: g.paymentDone ? 'Paid' : g.paymentStatus || 'Pending', invoiceFile: g.invoiceAttachmentUrl || g.invoiceFile || '', workDone: g.proceduresPerformed || g.workDone || '', partsUsed: partRows, photos: arr(g.photos) }; }
function normalizeTransaction(t) { return { id: t.transactionNo || t.id, dbId: t.id, type: apiToTxType[t.type] || t.type || 'External Vehicle Order', supplier: t.supplierName || t.supplier || t.customerName || '', supplierEmail: t.supplierEmail || '', item: t.title || t.item || '', quantity: t.quantity || 1, status: apiToTxStatus[t.status] || t.status || 'Pending', poNumber: t.poNumber || '', poFile: t.poAttachmentUrl || t.poFile || '', invoiceFile: t.invoiceAttachmentUrl || t.invoiceFile || '', grn: t.grnData || null, amount: Number(t.amount || 0), startDate: t.startDate ? String(t.startDate).slice(0,10) : '', expectedDeliveryDate: t.expectedDeliveryDate ? String(t.expectedDeliveryDate).slice(0,10) : '', notes: t.notes || '', message: t.message || '' }; }
function normalizeNotification(n) { return typeof n === 'string' ? n : `${n.title || 'Notification'}: ${n.message || ''}`; }
function normalizeSupportRequest(s) { return { id:s.id, dbId:s.id, ticketNo:s.ticketNo || s.id, requesterName:s.requesterName || '', requesterEmail:s.requesterEmail || '', requesterRole:s.requesterRole || '', page:s.page || '', subject:s.subject || '', message:s.message || '', priority:s.priority || 'NORMAL', status:s.status || 'OPEN', adminReply:s.adminReply || '', createdAt:normalizeDate(s.createdAt) || s.createdAt || '', updatedAt:normalizeDate(s.updatedAt) || s.updatedAt || '', resolvedAt:normalizeDate(s.resolvedAt) || s.resolvedAt || '' }; }
function normalizeGuestTicket(t) { return { id:t.id, dbId:t.id, name:t.name || t.deliveryPersonName || '', deliveryPersonName:t.deliveryPersonName || t.name || '', plate:String(t.plate || t.plateNumber || '').toUpperCase(), vin:t.vin || '', model:t.model || '', cc:t.cc || '', type:t.vehicleType || t.type || 'Quad', contactNumber:t.contactNumber || '', email:t.email || '', notes:t.notes || '', imageUrl:t.imageUrl || '', status:t.status || 'Pending', takenBy:t.takenBy || '', vehicleId:t.vehicleId || '', assessmentId:t.assessmentId || '', createdAt:normalizeDate(t.createdAt) || t.createdAt || '' }; }

function normalizeFuel(f) { const v = f.vehicle ? normalizeVehicle(f.vehicle) : null; return { id:f.id, vehicleId:f.vehicleId, vehicle:v?.plate || f.vehiclePlate || f.vehicle || '', fuelType:f.fuelType || '', meterType:f.meterType || 'KM', meterReading:Number(f.meterReading || 0), fuelLitres:Number(f.fuelLitres || 0), notes:f.notes || '', recordedAt:normalizeDate(f.recordedAt), recordedBy:f.recordedBy?.name || '' }; }
function normalizeVehicleOut(o) { const v = o.vehicle ? normalizeVehicle(o.vehicle) : null; const start = normalizeDate(o.startDateTime); const end = normalizeDate(o.endDateTime); const durationSeconds = Number(o.durationSeconds || 0); return { id:o.id, vehicleId:o.vehicleId, vehicle:v?.plate || o.vehiclePlate || o.vehicle || '', activityType:o.activityType || 'Activity', destination:o.destination || '', driverName:o.driverName || '', invoiceNumber:o.invoiceNumber || '', guideName:o.guideName || '', quadActivity:o.quadActivity || '', tripDuration:o.tripDuration || '', startDateTime:start, endDateTime:end, durationSeconds, durationLabel:o.durationLabel || '', isCurrentlyOut: !end, notes:o.notes || '', recordedBy:o.recordedBy?.name || '' }; }

function vehiclePayload(v) { return { plateNumber: v.plate, vin: v.vin || undefined, vehicleType: v.type === 'Other' ? v.customType || 'Other' : v.type, ownership: v.ownership === 'External' ? (v.sourceTransactionId ? 'CUSTOMER_ORDER' : 'EXTERNAL') : 'INTERNAL', ownerName: v.owner || undefined, companyName: v.companyName || undefined, deliveryPersonName: v.deliveryPersonName || undefined, contactNumber: v.contactNumber || undefined, email: v.email || undefined, manufacturer: v.manufacturer || 'CFMOTO', model: v.model || undefined, cc: v.cc || undefined, imageUrl: v.imageUrl || undefined, status: statusToApi[v.status] || 'ACTIVE', currentHourMeter: Number(v.hours || 0), checkInDateTime: v.checkInDateTime || undefined, expectedDeliveryDate: v.expectedDeliveryDate || undefined, mechanicIds: arr(v.mechanicIds), mechanicNames: arr(v.mechanicNames), vehicleChecks: v.vehicleChecks || undefined, notes: [v.notes, v.model ? `Model: ${v.model}` : '', v.cc ? `CC: ${v.cc}` : ''].filter(Boolean).join(' | '), transactionId: v.sourceTransactionId || undefined }; }
function assessmentPayload(data) { return { vehicleId: data.vehicleId, status: assessmentToApi[data.status] || 'OPEN', issuesDetected: data.issue, conclusion: data.conclusion || undefined, requiredParts: arr(data.parts).map(p => ({ partName: p.name, name:p.name, quantity: Number(p.qty || 1), qty:Number(p.qty||1), partId: p.partId, inventoryItemId:p.partId, sku:p.sku, costPrice:p.costPrice, sellingPrice:p.sellingPrice, lineCostTotal:p.lineCostTotal, lineSellingTotal:p.lineSellingTotal, lineTotal:p.lineSellingTotal || p.lineTotal, margin:p.margin })), photos: arr(data.photos) }; }
function garagePayload(data) { return { vehicleId: data.vehicleId, assessmentId: data.dbAssessmentId || data.assessmentDbId || (String(data.assessmentId || '').match(/^[0-9a-f-]{32,36}$/i) ? data.assessmentId : undefined), processType: garageToApi[data.type] || 'REPAIR', status: garageStatusToApi[data.status] || 'IN_PROGRESS', proceduresPerformed: data.workDone || undefined, partsUsed: arr(data.partsUsed).map(p => ({ partId:p.partId, partName: p.name, name:p.name, quantity: Number(p.qty || 1), qty:Number(p.qty || 1), costPrice:Number(p.costPrice || 0), sellingPrice:Number(p.sellingPrice || p.price || p.unitPrice || 0), lineCostTotal:p.lineCostTotal, lineSellingTotal:p.lineSellingTotal, lineTotal:p.lineSellingTotal || p.lineTotal, margin:p.margin })), mechanicIds: data.mechanicIds || undefined, mechanicHours: data.mechanicHours || undefined, checkInDateTime: data.checkInDateTime || undefined, startDateTime: data.start || undefined, endDateTime: data.endDateTime || (data.status === 'Completed' || data.status === 'Delivered' ? new Date().toISOString() : undefined), laborHours: parseFloat(String(data.labor || '0').replace(/[^0-9.]/g,'')) || 0, invoiceAttachmentUrl: data.invoiceFile || undefined, paymentDone: data.paymentStatus === 'Paid', photos: arr(data.photos) }; }
function transactionPayload(t) { return { type: txTypeToApi[t.type] || 'VEHICLE_ORDER', status: txStatusToApi[t.status] || 'PENDING', title: t.item || 'Transaction', supplierName: t.supplier || undefined, supplierEmail: t.supplierEmail || undefined, customerName: t.customerName || undefined, startDate: t.startDate || undefined, expectedDeliveryDate: t.expectedDeliveryDate || undefined, poNumber: t.poNumber || undefined, poAttachmentUrl: t.poFile || undefined, invoiceAttachmentUrl: t.invoiceFile || undefined, amount: Number(t.amount || 0), notes: t.notes || t.message || undefined }; }

function withinDateFilter(dateStr, filter) { if (!filter || filter.type === 'all') return true; const d = dateStr ? new Date(dateStr) : null; if (!d || Number.isNaN(d.getTime())) return true; const now = new Date(); const days = filter.type === 'week' ? 7 : filter.type === 'month' ? 31 : filter.type === 'year' ? 365 : null; if (days) return d >= new Date(now.getTime() - days*24*60*60*1000); if (filter.type === 'manual') { const from = filter.from ? new Date(filter.from) : null; const to = filter.to ? new Date(filter.to + 'T23:59:59') : null; return (!from || d >= from) && (!to || d <= to); } return true; }

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => { const saved = localStorage.getItem('valle-user'); return saved ? JSON.parse(saved) : null; });
  const [users, setUsers] = useState([]);
  const [mechanicUsers, setMechanicUsers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [garageOps, setGarageOps] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [apiStatus, setApiStatus] = useState('offline');
  const [loadingCount, setLoadingCount] = useState(0);
  const [appMessage, setAppMessage] = useState(null);
  const [guestTickets, setGuestTickets] = useState(() => JSON.parse(localStorage.getItem('valle-guest-tickets') || '[]'));
  const [fuelConsumptions, setFuelConsumptions] = useState([]);
  const [vehicleOutActivities, setVehicleOutActivities] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [reportAnalytics, setReportAnalytics] = useState(null);
  const [supportRequests, setSupportRequests] = useState([]);
  const [lastVehicleForAssessment, setLastVehicleForAssessment] = useState(null);

  useEffect(() => localStorage.setItem('valle-guest-tickets', JSON.stringify(guestTickets)), [guestTickets]);

  useEffect(() => {
    const reloadGuestTickets = () => {
      try {
        const stored = JSON.parse(localStorage.getItem('valle-guest-tickets') || '[]');
        setGuestTickets(stored);
      } catch {}
    };
    window.addEventListener('focus', reloadGuestTickets);
    window.addEventListener('storage', reloadGuestTickets);
    return () => {
      window.removeEventListener('focus', reloadGuestTickets);
      window.removeEventListener('storage', reloadGuestTickets);
    };
  }, []);

  function notify(message, type = 'success') {
    setAppMessage({ message, type, at: Date.now() });
  }
  function clearAppMessage() {
    setAppMessage(null);
  }

  async function safe(label, fn, after) {
    const isBackgroundLoad = String(label || '').toLowerCase().startsWith('load ');
    setLoadingCount((count) => count + 1);
    try {
      const data = await fn();
      setApiStatus('online');
      after?.(data);
      if (!isBackgroundLoad) {
        notify(`${label.replace(/^./, c => c.toUpperCase())} completed successfully.`, 'success');
      }
      return data;
    } catch (err) {
      const message = err?.message || 'Unexpected API error';
      console.warn(`[API fallback] ${label}:`, message);
      setApiStatus('offline');
      if (!isBackgroundLoad) {
        notify(`${label.replace(/^./, c => c.toUpperCase())} failed: ${message}`, 'error');
      }
      return null;
    } finally {
      setLoadingCount((count) => Math.max(0, count - 1));
    }
  }
  async function refreshAll() {
    const role = currentUser?.role;

    const canLoadUsers = role === 'admin';
    const canLoadMechanics = ['admin', 'mechanic'].includes(role);
    const canLoadGuestTickets = ['admin', 'mechanic', 'store'].includes(role);

    await Promise.all([
      canLoadUsers
        ? safe('load users', () => api.users.list(), data => setUsers(arr(data).map(normalizeUser)))
        : Promise.resolve(),

      canLoadMechanics
        ? safe('load mechanic users', () => api.users.mechanics(), data => setMechanicUsers(arr(data).map(normalizeUser)))
        : Promise.resolve(),

      safe('load vehicles', () => api.vehicles.list(), data => setVehicles(uniqueVehicles(arr(data)))),
      safe('load inventory', () => api.inventory.list(), data => setInventory(arr(data).map(normalizeInventory))),
      safe('load assessments', () => api.assessments.list(), data => setAssessments(arr(data).map(normalizeAssessment))),
      safe('load garage work', () => api.garageOps.list(), data => setGarageOps(arr(data).map(normalizeGarage))),
      safe('load transactions', () => api.transactions.list(), data => setTransactions(arr(data).map(normalizeTransaction))),
      safe('load fuel consumptions', () => api.fuelConsumptions.list(), data => setFuelConsumptions(arr(data).map(normalizeFuel))),
      safe('load vehicle out', () => api.vehicleOut.list(), data => setVehicleOutActivities(arr(data).map(normalizeVehicleOut))),

      canLoadGuestTickets
        ? safe('load guest tickets', () => api.guestTickets.list(), data => setGuestTickets(arr(data).map(normalizeGuestTicket)))
        : Promise.resolve(),

      safe('load notifications', () => api.notifications.list(roleToApi[currentUser?.role] || ''), data => setNotifications(arr(data).map(normalizeNotification))),
      safe('load support requests', () => api.supportRequests.list(), data => setSupportRequests(arr(data).map(normalizeSupportRequest))),
      safe('load report analytics', () => api.reports.analytics('?period=monthly'), data => setReportAnalytics(data))
    ]);
  }
  useEffect(() => { if (currentUser && currentUser.role !== 'guest') refreshAll(); }, [currentUser?.id]);

  useEffect(() => { if (!currentUser || currentUser.role === 'guest') return; const id = setInterval(() => refreshAll(), 30000); return () => clearInterval(id); }, [currentUser?.id]);

  async function login(role, email, password) { if (role === 'guest') { const user = { id:'guest', name:'Guest Drop-off', role:'guest', label:'Guest Drop-off', email:'guest@vallepark.com' }; setCurrentUser(user); localStorage.setItem('valle-user', JSON.stringify(user)); return { ok:true, guest:true }; } const localEmail = (email || '').replace('@valle.com','@vallepark.com'); const loginEmails = [email, localEmail, email?.replace('@vallepark.com','@valle.com')].filter(Boolean); for (const candidate of loginEmails) { try { const res = await api.login(candidate, password); const token = res.access_token || res.accessToken || res.token; const apiUser = normalizeUser(res.user || { email:candidate, role:roleToApi[role], name:roleLabel[role] }); const user = { ...apiUser, role, label: roleLabel[role], email: localEmail || apiUser.email }; saveSession(token, user); setCurrentUser(user); setApiStatus('online'); return { ok:true }; } catch {} } const fallback = users.find(u => u.role === role && (u.email === localEmail || u.email === email) && (u.password === password || password)); if (!fallback) return { ok:false, message:'Invalid email or password for selected role.' }; setCurrentUser(fallback); localStorage.setItem('valle-user', JSON.stringify(fallback)); return { ok:true }; }
  function guestLogin(){ return login('guest','',''); }
  function logout(){ clearSession(); setCurrentUser(null); }
  function can(section){ return !!currentUser && roleAccess[currentUser.role]?.includes(section); }

  const mechanics = useMemo(() => { const map = new Map(); [...users.filter(u => u.role === 'mechanic'), ...mechanicUsers].forEach(u => { if (u?.id) map.set(u.id, u); }); return Array.from(map.values()).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''))); }, [users, mechanicUsers]);
  function findVehicleByPlate(plate){ const existing = vehicles.find(v => normPlate(v.plate) === normPlate(plate)); return existing || (catalogByPlate(plate) ? normalizeVehicle({ ...catalogByPlate(plate), id:`CAT-${normPlate(plate)}` }) : null); }
  function getVehicleHistory(vehicleRef, filter={type:'all'}){ const v = typeof vehicleRef === 'string' ? (vehicles.find(x => x.id===vehicleRef || normPlate(x.plate)===normPlate(vehicleRef)) || findVehicleByPlate(vehicleRef)) : vehicleRef; if(!v) return { vehicle:null, assessments:[], garageOps:[], parts:[], visits:0, mechanics:[] }; const relatedAssessments = assessments.filter(a => a.vehicleId===v.id || normPlate(a.vehicle)===normPlate(v.plate)).filter(a => withinDateFilter(a.createdAt, filter)); const relatedGarage = garageOps.filter(g => g.vehicleId===v.id || normPlate(g.vehicle)===normPlate(v.plate)).filter(g => withinDateFilter(g.checkInDateTime || g.start, filter)); const costByAssessment = relatedAssessments.map(a => {
      const garageForAssessment = relatedGarage.filter(g => g.assessmentId && (g.assessmentId === a.dbId || g.assessmentId === a.id));
      const assessmentParts = (a.parts || []).map(p => ({ ...p, source:'Assessment Parts', assessmentId:a.id, date:a.createdAt }));
      const garageParts = garageForAssessment.flatMap(g => (g.partsUsed || []).map(p => ({ ...p, source:'Garage Parts', assessmentId:a.id, garageId:g.id, date:g.checkInDateTime || g.start || g.createdAt })));
      const finalParts = garageParts.length ? garageParts : assessmentParts;
      const totalCost = finalParts.reduce((s,p)=>s + (Number(p.lineTotal) || Number(p.qty || p.quantity || 1) * Number(p.sellingPrice || p.price || p.unitPrice || p.lastPrice || 0)), 0);
      return { assessment:a, garageOps: garageForAssessment, parts: finalParts, totalCost };
    });
    const linkedAssessmentIds = new Set(costByAssessment.flatMap(x => [x.assessment.dbId, x.assessment.id]).filter(Boolean));
    const unlinkedGarageParts = relatedGarage
      .filter(g => !g.assessmentId || !linkedAssessmentIds.has(g.assessmentId))
      .flatMap(g => (g.partsUsed || []).map(p => ({ ...p, source:'Garage Parts', garageId:g.id, date:g.checkInDateTime || g.start || g.createdAt })));
    const parts = [...costByAssessment.flatMap(x=>x.parts), ...unlinkedGarageParts]; const mechanicNames = [...new Set([...relatedAssessments.map(a=>a.mechanic), ...relatedGarage.map(g=>g.mechanic)].filter(Boolean))]; const relatedFuel = fuelConsumptions.filter(f => f.vehicleId===v.id || f.vehicleId===v.dbId || normPlate(f.vehicle)===normPlate(v.plate)).filter(f => withinDateFilter(f.recordedAt, filter)); const relatedOut = vehicleOutActivities.filter(o => o.vehicleId===v.id || o.vehicleId===v.dbId || normPlate(o.vehicle)===normPlate(v.plate)).filter(o => withinDateFilter(o.startDateTime, filter)); const visitKeys = new Set([...relatedAssessments.map(a=>a.dbId || a.id), ...relatedGarage.map(g=>g.assessmentId || g.dbId || g.id)].filter(Boolean)); return { vehicle:v, assessments: relatedAssessments, garageOps: relatedGarage, fuelConsumptions: relatedFuel, vehicleOutActivities: relatedOut, parts, costByAssessment, visits: relatedAssessments.length, outCount: relatedOut.length, totalFuelLitres: relatedFuel.reduce((s,f)=>s+Number(f.fuelLitres||0),0), mechanics: mechanicNames }; }
  function fullDateTime(value){
    const d = value ? new Date(value) : null;
    if(!d || Number.isNaN(d.getTime())) return value || '-';
    const pad = x => String(x).padStart(2,'0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  function exportVehicleHistory(vehicleRef, filter, format='csv'){
    const h = getVehicleHistory(vehicleRef, filter);
    if(!h.vehicle) return;

    const rows = [
      ['VALLÉ GARAGE VEHICLE HISTORY'],
      ['Generated At', fullDateTime(new Date())],
      ['Plate', h.vehicle.plate],
      ['VIN', h.vehicle.vin],
      ['Model', h.vehicle.model],
      ['CC', h.vehicle.cc],
      ['Type', h.vehicle.type],
      ['Current Hour Meter', h.vehicle.hours],
      ['Next Service Hour', h.vehicle.nextService],
      ['Garage Visits', h.assessments.length],
      ['Total Parts Cost', h.costByAssessment?.reduce?.((s,x)=>s+Number(x.totalCost||0),0) || 0],
      [],
      ['Assessments'],
      ['Ticket','Stored Date/Time','Vehicle Plate','Hour Meter','Mechanic','Status','Repair / Issue','Conclusion','Parts Given','Total Cost'],
      ...h.costByAssessment.map(row=>[row.assessment.id,fullDateTime(row.assessment.createdAt),h.vehicle.plate,h.vehicle.hours,row.assessment.mechanic,row.assessment.status,row.assessment.issue,row.assessment.conclusion,(row.parts||[]).map(p=>`${p.name} x${p.qty || p.quantity || 1}`).join('; '),row.totalCost]),
      [],
      ['Garage Operations'],
      ['Process','Stored Date/Time','Vehicle Plate','Mechanic','Type','Status','Work Done','Parts Used'],
      ...h.garageOps.map(g=>[g.id,fullDateTime(g.checkInDateTime || g.start || g.createdAt),h.vehicle.plate,g.mechanic,g.type,g.status,g.workDone,(g.partsUsed||[]).map(p=>`${p.name} x${p.qty}`).join('; ')]),
      [],
      ['Fuel'],
      ['Stored Date/Time','Vehicle Plate','Fuel Type','Meter','Litres'],
      ...(h.fuelConsumptions||[]).map(f=>[fullDateTime(f.recordedAt),h.vehicle.plate,f.fuelType,`${f.meterReading} ${f.meterType}`,f.fuelLitres]),
      [],
      ['Vehicle Out / In'],
      ['Out Date/Time','In Date/Time','Vehicle Plate','Invoice','Guide','Activity','Trip Duration'],
      ...(h.vehicleOutActivities||[]).map(o=>[fullDateTime(o.startDateTime),fullDateTime(o.endDateTime),h.vehicle.plate,o.invoiceNumber,o.guideName,o.quadActivity||o.activityType,o.tripDuration])
    ];

    if(format === 'excel') {
      import('xlsx').then(XLSX => {
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws['!cols'] = [{wch:22},{wch:22},{wch:16},{wch:20},{wch:18},{wch:18},{wch:26},{wch:34}];
        XLSX.utils.book_append_sheet(wb, ws, 'Vehicle History');
        XLSX.writeFile(wb, `${h.vehicle.plate}-garage-history.xlsx`);
      });
      return;
    }

    const content = rows.map(r=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n');
    const blob = new Blob([content], { type:'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${h.vehicle.plate}-garage-history.csv`;
    a.click();
  }

  async function addUser(user){
    const normalized = { ...user, email: user.email?.includes('@') ? user.email : `${user.email}@vallepark.com` };
    const role = normalized.role === 'Admin' ? 'admin' : normalized.role === 'Store Keeper' ? 'store' : normalized.role || 'mechanic';
    const localUser = { id:`USR-${users.length+1}`, name:normalized.name, email:normalized.email, role, label:roleLabel[role], password:normalized.password || 'password123', isActive: normalized.isActive ?? true };
    setUsers(prev=>[localUser,...prev]);
    await safe('create user', () => api.users.create({ name:localUser.name, email:localUser.email.replace('@vallepark.com','@valle.com'), password:localUser.password, role:roleToApi[role], isActive:localUser.isActive }), refreshAll);
    return localUser;
  }

  async function updateUserAdmin(id, payload) {
    const role = payload.role || payload.label;
    const body = {
      ...payload,
      role: roleToApi[role] || role,
    };
    await safe('update user', () => api.users.update(id, body), refreshAll);
  }

  async function resetUserPassword(id, password) {
    await safe('reset password', () => api.users.resetPassword(id, password || 'password123'), refreshAll);
  }

  async function removeUserLogin(id) {
    await safe('deactivate user login', () => api.users.remove(id), refreshAll);
  }
  async function addVehicle(vehicle){
    const index = vehicles.length + 1;
    const catalog = catalogByPlate(vehicle.plate || vehicle.plateNumber) || {};
    const type = vehicle.type === 'Other' ? vehicle.customType || 'Other' : vehicle.type || catalog.type || 'Quad';
    const draftVehicle = normalizeVehicle({ ...catalog, ...vehicle, type, id: vehicle.id || nextId('V',3,index), plate: vehicle.plate || vehicle.plateNumber || catalog.plate, photos: vehicle.photos || [], hours: Number(vehicle.hours || catalog.hours || 0), nextService: Number(vehicle.nextService || 100), status: vehicle.status || 'Active', checkInDateTime: vehicle.checkInDateTime || nowLocalInput() });
    const savedApi = await safe('create vehicle', () => api.vehicles.create(vehiclePayload(draftVehicle)), null);
    const savedVehicle = savedApi ? normalizeVehicle(savedApi) : draftVehicle;
    setVehicles(prev => uniqueVehicles([savedVehicle, ...prev]));
    setLastVehicleForAssessment(savedVehicle);
    setNotifications(prev=>[`Vehicle ${savedVehicle.plate} registered. Start an assessment ticket from the Assessments page.`, ...prev]);
    await refreshAll();
    return savedVehicle;
  }
  async function updateVehicle(id, updates) {
    const targetPlate = normPlate(updates?.plate || updates?.plateNumber || updates?.vehiclePlate || id);
    const item = vehicles.find(v =>
      v.id === id ||
      v.dbId === id ||
      normPlate(v.plate) === normPlate(id) ||
      (targetPlate && normPlate(v.plate) === targetPlate)
    );

    const updatedItem = normalizeVehicle({
      ...(item || {}),
      ...updates,
      id: item?.id || updates?.id || id,
      dbId: item?.dbId || updates?.dbId || id,
    });

    const apiId = item?.dbId || item?.id || updates?.dbId || updates?.id || id;
    const savedApi = await safe(
      'update vehicle',
      () => api.vehicles.update(apiId, vehiclePayload(updatedItem)),
      null
    );

    const savedVehicle = savedApi ? normalizeVehicle(savedApi) : updatedItem;
    const oldPlate = normPlate(item?.plate || id);
    const newPlate = normPlate(savedVehicle.plate || updatedItem.plate);

    setVehicles(prev => {
      const withoutOldDuplicates = prev.filter(v => {
        const sameId =
          v.id === id ||
          v.dbId === id ||
          v.id === savedVehicle.id ||
          v.dbId === savedVehicle.dbId ||
          (item && (v.id === item.id || v.dbId === item.dbId));

        const samePlate =
          (oldPlate && normPlate(v.plate) === oldPlate) ||
          (newPlate && normPlate(v.plate) === newPlate);

        return !(sameId || samePlate);
      });

      return uniqueVehicles([savedVehicle, ...withoutOldDuplicates]);
    });

    setLastVehicleForAssessment(savedVehicle);
    await refreshAll();
    return savedVehicle;
  }
  async function createVehicleFromTransaction(transactionId, vehicleData={}){ const tx=transactions.find(t=>t.id===transactionId || t.dbId===transactionId); const vehicle=await addVehicle({ plate:vehicleData.plate || `BUILD-${transactions.length+vehicles.length+1}`, vin:vehicleData.vin || `PENDING-${transactionId}`, type:vehicleData.type || 'Quad', ownership:'External', owner:tx?.supplier || vehicleData.owner || 'External Customer', companyName:tx?.supplier || vehicleData.companyName || '', deliveryPersonName:vehicleData.deliveryPersonName || '', contactNumber:vehicleData.contactNumber || '', email:tx?.supplierEmail || vehicleData.email || '', checkInDateTime:vehicleData.checkInDateTime || nowLocalInput(), status:'Build in Progress', hours:0, nextService:100, mechanic:vehicleData.mechanic || 'Workshop Team', expectedDeliveryDate:tx?.expectedDeliveryDate || vehicleData.expectedDeliveryDate || '', sourceTransactionId:tx?.dbId || transactionId, notes:`Vehicle created from ${tx?.poNumber || transactionId}. ${vehicleData.notes || ''}` }); await addGarageOp({ vehicleId:vehicle.id, assessmentId:'', transactionId, type:'Build / Assembly', checkInDateTime:vehicle.checkInDateTime, expectedDeliveryDate:vehicle.expectedDeliveryDate, workDone:'Assembly ticket created from purchase order. Mechanic to update build progress.', labor:'0 hrs', status:'Build in Progress', mechanic:vehicle.mechanic }); updateTransaction(transactionId,{status:'Build in Progress', linkedVehicleId:vehicle.id}); return vehicle; }
  async function addAssessment(data){
    const vehicle = vehicles.find(v=>v.id===data.vehicleId || v.dbId===data.vehicleId) || findVehicleByPlate(data.vehicle || data.manualVehicle);
    const newAssessment = { id:`ASM-${1000+assessments.length+1}`, vehicleId: vehicle?.id || data.vehicleId || '', dbVehicleId: vehicle?.dbId || data.vehicleId || '', vehicle:vehicle?.plate || data.vehicle || data.manualVehicle, mechanic: currentUser?.name || data.mechanic, issue:data.issue, conclusion:data.conclusion, parts:data.parts || [], status:'Ready for Parts', reopenedBy:'', reopenReason:'', photos:data.photos || [], createdAt:new Date().toLocaleString() };
    const savedApi = await safe('create assessment', () => api.assessments.create({ ...assessmentPayload(newAssessment), vehicleId: vehicle?.dbId || data.vehicleId, status: 'READY_FOR_PARTS', mechanicIds: data.mechanicIds || [] }), null);
    const savedAssessment = savedApi ? normalizeAssessment(savedApi) : newAssessment;
    setAssessments(prev=>[savedAssessment, ...prev.filter(a => a.id !== savedAssessment.id && a.dbId !== savedAssessment.dbId)]);
    setNotifications(prev=>[`Assessment ${savedAssessment.id} created for ${savedAssessment.vehicle}. Store Keeper can issue parts.`, ...prev]);
    await refreshAll();
    return savedAssessment;
  }
  async function updateAssessment(id, updates){ const item=assessments.find(a=>a.id===id || a.dbId===id); setAssessments(prev=>prev.map(a=>a.id===id || a.dbId===id ? {...a,...updates} : a)); if(item) await safe('update assessment', () => api.assessments.update(item.dbId || id, assessmentPayload({...item,...updates})), refreshAll); }
  async function reopenAssessment(id, reason){ const item=assessments.find(a=>a.id===id || a.dbId===id); setAssessments(prev=>prev.map(a=>a.id===id || a.dbId===id ? {...a,status:'Opened',reopenReason:reason,reopenedBy:currentUser?.name || currentUser?.label} : a)); await safe('reopen assessment', () => api.assessments.reopen(item?.dbId || id, reason), refreshAll); }
  async function completeAssessment(id){ const item=assessments.find(a=>a.id===id || a.dbId===id); setAssessments(prev=>prev.map(a=>a.id===id || a.dbId===id ? {...a,status:'Completed'} : a)); await safe('complete assessment', () => api.assessments.complete(item?.dbId || id), refreshAll); }
  async function addGarageOp(data){
    const assessment = assessments.find(a=>a.id===data.assessmentId || a.dbId===data.assessmentId);
    const vehicle = vehicles.find(v=>v.id===data.vehicleId || v.dbId===data.vehicleId || v.id===assessment?.vehicleId || v.dbId===assessment?.vehicleId) || findVehicleByPlate(data.manualVehicle || data.vehicle || assessment?.vehicle);
    const op={ id:`PRC-${500+garageOps.length+1}`, vehicleId: vehicle?.id || data.vehicleId || '', vehicle:vehicle?.plate || data.manualVehicle || data.vehicle || assessment?.vehicle, assessmentId: assessment?.id || data.assessmentId || '', transactionId:data.transactionId || '', type:data.type || 'Repair', mechanic:data.mechanic || currentUser?.name || 'Workshop Team', checkInDateTime:data.checkInDateTime || nowLocalInput(), start:data.start || nowLocalInput(), end:data.end || 'Pending', labor:data.labor || '0 hrs', expectedDeliveryDate:data.expectedDeliveryDate || vehicle?.expectedDeliveryDate || '', status:data.status || 'Ongoing', paymentStatus:data.paymentStatus || (vehicle?.ownership==='Internal'?'None':'Pending'), invoiceFile:data.invoiceFile || '', workDone:data.workDone || `Garage process started from assessment ${assessment?.id || ''}`, partsUsed:data.partsUsed || assessment?.parts || [], photos:data.photos || [] };
    const savedApi = await safe('create garage operation', () => api.garageOps.create(garagePayload({ ...op, vehicleId: vehicle?.dbId || vehicle?.id || op.vehicleId, assessmentId: assessment?.dbId || undefined })), null);
    const savedOp = savedApi ? normalizeGarage(savedApi) : op;
    setGarageOps(prev=>[savedOp, ...prev.filter(g => g.id !== savedOp.id && g.dbId !== savedOp.dbId)]);
    setNotifications(prev=>[`Garage operation ${savedOp.id} started for ${savedOp.vehicle}.`, ...prev]);
    await refreshAll();
    return savedOp;
  }
  async function updateGarageOp(id, updates){ const op=garageOps.find(g=>g.id===id || g.dbId===id); const finalUpdates={...updates}; if(finalUpdates.status==='Completed' && !finalUpdates.endDateTime && !finalUpdates.end) finalUpdates.endDateTime=new Date().toISOString(); setGarageOps(prev=>prev.map(g=>g.id===id || g.dbId===id ? {...g,...finalUpdates} : g)); if(finalUpdates.status==='Completed') setNotifications(prev=>[`Garage work ${id} completed for ${op?.vehicle || ''}.`, ...prev]); await safe('update garage operation', () => api.garageOps.update(op?.dbId || id, garagePayload({...op,...finalUpdates})), refreshAll); }
  async function createTransaction(data){ const tx={ id:`TX-${9000+transactions.length+1}`, type:data.type || 'External Vehicle Order', supplier:data.supplier || data.customerName || 'Supplier / Customer', supplierEmail:data.supplierEmail || data.customerEmail || '', item:data.item || 'Vehicle Order', quantity:Number(data.quantity || 1), status:data.status || 'Pending', poNumber:data.poNumber || `PO-${Math.floor(10000+Math.random()*89999)}`, poFile:data.poFile || '', invoiceFile:data.invoiceFile || '', grn:null, amount:Number(data.amount || 0), startDate:data.startDate || todayLocal(), expectedDeliveryDate:data.expectedDeliveryDate || '', notes:data.notes || '', message:data.message || `Dear ${data.supplier || data.customerName || 'Supplier'}, please process the attached purchase order.` }; setTransactions(prev=>[tx,...prev]); setNotifications(prev=>[`Transaction ${tx.id} created and marked ${tx.status}.`, ...prev]); await safe('create transaction', () => api.transactions.create(transactionPayload(tx)), refreshAll); return tx; }
  function createPO(part, qty=10, custom={}){ return createTransaction({ type:custom.type || 'Parts Re-order', supplier:custom.supplier || part.supplier, supplierEmail:custom.supplierEmail || part.supplierEmail, item:custom.item || part.name, quantity:Number(custom.quantity || qty), status:'Pending', poNumber:custom.poNumber || `PO-${Math.floor(10000+Math.random()*89999)}`, poFile:custom.poFile || '', amount:Number(custom.amount || (part.lastPrice * Number(custom.quantity || qty))), startDate:custom.startDate, expectedDeliveryDate:custom.expectedDeliveryDate, notes:custom.notes, message:custom.message || `Dear Supplier, please process the attached purchase order for ${custom.item || part.name}.` }); }
  async function updateTransaction(id, updates){ const tx=transactions.find(t=>t.id===id || t.dbId===id); setTransactions(prev=>prev.map(t=>t.id===id || t.dbId===id ? {...t,...Object.fromEntries(Object.entries(updates).filter(([,v])=>v!==undefined))} : t)); await safe('update transaction', () => api.transactions.update(tx?.dbId || id, transactionPayload({...tx,...updates})), refreshAll); }
  async function issuePartsForAssessment(id, issuedPartsNote='', issuedPartsOverride=null){ 
    const assessment=assessments.find(a=>a.id===id || a.dbId===id); 
    if(!assessment) return; 
    const issuedParts = issuedPartsOverride || assessment.parts || [];
    setInventory(prev=>prev.map(part=>{ 
      const needed=issuedParts.find(p=>p.partId===part.id || p.sku===part.sku || p.name===part.name); 
      return needed ? {...part, stock:Math.max(0, Number(part.stock)-Number(needed.qty || 1))} : part; 
    })); 
    setAssessments(prev=>prev.map(a=>a.id===id || a.dbId===id ? {...a,status:'Parts Issued',issuedPartsNote,parts:issuedParts} : a)); 
    setNotifications(prev=>[`Parts issued for ${assessment.id} / ${assessment.vehicle}. Inventory deducted and mechanic can start garage work.`, ...prev]); 
    await safe('issue parts', () => api.assessments.issueParts(assessment.dbId || id, { parts: issuedParts, issuedParts, issuedPartsNote, validateParts: true }), refreshAll); 
  }

  async function createGuestTicket(data){ 
    const c = catalogByPlate(data.plate); 
    const draft = { id:`GST-${Date.now()}`, status:'Pending', createdAt:nowLocalInput(), ...c, ...data, plate:String(data.plate||'').toUpperCase(), vin:data.vin || c?.vin || '', model:data.model || c?.model || '', cc:data.cc || c?.cc || '', imageUrl:data.imageUrl || c?.imageUrl || '', type:data.type || c?.type || 'Quad' }; 
    const saved = await api.guestTickets.create({ ...draft, vehicleType:draft.type }).catch(() => null);
    const ticket = saved ? normalizeGuestTicket(saved) : draft;
    const updatedGuestTickets = [ticket, ...guestTickets.filter(t => t.id !== ticket.id)];
    setGuestTickets(updatedGuestTickets);
    localStorage.setItem('valle-guest-tickets', JSON.stringify(updatedGuestTickets)); 
    setNotifications(prev=>[`Guest garage drop-off ${ticket.id} created for ${ticket.plate}. Mechanic action required.`, ...prev]); 
    return ticket; 
  }

  async function updateGuestTicket(ticketId, updates){
    const updated = guestTickets.map(t => t.id === ticketId ? { ...t, ...updates } : t);
    setGuestTickets(updated);
    localStorage.setItem('valle-guest-tickets', JSON.stringify(updated));
    await safe('update guest ticket', () => api.guestTickets.update(ticketId, updates), refreshAll);
  }

  async function takeGuestTicket(ticketId, extra={}){ 
    const ticket=guestTickets.find(t=>t.id===ticketId); 
    if(!ticket) return null; 
    if(!extra || !String(extra.issue || '').trim()){
      throw new Error('Mechanic assessment issue is required before taking this guest ticket.');
    }
    const vehicle=await addVehicle({ 
      ...ticket, 
      ...extra, 
      ownership:'External', 
      owner:ticket.companyName || ticket.name || 'Guest Drop-off', 
      deliveryPersonName:ticket.deliveryPersonName || ticket.name, 
      contactNumber:ticket.contactNumber, 
      email:ticket.email, 
      checkInDateTime:ticket.createdAt || nowLocalInput(), 
      status:'Under Repair', 
      mechanic:currentUser?.name || extra.mechanic || '', 
      notes:`Guest ticket ${ticket.id}. ${ticket.notes || ''}` 
    }); 
    const assessment = await addAssessment({ 
      vehicleId: vehicle.id, 
      vehicle: vehicle.plate, 
      issue: extra.issue, 
      conclusion: extra.conclusion || `Created from guest ticket ${ticket.id}.`, 
      parts: extra.parts || [], 
      mechanic: currentUser?.name || extra.mechanic || 'Mechanic' 
    });
    const updated = guestTickets.map(t=>t.id===ticketId ? {...t,status:'Taken',takenBy:currentUser?.name,takenAt:nowLocalInput(),vehicleId:vehicle.id,assessmentId:assessment?.id} : t);
    setGuestTickets(updated);
    localStorage.setItem('valle-guest-tickets', JSON.stringify(updated));
    setNotifications(prev=>[`Guest ticket ${ticket.id} taken by ${currentUser?.name || 'mechanic'}, vehicle ${vehicle.plate} created/updated and assessment ${assessment?.id} opened.`, ...prev]); 
    return { vehicle, assessment }; 
  }


  async function createInventoryItem(data){
    const local={ id:`PART-${Date.now()}`, ...data, name:data.name || data.part, sku:data.sku || `SKU-${Date.now()}`, stock:Number(data.stock ?? data.currentStock ?? 0), currentStock:Number(data.stock ?? data.currentStock ?? 0), costPrice:Number(data.costPrice || 0), sellingPrice:Number(data.sellingPrice ?? data.lastPrice ?? 0), lastPrice:Number(data.sellingPrice ?? data.lastPrice ?? 0), supplier:data.supplier || data.supplierName || '' };
    setInventory(prev=>[local,...prev]);
    await safe('create inventory item', () => api.inventory.create({ sku:local.sku, name:local.name, category:local.category, currentStock:Number(local.stock||0), reorderLevel:Number(local.reorderLevel||0), costPrice:Number(local.costPrice||0), sellingPrice:Number(local.sellingPrice||0), supplierName:local.supplier, supplierEmail:local.supplierEmail, location:local.location }), refreshAll);
    return local;
  }
  async function updateInventoryItem(id, updates){
    const item=inventory.find(i=>i.id===id || i.dbId===id);
    const merged={...(item||{}),...updates};
    setInventory(prev=>prev.map(i=>i.id===id || i.dbId===id ? merged : i));
    await safe('update inventory item', () => api.inventory.update(item?.dbId || id, { sku:merged.sku, name:merged.name || merged.part, category:merged.category, currentStock:Number(merged.stock ?? merged.currentStock ?? 0), reorderLevel:Number(merged.reorderLevel||0), costPrice:Number(merged.costPrice||0), sellingPrice:Number(merged.sellingPrice ?? merged.lastPrice ?? 0), supplierName:merged.supplier || merged.supplierName, supplierEmail:merged.supplierEmail, location:merged.location }), refreshAll);
  }
  async function addInventoryStock(id, quantity, reason='New stock input'){ const item=inventory.find(i=>i.id===id || i.dbId===id); setInventory(prev=>prev.map(i=>i.id===id || i.dbId===id ? {...i, stock:Number(i.stock||0)+Number(quantity||0)} : i)); await safe('add inventory stock', () => api.inventory.addStock(item?.dbId || id, { quantity:Number(quantity||0), reason }), refreshAll); }
  async function addFuelConsumption(data){ const vehicle=vehicles.find(v=>v.id===data.vehicleId || v.dbId===data.vehicleId); const local={ id:`FUEL-${Date.now()}`, ...data, vehicle:vehicle?.plate || data.vehicle, recordedAt:data.recordedAt || nowLocalInput() }; setFuelConsumptions(prev=>[local,...prev]); await safe('add fuel consumption', () => api.fuelConsumptions.create({ vehicleId:vehicle?.dbId || data.vehicleId, fuelType:data.fuelType, meterType:data.meterType, meterReading:Number(data.meterReading || 0), fuelLitres:Number(data.fuelLitres || 0), notes:data.notes, recordedAt:data.recordedAt || undefined, vehiclePlate: vehicle?.plate || data.vehicle }), refreshAll); return local; }
  async function addVehicleOutActivity(data){ const vehicle=vehicles.find(v=>v.id===data.vehicleId || v.dbId===data.vehicleId); const local={ id:`OUT-${Date.now()}`, ...data, vehicle:vehicle?.plate || data.vehicle, startDateTime:data.startDateTime || nowLocalInput() }; setVehicleOutActivities(prev=>[local,...prev]); await safe('add vehicle out activity', () => api.vehicleOut.create({ vehicleId:vehicle?.dbId || data.vehicleId, activityType:data.activityType, destination:data.destination, driverName:data.driverName, invoiceNumber:data.invoiceNumber, guideName:data.guideName, quadActivity:data.quadActivity, tripDuration:data.tripDuration, startDateTime:data.startDateTime || undefined, endDateTime:data.endDateTime || undefined, vehiclePlate: vehicle?.plate || data.vehicle, notes:data.notes }), refreshAll); return local; }


  async function createSupportRequest(payload) {
    const saved = await safe('create support request', () => api.supportRequests.create(payload), null);
    if (saved) {
      const normalized = normalizeSupportRequest(saved);
      setSupportRequests(prev => [normalized, ...prev.filter(x => x.id !== normalized.id)]);
      return normalized;
    }
    return null;
  }

  async function updateSupportRequest(id, payload) {
    const saved = await safe('update support request', () => api.supportRequests.update(id, payload), null);
    if (saved) {
      const normalized = normalizeSupportRequest(saved);
      setSupportRequests(prev => prev.map(x => x.id === id || x.dbId === id ? normalized : x));
      return normalized;
    }
    return null;
  }

  const frequentAlerts = useMemo(() => { const counts={}; garageOps.forEach(g=>{ const key=normPlate(g.vehicle); if(key) counts[key]=(counts[key]||0)+1; }); return Object.entries(counts).filter(([,c])=>c>=3).map(([plate,c])=>`Attention: ${plate} has ${c} garage records and may need deeper inspection.`); }, [garageOps]);
  const searchIndex = useMemo(() => [ ...vehicles.map(item=>({ type:'Vehicle', label:`${item.plate} - ${item.model || item.type}`, path:`/vehicles/${encodeURIComponent(item.plate)}`, keywords:JSON.stringify(item) })), ...vehicleCatalog.slice(0,80).map(item=>({ type:'Vehicle Master', label:`${item.plate} - ${item.model || item.type}`, path:`/vehicles/${encodeURIComponent(item.plate)}`, keywords:JSON.stringify(item) })), ...assessments.map(item=>({ type:'Assessment', label:`${item.id} - ${item.vehicle}`, path:'/assessments', keywords:JSON.stringify(item) })), ...inventory.map(item=>({ type:'Part', label:`${item.sku} - ${item.name}`, path:'/inventory', keywords:JSON.stringify(item) })), ...garageOps.map(item=>({ type:'Garage Work', label:`${item.id} - ${item.vehicle}`, path:'/garage', keywords:JSON.stringify(item) })), ...transactions.map(item=>({ type:'Transaction', label:`${item.id} - ${item.item}`, path:'/transactions', keywords:JSON.stringify(item) })) ], [vehicles, assessments, inventory, garageOps, transactions]);

  const value = { apiStatus, appLoading: loadingCount > 0, appMessage, notify, clearAppMessage, reportAnalytics, supportRequests, createSupportRequest, updateSupportRequest, currentUser, users, mechanics, lastVehicleForAssessment, setLastVehicleForAssessment, addUser, updateUserAdmin, resetUserPassword, removeUserLogin, login, guestLogin, logout, can, refreshAll, vehicles, addVehicle, updateVehicle, createVehicleFromTransaction, inventory, setInventory, createInventoryItem, updateInventoryItem, addInventoryStock, fuelConsumptions, addFuelConsumption, vehicleOutActivities, addVehicleOutActivity, assessments, addAssessment, updateAssessment, reopenAssessment, completeAssessment, issuePartsForAssessment, garageOps, addGarageOp, updateGarageOp, transactions, createTransaction, createPO, updateTransaction, notifications:[...frequentAlerts,...notifications], setNotifications, guestTickets, updateGuestTicket, createGuestTicket, takeGuestTicket, vehicleCatalog, findVehicleByPlate, getVehicleHistory, exportVehicleHistory, searchIndex, fileNames:(list)=>Array.from(list||[]).map(f=>f.name).join(', '), nowLocalInput, todayLocal };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
