import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, clearSession, saveSession } from '../services/api.js';
import { users as seedUsers, vehicles as seedVehicles, inventory as seedInventory, assessments as seedAssessments, garageOps as seedGarageOps, transactions as seedTransactions } from '../data/seedData.js';

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

const roleAccess = {
  admin: ['dashboard', 'vehicles', 'assessments', 'inventory', 'garage', 'transactions', 'reports', 'settings'],
  mechanic: ['dashboard', 'vehicles', 'assessments', 'garage'],
  store: ['dashboard', 'vehicles', 'assessments', 'inventory', 'transactions', 'reports']
};

const roleToApi = { admin: 'ADMIN', mechanic: 'MECHANIC', store: 'STORE_KEEPER' };
const apiToRole = { ADMIN: 'admin', MECHANIC: 'mechanic', STORE_KEEPER: 'store' };
const roleLabel = { admin: 'Admin', mechanic: 'Mechanic', store: 'Store Keeper' };
const statusToApi = {
  'Active': 'ACTIVE',
  'Under Repair': 'UNDER_REPAIR',
  'Out of Service': 'OUT_OF_SERVICE',
  'Build in Progress': 'BUILD_IN_PROGRESS',
  'Built and Testing': 'BUILT_TESTING',
  'Delivered': 'DELIVERED'
};
const apiToStatus = Object.fromEntries(Object.entries(statusToApi).map(([k, v]) => [v, k]));
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

const nextId = (prefix, length, offset = 1) => `${prefix}-${String(offset).padStart(length, '0')}`;
const fileNames = (list) => Array.from(list || []).map(file => file.name).join(', ');
const arr = (v) => Array.isArray(v) ? v : [];
const normalizeDate = (value) => value ? String(value).slice(0, 16) : '';

function normalizeUser(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: apiToRole[u.role] || u.role || 'mechanic',
    label: roleLabel[apiToRole[u.role] || u.role] || u.role || 'User',
    password: ''
  };
}
function normalizeVehicle(v) {
  return {
    id: v.id,
    plate: v.plateNumber || v.plate || '',
    vin: v.vin || '',
    type: v.vehicleType || v.type || 'Quad',
    ownership: v.ownership === 'EXTERNAL' ? 'External' : v.ownership === 'CUSTOMER_ORDER' ? 'External' : v.ownership || 'Internal',
    owner: v.ownerName || v.owner || '',
    companyName: v.companyName || '',
    deliveryPersonName: v.deliveryPersonName || '',
    contactNumber: v.contactNumber || '',
    email: v.email || '',
    manufacturer: v.manufacturer || 'CFMOTO',
    status: apiToStatus[v.status] || v.status || 'Active',
    hours: v.currentHourMeter ?? v.hours ?? 0,
    nextService: v.nextServiceDueAtHours ?? v.nextService ?? 100,
    checkInDateTime: normalizeDate(v.checkInDateTime),
    expectedDeliveryDate: v.expectedDeliveryDate ? String(v.expectedDeliveryDate).slice(0, 10) : '',
    notes: v.notes || '',
    mechanic: v.mechanic || '',
    sourceTransactionId: v.transactionId || v.sourceTransactionId || ''
  };
}
function normalizeInventory(i) {
  return {
    id: i.id,
    sku: i.sku,
    name: i.name,
    category: i.category || '',
    barcode: i.barcode || '',
    stock: i.currentStock ?? i.stock ?? 0,
    reorderLevel: i.reorderLevel ?? 0,
    lastPrice: Number(i.sellingPrice || i.costPrice || i.lastPrice || 0),
    supplier: i.supplierName || i.supplier || '',
    supplierEmail: i.supplierEmail || '',
    location: i.location || ''
  };
}
function normalizeAssessment(a) {
  const v = a.vehicle ? normalizeVehicle(a.vehicle) : null;
  return {
    id: a.ticketNo || a.id,
    dbId: a.id,
    vehicleId: a.vehicleId,
    vehicle: v?.plate || a.vehicle || '',
    mechanic: a.mechanic?.name || a.mechanic || '',
    issue: a.issuesDetected || a.issue || '',
    conclusion: a.conclusion || '',
    parts: arr(a.requiredParts || a.parts).map(p => ({ partId: p.partId || p.id || 'manual', name: p.name || p.partName || p.part || '', qty: Number(p.qty || p.quantity || 1) })),
    status: apiToAssessment[a.status] || a.status || 'Opened',
    reopenedBy: a.reopenedBy?.name || a.reopenedBy || '',
    reopenReason: a.reopenReason || '',
    issuedPartsNote: a.issuedPartsNote || '',
    photos: arr(a.photos),
    createdAt: a.createdAt ? new Date(a.createdAt).toLocaleString() : ''
  };
}
function normalizeGarage(g) {
  const v = g.vehicle ? normalizeVehicle(g.vehicle) : null;
  const a = g.assessment ? normalizeAssessment(g.assessment) : null;
  return {
    id: g.processNo || g.id,
    dbId: g.id,
    vehicleId: g.vehicleId,
    vehicle: v?.plate || g.vehicle || '',
    assessmentId: a?.id || g.assessmentId || '',
    transactionId: g.transactionId || '',
    type: apiToGarage[g.processType] || g.type || 'Repair',
    mechanic: g.mechanic?.name || g.mechanic || '',
    checkInDateTime: normalizeDate(g.checkInDateTime),
    start: normalizeDate(g.startDateTime) || g.start || '',
    end: normalizeDate(g.endDateTime) || g.end || 'Pending',
    labor: g.laborHours ? `${g.laborHours} hrs` : g.labor || '0 hrs',
    expectedDeliveryDate: g.expectedDeliveryDate ? String(g.expectedDeliveryDate).slice(0, 10) : '',
    status: apiToGarageStatus[g.status] || g.status || 'Pending',
    paymentStatus: g.paymentDone ? 'Paid' : g.paymentStatus || 'Pending',
    invoiceFile: g.invoiceAttachmentUrl || g.invoiceFile || '',
    workDone: g.proceduresPerformed || g.workDone || '',
    partsUsed: arr(g.partsUsed).map(p => ({ name: p.name || p.partName || p.part || '', qty: Number(p.qty || p.quantity || 1) })),
    photos: arr(g.photos)
  };
}
function normalizeTransaction(t) {
  return {
    id: t.transactionNo || t.id,
    dbId: t.id,
    type: apiToTxType[t.type] || t.type || 'External Vehicle Order',
    supplier: t.supplierName || t.supplier || t.customerName || '',
    supplierEmail: t.supplierEmail || '',
    item: t.title || t.item || '',
    quantity: t.quantity || 1,
    status: apiToTxStatus[t.status] || t.status || 'Pending',
    poNumber: t.poNumber || '',
    poFile: t.poAttachmentUrl || t.poFile || '',
    invoiceFile: t.invoiceAttachmentUrl || t.invoiceFile || '',
    grn: t.grnData || null,
    amount: Number(t.amount || 0),
    startDate: t.startDate ? String(t.startDate).slice(0, 10) : '',
    expectedDeliveryDate: t.expectedDeliveryDate ? String(t.expectedDeliveryDate).slice(0, 10) : '',
    notes: t.notes || '',
    message: t.message || ''
  };
}
function normalizeNotification(n) {
  return typeof n === 'string' ? n : `${n.title || 'Notification'}: ${n.message || ''}`;
}

function vehiclePayload(v) {
  return {
    plateNumber: v.plate,
    vin: v.vin || undefined,
    vehicleType: v.type === 'Other' ? v.customType || 'Other' : v.type,
    ownership: v.ownership === 'External' ? (v.sourceTransactionId ? 'CUSTOMER_ORDER' : 'EXTERNAL') : 'INTERNAL',
    ownerName: v.owner || undefined,
    companyName: v.companyName || undefined,
    deliveryPersonName: v.deliveryPersonName || undefined,
    contactNumber: v.contactNumber || undefined,
    email: v.email || undefined,
    manufacturer: v.manufacturer || 'CFMOTO',
    status: statusToApi[v.status] || 'ACTIVE',
    currentHourMeter: Number(v.hours || 0),
    checkInDateTime: v.checkInDateTime ? new Date(v.checkInDateTime).toISOString() : undefined,
    expectedDeliveryDate: v.expectedDeliveryDate ? new Date(v.expectedDeliveryDate).toISOString() : undefined,
    notes: v.notes || undefined,
    transactionId: v.sourceTransactionId || undefined
  };
}
function assessmentPayload(data) {
  return {
    vehicleId: data.vehicleId,
    status: assessmentToApi[data.status] || 'OPEN',
    issuesDetected: data.issue,
    conclusion: data.conclusion || undefined,
    requiredParts: arr(data.parts).map(p => ({ partName: p.name, quantity: Number(p.qty || 1), partId: p.partId })),
    photos: arr(data.photos)
  };
}
function garagePayload(data) {
  return {
    vehicleId: data.vehicleId,
    assessmentId: data.assessmentId || undefined,
    processType: garageToApi[data.type] || 'REPAIR',
    status: garageStatusToApi[data.status] || 'IN_PROGRESS',
    proceduresPerformed: data.workDone || undefined,
    partsUsed: arr(data.partsUsed).map(p => ({ partName: p.name, quantity: Number(p.qty || 1) })),
    checkInDateTime: data.checkInDateTime ? new Date(data.checkInDateTime).toISOString() : undefined,
    startDateTime: data.start ? new Date(data.start).toISOString() : undefined,
    laborHours: parseFloat(String(data.labor || '0').replace(/[^0-9.]/g, '')) || undefined,
    invoiceAttachmentUrl: data.invoiceFile || undefined,
    paymentDone: data.paymentStatus === 'Paid',
    photos: arr(data.photos)
  };
}
function transactionPayload(t) {
  return {
    type: txTypeToApi[t.type] || 'VEHICLE_ORDER',
    status: txStatusToApi[t.status] || 'PENDING',
    title: t.item || t.title || 'Transaction',
    supplierName: t.supplier || undefined,
    supplierEmail: t.supplierEmail || undefined,
    customerName: t.customerName || undefined,
    startDate: t.startDate ? new Date(t.startDate).toISOString() : undefined,
    expectedDeliveryDate: t.expectedDeliveryDate ? new Date(t.expectedDeliveryDate).toISOString() : undefined,
    poNumber: t.poNumber || undefined,
    poAttachmentUrl: t.poFile || undefined,
    invoiceAttachmentUrl: t.invoiceFile || undefined,
    amount: Number(t.amount || 0),
    notes: t.notes || t.message || undefined
  };
}

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('valle-user');
    return saved ? JSON.parse(saved) : null;
  });
  const [users, setUsers] = useState(seedUsers.map(u => ({ ...u, email: u.email.replace('@valle.com', '@vallepark.com') })));
  const [vehicles, setVehicles] = useState(seedVehicles);
  const [inventory, setInventory] = useState(seedInventory);
  const [assessments, setAssessments] = useState(seedAssessments);
  const [garageOps, setGarageOps] = useState(seedGarageOps);
  const [transactions, setTransactions] = useState(seedTransactions);
  const [apiStatus, setApiStatus] = useState('offline');
  const [notifications, setNotifications] = useState([
    'Drive Belt is below reorder level.',
    'ASM-1001 is opened and waiting for parts.',
    'PRC-503 build ticket is in progress for external customer order.',
    'External vehicle order TX-9002 is build in progress.'
  ]);

  async function safe(label, fn, after) {
    try {
      const data = await fn();
      setApiStatus('online');
      after?.(data);
      return data;
    } catch (err) {
      console.warn(`[API fallback] ${label}:`, err.message);
      setApiStatus('offline');
      setNotifications(prev => [`API warning: ${label} did not reach backend. Working locally until backend is ready.`, ...prev.slice(0, 8)]);
      return null;
    }
  }

  async function refreshAll() {
    await Promise.all([
      safe('load users', () => api.users.list(), data => setUsers(arr(data).map(normalizeUser))),
      safe('load vehicles', () => api.vehicles.list(), data => setVehicles(arr(data).map(normalizeVehicle))),
      safe('load inventory', () => api.inventory.list(), data => setInventory(arr(data).map(normalizeInventory))),
      safe('load assessments', () => api.assessments.list(), data => setAssessments(arr(data).map(normalizeAssessment))),
      safe('load garage work', () => api.garageOps.list(), data => setGarageOps(arr(data).map(normalizeGarage))),
      safe('load transactions', () => api.transactions.list(), data => setTransactions(arr(data).map(normalizeTransaction))),
      safe('load notifications', () => api.notifications.list(roleToApi[currentUser?.role] || ''), data => setNotifications(arr(data).map(normalizeNotification)))
    ]);
  }

  useEffect(() => { if (currentUser) refreshAll(); }, [currentUser?.id]);

  async function login(role, email, password) {
    const localEmail = (email || '').replace('@valle.com', '@vallepark.com');
    const loginEmails = [email, localEmail, email?.replace('@vallepark.com', '@valle.com')].filter(Boolean);
    for (const candidate of loginEmails) {
      try {
        const res = await api.login(candidate, password);
        const token = res.access_token || res.accessToken || res.token;
        const apiUser = normalizeUser(res.user || { email: candidate, role: roleToApi[role], name: roleLabel[role] });
        const user = { ...apiUser, role, label: roleLabel[role], email: localEmail || apiUser.email };
        saveSession(token, user);
        setCurrentUser(user);
        setApiStatus('online');
        return { ok: true };
      } catch {}
    }
    const fallback = users.find(u => u.role === role && (u.email === localEmail || u.email === email) && (u.password === password || password));
    if (!fallback) return { ok: false, message: 'Invalid email or password for selected role.' };
    setCurrentUser(fallback);
    localStorage.setItem('valle-user', JSON.stringify(fallback));
    return { ok: true };
  }

  function logout() { clearSession(); setCurrentUser(null); }
  function can(section) { return !!currentUser && roleAccess[currentUser.role]?.includes(section); }

  async function addUser(user) {
    const normalized = { ...user, email: user.email?.includes('@') ? user.email : `${user.email}@vallepark.com` };
    const role = normalized.role === 'Admin' ? 'admin' : normalized.role === 'Store Keeper' ? 'store' : normalized.role || 'mechanic';
    const localUser = { id: `USR-${users.length + 1}`, name: normalized.name, email: normalized.email, role, label: roleLabel[role], password: normalized.password || 'password123' };
    setUsers(prev => [localUser, ...prev]);
    await safe('create user', () => api.users.create({ name: localUser.name, email: localUser.email.replace('@vallepark.com', '@valle.com'), password: localUser.password, role: roleToApi[role], isActive: true }), refreshAll);
    return localUser;
  }

  async function addVehicle(vehicle) {
    const index = vehicles.length + 1;
    const type = vehicle.type === 'Other' ? vehicle.customType || 'Other' : vehicle.type;
    const newVehicle = { ...vehicle, type, id: nextId('V', 3, index), plate: vehicle.plate || vehicle.plateNumber, photos: vehicle.photos || [], hours: Number(vehicle.hours || 0), nextService: Number(vehicle.nextService || 100), status: vehicle.status || 'Active', checkInDateTime: vehicle.checkInDateTime || new Date().toISOString().slice(0, 16) };
    setVehicles(prev => [newVehicle, ...prev]);
    setNotifications(prev => [`Vehicle ${newVehicle.plate} registered with status ${newVehicle.status}.`, ...prev]);
    await safe('create vehicle', () => api.vehicles.create(vehiclePayload(newVehicle)), refreshAll);
    return newVehicle;
  }

  async function createVehicleFromTransaction(transactionId, vehicleData = {}) {
    const tx = transactions.find(t => t.id === transactionId || t.dbId === transactionId);
    const vehicle = await addVehicle({ plate: vehicleData.plate || `BUILD-${transactions.length + vehicles.length + 1}`, vin: vehicleData.vin || `PENDING-${transactionId}`, type: vehicleData.type || 'Quad', customType: vehicleData.customType || '', ownership: 'External', owner: tx?.supplier || vehicleData.owner || 'External Customer', companyName: tx?.supplier || vehicleData.companyName || '', deliveryPersonName: vehicleData.deliveryPersonName || '', contactNumber: vehicleData.contactNumber || '', email: tx?.supplierEmail || vehicleData.email || '', checkInDateTime: vehicleData.checkInDateTime || new Date().toISOString().slice(0, 16), status: 'Build in Progress', hours: 0, nextService: 100, mechanic: vehicleData.mechanic || 'Workshop Team', expectedDeliveryDate: tx?.expectedDeliveryDate || vehicleData.expectedDeliveryDate || '', sourceTransactionId: tx?.dbId || transactionId, notes: `Vehicle created from ${tx?.poNumber || transactionId}. ${vehicleData.notes || ''}` });
    await addGarageOp({ vehicleId: vehicle.id, assessmentId: '', transactionId, type: 'Build / Assembly', checkInDateTime: vehicle.checkInDateTime, expectedDeliveryDate: vehicle.expectedDeliveryDate, workDone: 'Assembly ticket created from purchase order. Mechanic to update build progress.', labor: '0 hrs', status: 'Build in Progress', mechanic: vehicle.mechanic });
    updateTransaction(transactionId, { status: 'Build in Progress', linkedVehicleId: vehicle.id });
    return vehicle;
  }

  async function addAssessment(data) {
    const vehicle = vehicles.find(v => v.id === data.vehicleId);
    const newAssessment = { id: `ASM-${1000 + assessments.length + 1}`, vehicleId: data.vehicleId, vehicle: vehicle?.plate || data.vehicle || data.manualVehicle, mechanic: currentUser?.name || data.mechanic, issue: data.issue, conclusion: data.conclusion, parts: data.parts || [], status: 'Opened', reopenedBy: '', reopenReason: '', photos: data.photos || [], createdAt: new Date().toLocaleString() };
    setAssessments(prev => [newAssessment, ...prev]);
    setNotifications(prev => [`New assessment ${newAssessment.id} opened for ${newAssessment.vehicle}. Store keeper can review required parts.`, ...prev]);
    await safe('create assessment', () => api.assessments.create(assessmentPayload(newAssessment)), refreshAll);
    return newAssessment;
  }
  async function updateAssessment(id, updates) {
    setAssessments(prev => prev.map(a => a.id === id || a.dbId === id ? { ...a, ...updates } : a));
    const item = assessments.find(a => a.id === id || a.dbId === id);
    await safe('update assessment', () => api.assessments.update(item?.dbId || id, assessmentPayload({ ...item, ...updates })), refreshAll);
  }
  async function reopenAssessment(id, reason) {
    const item = assessments.find(a => a.id === id || a.dbId === id);
    setAssessments(prev => prev.map(a => a.id === id || a.dbId === id ? { ...a, status: 'Opened', reopenReason: reason, reopenedBy: currentUser?.label || currentUser?.role } : a));
    await safe('reopen assessment', () => api.assessments.reopen(item?.dbId || id, reason), refreshAll);
  }
  async function completeAssessment(id) {
    const item = assessments.find(a => a.id === id || a.dbId === id);
    setAssessments(prev => prev.map(a => a.id === id || a.dbId === id ? { ...a, status: 'Completed' } : a));
    await safe('complete assessment', () => api.assessments.complete(item?.dbId || id), refreshAll);
  }

  async function addGarageOp(data) {
    const vehicle = vehicles.find(v => v.id === data.vehicleId);
    const assessment = assessments.find(a => a.id === data.assessmentId || a.dbId === data.assessmentId);
    const op = { id: `PRC-${500 + garageOps.length + 1}`, vehicleId: data.vehicleId, vehicle: vehicle?.plate || data.manualVehicle || data.vehicle, assessmentId: data.assessmentId || '', transactionId: data.transactionId || '', type: data.type, mechanic: data.mechanic || currentUser?.name || 'Workshop Team', checkInDateTime: data.checkInDateTime || new Date().toISOString().slice(0, 16), start: data.start || new Date().toISOString().slice(0, 16), end: data.end || 'Pending', labor: data.labor || '0 hrs', expectedDeliveryDate: data.expectedDeliveryDate || vehicle?.expectedDeliveryDate || '', status: data.status || 'Ongoing', paymentStatus: data.paymentStatus || 'Pending', invoiceFile: data.invoiceFile || '', workDone: data.workDone, partsUsed: data.partsUsed || assessment?.parts || [], photos: data.photos || [] };
    setGarageOps(prev => [op, ...prev]);
    setNotifications(prev => [`Garage operation ${op.id} started for ${op.vehicle}.`, ...prev]);
    await safe('create garage operation', () => api.garageOps.create(garagePayload({ ...op, vehicleId: vehicle?.dbId || vehicle?.id || op.vehicleId, assessmentId: assessment?.dbId || undefined })), refreshAll);
    return op;
  }
  async function updateGarageOp(id, updates) {
    const op = garageOps.find(g => g.id === id || g.dbId === id);
    setGarageOps(prev => prev.map(g => g.id === id || g.dbId === id ? { ...g, ...updates } : g));
    await safe('update garage operation', () => api.garageOps.update(op?.dbId || id, garagePayload({ ...op, ...updates })), refreshAll);
  }

  async function createTransaction(data) {
    const tx = { id: `TX-${9000 + transactions.length + 1}`, type: data.type || 'External Vehicle Order', supplier: data.supplier || data.customerName || 'Supplier / Customer', supplierEmail: data.supplierEmail || data.customerEmail || '', item: data.item || 'Vehicle Order', quantity: Number(data.quantity || 1), status: data.status || 'Pending', poNumber: data.poNumber || `PO-${Math.floor(10000 + Math.random() * 89999)}`, poFile: data.poFile || '', invoiceFile: data.invoiceFile || '', grn: null, amount: Number(data.amount || 0), startDate: data.startDate || new Date().toISOString().slice(0, 10), expectedDeliveryDate: data.expectedDeliveryDate || '', notes: data.notes || '', message: data.message || `Dear ${data.supplier || data.customerName || 'Supplier'}, please process the attached purchase order.` };
    setTransactions(prev => [tx, ...prev]);
    setNotifications(prev => [`Transaction ${tx.id} created and marked ${tx.status}.`, ...prev]);
    await safe('create transaction', () => api.transactions.create(transactionPayload(tx)), refreshAll);
    return tx;
  }
  function createPO(part, qty = 10, custom = {}) { return createTransaction({ type: custom.type || 'Parts Re-order', supplier: custom.supplier || part.supplier, supplierEmail: custom.supplierEmail || part.supplierEmail, item: custom.item || part.name, quantity: Number(custom.quantity || qty), status: 'Pending', poNumber: custom.poNumber || `PO-${Math.floor(10000 + Math.random() * 89999)}`, poFile: custom.poFile || '', amount: Number(custom.amount || (part.lastPrice * Number(custom.quantity || qty))), startDate: custom.startDate, expectedDeliveryDate: custom.expectedDeliveryDate, notes: custom.notes, message: custom.message || `Dear Supplier, please process the attached purchase order for ${custom.item || part.name}.` }); }
  async function updateTransaction(id, updates) {
    const tx = transactions.find(t => t.id === id || t.dbId === id);
    setTransactions(prev => prev.map(t => t.id === id || t.dbId === id ? { ...t, ...Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined)) } : t));
    await safe('update transaction', () => api.transactions.update(tx?.dbId || id, transactionPayload({ ...tx, ...updates })), refreshAll);
  }
  async function issuePartsForAssessment(id, issuedPartsNote = '') {
    const assessment = assessments.find(a => a.id === id || a.dbId === id);
    if (!assessment) return;
    setInventory(prev => prev.map(part => { const needed = assessment.parts.find(p => p.partId === part.id); return needed ? { ...part, stock: Math.max(0, Number(part.stock) - Number(needed.qty)) } : part; }));
    setAssessments(prev => prev.map(a => a.id === id || a.dbId === id ? { ...a, status: 'Completed', issuedPartsNote } : a));
    await safe('issue parts', () => api.assessments.issueParts(assessment.dbId || id, { issuedParts: assessment.parts, issuedPartsNote }), refreshAll);
  }

  const searchIndex = useMemo(() => [
    ...vehicles.map(item => ({ type: 'Vehicle', label: `${item.plate} - ${item.type}`, path: '/vehicles', keywords: JSON.stringify(item) })),
    ...assessments.map(item => ({ type: 'Assessment', label: `${item.id} - ${item.vehicle}`, path: '/assessments', keywords: JSON.stringify(item) })),
    ...inventory.map(item => ({ type: 'Part', label: `${item.sku} - ${item.name}`, path: '/inventory', keywords: JSON.stringify(item) })),
    ...garageOps.map(item => ({ type: 'Garage Work', label: `${item.id} - ${item.vehicle}`, path: '/garage', keywords: JSON.stringify(item) })),
    ...transactions.map(item => ({ type: 'Transaction', label: `${item.id} - ${item.item}`, path: '/transactions', keywords: JSON.stringify(item) }))
  ], [vehicles, assessments, inventory, garageOps, transactions]);

  const value = { apiStatus, currentUser, users, addUser, login, logout, can, refreshAll, vehicles, addVehicle, createVehicleFromTransaction, inventory, setInventory, assessments, addAssessment, updateAssessment, reopenAssessment, completeAssessment, issuePartsForAssessment, garageOps, addGarageOp, updateGarageOp, transactions, createTransaction, createPO, updateTransaction, notifications, setNotifications, searchIndex, fileNames };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
