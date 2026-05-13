
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, clearSession, saveSession } from '../services/api.js';
import { users as seedUsers, vehicles as seedVehicles, inventory as seedInventory, assessments as seedAssessments, garageOps as seedGarageOps, transactions as seedTransactions } from '../data/seedData.js';
import { vehicleCatalog } from '../data/vehicleCatalog.js';
import { importedInventory } from '../data/inventoryImport.js';

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

const roleAccess = {
  admin: ['dashboard', 'vehicles', 'assessments', 'inventory', 'garage', 'transactions', 'reports', 'settings', 'notifications'],
  mechanic: ['dashboard', 'vehicles', 'assessments', 'garage', 'guest-pending', 'notifications'],
  store: ['dashboard', 'vehicles', 'assessments', 'inventory', 'transactions', 'reports', 'notifications'],
  guest: ['guest']
};
const roleToApi = { admin: 'ADMIN', mechanic: 'MECHANIC', store: 'STORE_KEEPER' };
const apiToRole = { ADMIN: 'admin', MECHANIC: 'mechanic', STORE_KEEPER: 'store' };
const roleLabel = { admin: 'Admin', mechanic: 'Mechanic', store: 'Store Keeper', guest: 'Guest Drop-off' };
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
function normalizeVehicle(v) { const base = { id: v.id, dbId: v.id, plate: v.plateNumber || v.plate || '', vin: v.vin || '', type: v.vehicleType || v.type || 'Quad', customType: v.customType || '', ownership: v.ownership === 'EXTERNAL' ? 'External' : v.ownership === 'CUSTOMER_ORDER' ? 'External' : v.ownership || 'Internal', owner: v.ownerName || v.owner || 'Vallé Adventure Park', companyName: v.companyName || '', deliveryPersonName: v.deliveryPersonName || '', contactNumber: v.contactNumber || '', email: v.email || '', manufacturer: v.manufacturer || 'CFMOTO', status: apiToStatus[v.status] || v.status || 'Active', hours: Number(v.currentHourMeter ?? v.hours ?? 0), nextService: Number(v.nextServiceDueAtHours ?? v.nextService ?? 100), checkInDateTime: normalizeDate(v.checkInDateTime), expectedDeliveryDate: v.expectedDeliveryDate ? String(v.expectedDeliveryDate).slice(0,10) : '', notes: v.notes || '', mechanic: v.mechanic || '', sourceTransactionId: v.transactionId || v.sourceTransactionId || '', model: v.model || '', cc: v.cc || '', imageUrl: v.imageUrl || '' }; return enrichFromCatalog(base); }
function normalizeInventory(i) { return { id: i.id, dbId: i.id, sku: i.sku, name: i.name, category: i.category || '', barcode: i.barcode || '', stock: Number(i.currentStock ?? i.stock ?? 0), reorderLevel: Number(i.reorderLevel ?? 0), lastPrice: Number(i.sellingPrice || i.costPrice || i.lastPrice || 0), supplier: i.supplierName || i.supplier || '', supplierEmail: i.supplierEmail || '', location: i.location || '' }; }
function normalizeAssessment(a) { const v = a.vehicle ? normalizeVehicle(a.vehicle) : null; return { id: a.ticketNo || a.id, dbId: a.id, vehicleId: a.vehicleId, vehicle: v?.plate || a.vehicle || '', mechanic: a.mechanic?.name || a.mechanic || '', issue: a.issuesDetected || a.issue || '', conclusion: a.conclusion || '', parts: arr(a.requiredParts || a.parts).map(p => ({ partId: p.partId || p.id || 'manual', name: p.name || p.partName || p.part || '', qty: Number(p.qty || p.quantity || 1) })), status: apiToAssessment[a.status] || a.status || 'Opened', reopenedBy: a.reopenedBy?.name || a.reopenedBy || '', reopenReason: a.reopenReason || '', issuedPartsNote: a.issuedPartsNote || '', photos: arr(a.photos), createdAt: a.createdAt ? new Date(a.createdAt).toLocaleString() : '' }; }
function normalizeGarage(g) { const v = g.vehicle ? normalizeVehicle(g.vehicle) : null; const a = g.assessment ? normalizeAssessment(g.assessment) : null; return { id: g.processNo || g.id, dbId: g.id, vehicleId: g.vehicleId, vehicle: v?.plate || g.vehicle || '', assessmentId: a?.id || g.assessmentId || '', transactionId: g.transactionId || '', type: apiToGarage[g.processType] || g.type || 'Repair', mechanic: g.mechanic?.name || g.mechanic || '', checkInDateTime: normalizeDate(g.checkInDateTime), start: normalizeDate(g.startDateTime) || g.start || '', end: normalizeDate(g.endDateTime) || g.end || 'Pending', labor: g.laborHours ? `${g.laborHours} hrs` : g.labor || '0 hrs', expectedDeliveryDate: g.expectedDeliveryDate ? String(g.expectedDeliveryDate).slice(0,10) : '', status: apiToGarageStatus[g.status] || g.status || 'Pending', paymentStatus: g.paymentDone ? 'Paid' : g.paymentStatus || 'Pending', invoiceFile: g.invoiceAttachmentUrl || g.invoiceFile || '', workDone: g.proceduresPerformed || g.workDone || '', partsUsed: arr(g.partsUsed).map(p => ({ name: p.name || p.partName || p.part || '', qty: Number(p.qty || p.quantity || 1) })), photos: arr(g.photos) }; }
function normalizeTransaction(t) { return { id: t.transactionNo || t.id, dbId: t.id, type: apiToTxType[t.type] || t.type || 'External Vehicle Order', supplier: t.supplierName || t.supplier || t.customerName || '', supplierEmail: t.supplierEmail || '', item: t.title || t.item || '', quantity: t.quantity || 1, status: apiToTxStatus[t.status] || t.status || 'Pending', poNumber: t.poNumber || '', poFile: t.poAttachmentUrl || t.poFile || '', invoiceFile: t.invoiceAttachmentUrl || t.invoiceFile || '', grn: t.grnData || null, amount: Number(t.amount || 0), startDate: t.startDate ? String(t.startDate).slice(0,10) : '', expectedDeliveryDate: t.expectedDeliveryDate ? String(t.expectedDeliveryDate).slice(0,10) : '', notes: t.notes || '', message: t.message || '' }; }
function normalizeNotification(n) { return typeof n === 'string' ? n : `${n.title || 'Notification'}: ${n.message || ''}`; }

function vehiclePayload(v) { return { plateNumber: v.plate, vin: v.vin || undefined, vehicleType: v.type === 'Other' ? v.customType || 'Other' : v.type, ownership: v.ownership === 'External' ? (v.sourceTransactionId ? 'CUSTOMER_ORDER' : 'EXTERNAL') : 'INTERNAL', ownerName: v.owner || undefined, companyName: v.companyName || undefined, deliveryPersonName: v.deliveryPersonName || undefined, contactNumber: v.contactNumber || undefined, email: v.email || undefined, manufacturer: v.manufacturer || 'CFMOTO', status: statusToApi[v.status] || 'ACTIVE', currentHourMeter: Number(v.hours || 0), checkInDateTime: v.checkInDateTime ? new Date(v.checkInDateTime).toISOString() : undefined, expectedDeliveryDate: v.expectedDeliveryDate ? new Date(v.expectedDeliveryDate).toISOString() : undefined, notes: [v.notes, v.model ? `Model: ${v.model}` : '', v.cc ? `CC: ${v.cc}` : ''].filter(Boolean).join(' | '), transactionId: v.sourceTransactionId || undefined }; }
function assessmentPayload(data) { return { vehicleId: data.vehicleId, status: assessmentToApi[data.status] || 'OPEN', issuesDetected: data.issue, conclusion: data.conclusion || undefined, requiredParts: arr(data.parts).map(p => ({ partName: p.name, quantity: Number(p.qty || 1), partId: p.partId })), photos: arr(data.photos) }; }
function garagePayload(data) { return { vehicleId: data.vehicleId, assessmentId: data.assessmentId || undefined, processType: garageToApi[data.type] || 'REPAIR', status: garageStatusToApi[data.status] || 'IN_PROGRESS', proceduresPerformed: data.workDone || undefined, partsUsed: arr(data.partsUsed).map(p => ({ partName: p.name, quantity: Number(p.qty || 1) })), checkInDateTime: data.checkInDateTime ? new Date(data.checkInDateTime).toISOString() : undefined, startDateTime: data.start ? new Date(data.start).toISOString() : undefined, laborHours: parseFloat(String(data.labor || '0').replace(/[^0-9.]/g,'')) || 0, invoiceAttachmentUrl: data.invoiceFile || undefined, paymentDone: data.paymentStatus === 'Paid', photos: arr(data.photos) }; }
function transactionPayload(t) { return { type: txTypeToApi[t.type] || 'VEHICLE_ORDER', status: txStatusToApi[t.status] || 'PENDING', title: t.item || 'Transaction', supplierName: t.supplier || undefined, supplierEmail: t.supplierEmail || undefined, customerName: t.customerName || undefined, startDate: t.startDate ? new Date(t.startDate).toISOString() : undefined, expectedDeliveryDate: t.expectedDeliveryDate ? new Date(t.expectedDeliveryDate).toISOString() : undefined, poNumber: t.poNumber || undefined, poAttachmentUrl: t.poFile || undefined, invoiceAttachmentUrl: t.invoiceFile || undefined, amount: Number(t.amount || 0), notes: t.notes || t.message || undefined }; }

function withinDateFilter(dateStr, filter) { if (!filter || filter.type === 'all') return true; const d = dateStr ? new Date(dateStr) : null; if (!d || Number.isNaN(d.getTime())) return true; const now = new Date(); const days = filter.type === 'week' ? 7 : filter.type === 'month' ? 31 : filter.type === 'year' ? 365 : null; if (days) return d >= new Date(now.getTime() - days*24*60*60*1000); if (filter.type === 'manual') { const from = filter.from ? new Date(filter.from) : null; const to = filter.to ? new Date(filter.to + 'T23:59:59') : null; return (!from || d >= from) && (!to || d <= to); } return true; }

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => { const saved = localStorage.getItem('valle-user'); return saved ? JSON.parse(saved) : null; });
  const [users, setUsers] = useState(seedUsers.map(u => normalizeUser({ ...u, email: u.email.replace('@valle.com','@vallepark.com') })));
  const [vehicles, setVehicles] = useState(seedVehicles.map(normalizeVehicle));
  const [inventory, setInventory] = useState([...seedInventory.map(normalizeInventory), ...importedInventory.map(normalizeInventory)]);
  const [assessments, setAssessments] = useState(seedAssessments.map(normalizeAssessment));
  const [garageOps, setGarageOps] = useState(seedGarageOps.map(normalizeGarage));
  const [transactions, setTransactions] = useState(seedTransactions.map(normalizeTransaction));
  const [apiStatus, setApiStatus] = useState('offline');
  const [guestTickets, setGuestTickets] = useState(() => JSON.parse(localStorage.getItem('valle-guest-tickets') || '[]'));
  const [notifications, setNotifications] = useState(['Drive Belt is below reorder level.', 'ASM-1001 is opened and waiting for parts.']);

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

  async function safe(label, fn, after) { try { const data = await fn(); setApiStatus('online'); after?.(data); return data; } catch (err) { console.warn(`[API fallback] ${label}:`, err.message); setApiStatus('offline'); return null; } }
  async function refreshAll() { await Promise.all([ safe('load users', () => api.users.list(), data => setUsers(arr(data).map(normalizeUser))), safe('load vehicles', () => api.vehicles.list(), data => setVehicles(arr(data).map(normalizeVehicle))), safe('load inventory', () => api.inventory.list(), data => setInventory(arr(data).map(normalizeInventory))), safe('load assessments', () => api.assessments.list(), data => setAssessments(arr(data).map(normalizeAssessment))), safe('load garage work', () => api.garageOps.list(), data => setGarageOps(arr(data).map(normalizeGarage))), safe('load transactions', () => api.transactions.list(), data => setTransactions(arr(data).map(normalizeTransaction))), safe('load notifications', () => api.notifications.list(roleToApi[currentUser?.role] || ''), data => setNotifications(arr(data).map(normalizeNotification))) ]); }
  useEffect(() => { if (currentUser && currentUser.role !== 'guest') refreshAll(); }, [currentUser?.id]);

  async function login(role, email, password) { if (role === 'guest') { const user = { id:'guest', name:'Guest Drop-off', role:'guest', label:'Guest Drop-off', email:'guest@vallepark.com' }; setCurrentUser(user); localStorage.setItem('valle-user', JSON.stringify(user)); return { ok:true, guest:true }; } const localEmail = (email || '').replace('@valle.com','@vallepark.com'); const loginEmails = [email, localEmail, email?.replace('@vallepark.com','@valle.com')].filter(Boolean); for (const candidate of loginEmails) { try { const res = await api.login(candidate, password); const token = res.access_token || res.accessToken || res.token; const apiUser = normalizeUser(res.user || { email:candidate, role:roleToApi[role], name:roleLabel[role] }); const user = { ...apiUser, role, label: roleLabel[role], email: localEmail || apiUser.email }; saveSession(token, user); setCurrentUser(user); setApiStatus('online'); return { ok:true }; } catch {} } const fallback = users.find(u => u.role === role && (u.email === localEmail || u.email === email) && (u.password === password || password)); if (!fallback) return { ok:false, message:'Invalid email or password for selected role.' }; setCurrentUser(fallback); localStorage.setItem('valle-user', JSON.stringify(fallback)); return { ok:true }; }
  function guestLogin(){ return login('guest','',''); }
  function logout(){ clearSession(); setCurrentUser(null); }
  function can(section){ return !!currentUser && roleAccess[currentUser.role]?.includes(section); }

  const mechanics = useMemo(() => users.filter(u => u.role === 'mechanic'), [users]);
  function findVehicleByPlate(plate){ const existing = vehicles.find(v => normPlate(v.plate) === normPlate(plate)); return existing || (catalogByPlate(plate) ? normalizeVehicle({ ...catalogByPlate(plate), id:`CAT-${normPlate(plate)}` }) : null); }
  function getVehicleHistory(vehicleRef, filter={type:'all'}){ const v = typeof vehicleRef === 'string' ? (vehicles.find(x => x.id===vehicleRef || normPlate(x.plate)===normPlate(vehicleRef)) || findVehicleByPlate(vehicleRef)) : vehicleRef; if(!v) return { vehicle:null, assessments:[], garageOps:[], parts:[], visits:0, mechanics:[] }; const relatedAssessments = assessments.filter(a => a.vehicleId===v.id || normPlate(a.vehicle)===normPlate(v.plate)).filter(a => withinDateFilter(a.createdAt, filter)); const relatedGarage = garageOps.filter(g => g.vehicleId===v.id || normPlate(g.vehicle)===normPlate(v.plate)).filter(g => withinDateFilter(g.checkInDateTime || g.start, filter)); const parts = [...relatedAssessments.flatMap(a=>a.parts||[]), ...relatedGarage.flatMap(g=>g.partsUsed||[])]; const mechanicNames = [...new Set([...relatedAssessments.map(a=>a.mechanic), ...relatedGarage.map(g=>g.mechanic)].filter(Boolean))]; return { vehicle:v, assessments: relatedAssessments, garageOps: relatedGarage, parts, visits: relatedAssessments.length + relatedGarage.length, mechanics: mechanicNames }; }
  function exportVehicleHistory(vehicleRef, filter, format='csv'){ const h = getVehicleHistory(vehicleRef, filter); if(!h.vehicle) return; const rows = [['Plate',h.vehicle.plate],['VIN',h.vehicle.vin],['Model',h.vehicle.model],['CC',h.vehicle.cc],['Type',h.vehicle.type],[],['Assessments'],['Ticket','Date','Mechanic','Status','Issue','Conclusion','Parts'],...h.assessments.map(a=>[a.id,a.createdAt,a.mechanic,a.status,a.issue,a.conclusion,(a.parts||[]).map(p=>`${p.name} x${p.qty}`).join('; ')]),[],['Garage Operations'],['Process','Check-in','Mechanic','Type','Status','Work Done','Parts Used'],...h.garageOps.map(g=>[g.id,g.checkInDateTime,g.mechanic,g.type,g.status,g.workDone,(g.partsUsed||[]).map(p=>`${p.name} x${p.qty}`).join('; ')])]; const content = rows.map(r=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n'); const blob = new Blob([content], { type: format==='excel' ? 'application/vnd.ms-excel' : 'text/csv' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${h.vehicle.plate}-garage-history.${format==='excel'?'xls':'csv'}`; a.click(); }

  async function addUser(user){ const normalized = { ...user, email: user.email?.includes('@') ? user.email : `${user.email}@vallepark.com` }; const role = normalized.role === 'Admin' ? 'admin' : normalized.role === 'Store Keeper' ? 'store' : normalized.role || 'mechanic'; const localUser = { id:`USR-${users.length+1}`, name:normalized.name, email:normalized.email, role, label:roleLabel[role], password:normalized.password || 'password123' }; setUsers(prev=>[localUser,...prev]); await safe('create user', () => api.users.create({ name:localUser.name, email:localUser.email.replace('@vallepark.com','@valle.com'), password:localUser.password, role:roleToApi[role], isActive:true }), refreshAll); return localUser; }
  async function addVehicle(vehicle){ const index=vehicles.length+1; const catalog = catalogByPlate(vehicle.plate || vehicle.plateNumber) || {}; const type = vehicle.type === 'Other' ? vehicle.customType || 'Other' : vehicle.type || catalog.type || 'Quad'; const newVehicle = normalizeVehicle({ ...catalog, ...vehicle, type, id: vehicle.id || nextId('V',3,index), plate: vehicle.plate || vehicle.plateNumber || catalog.plate, photos: vehicle.photos || [], hours: Number(vehicle.hours || catalog.hours || 0), nextService: Number(vehicle.nextService || 100), status: vehicle.status || 'Active', checkInDateTime: vehicle.checkInDateTime || nowLocalInput() }); setVehicles(prev => { const exists = prev.find(v=>normPlate(v.plate)===normPlate(newVehicle.plate)); return exists ? prev.map(v=>normPlate(v.plate)===normPlate(newVehicle.plate) ? { ...v, ...newVehicle } : v) : [newVehicle, ...prev]; }); setNotifications(prev=>[`Vehicle ${newVehicle.plate} registered/updated with status ${newVehicle.status}.`, ...prev]); await safe('create vehicle', () => api.vehicles.create(vehiclePayload(newVehicle)), refreshAll); return newVehicle; }
  async function updateVehicle(id, updates){ const item = vehicles.find(v=>v.id===id || v.dbId===id || normPlate(v.plate)===normPlate(id)); const updatedItem = normalizeVehicle({ ...(item || {}), ...updates }); setVehicles(prev=>prev.map(v=>v.id===id || v.dbId===id || normPlate(v.plate)===normPlate(id) ? updatedItem : v)); if(item) await safe('update vehicle', () => api.vehicles.update(item.dbId || item.id, vehiclePayload(updatedItem)), refreshAll); return updatedItem; }
  async function createVehicleFromTransaction(transactionId, vehicleData={}){ const tx=transactions.find(t=>t.id===transactionId || t.dbId===transactionId); const vehicle=await addVehicle({ plate:vehicleData.plate || `BUILD-${transactions.length+vehicles.length+1}`, vin:vehicleData.vin || `PENDING-${transactionId}`, type:vehicleData.type || 'Quad', ownership:'External', owner:tx?.supplier || vehicleData.owner || 'External Customer', companyName:tx?.supplier || vehicleData.companyName || '', deliveryPersonName:vehicleData.deliveryPersonName || '', contactNumber:vehicleData.contactNumber || '', email:tx?.supplierEmail || vehicleData.email || '', checkInDateTime:vehicleData.checkInDateTime || nowLocalInput(), status:'Build in Progress', hours:0, nextService:100, mechanic:vehicleData.mechanic || 'Workshop Team', expectedDeliveryDate:tx?.expectedDeliveryDate || vehicleData.expectedDeliveryDate || '', sourceTransactionId:tx?.dbId || transactionId, notes:`Vehicle created from ${tx?.poNumber || transactionId}. ${vehicleData.notes || ''}` }); await addGarageOp({ vehicleId:vehicle.id, assessmentId:'', transactionId, type:'Build / Assembly', checkInDateTime:vehicle.checkInDateTime, expectedDeliveryDate:vehicle.expectedDeliveryDate, workDone:'Assembly ticket created from purchase order. Mechanic to update build progress.', labor:'0 hrs', status:'Build in Progress', mechanic:vehicle.mechanic }); updateTransaction(transactionId,{status:'Build in Progress', linkedVehicleId:vehicle.id}); return vehicle; }
  async function addAssessment(data){ const vehicle = vehicles.find(v=>v.id===data.vehicleId) || findVehicleByPlate(data.vehicle || data.manualVehicle); const newAssessment = { id:`ASM-${1000+assessments.length+1}`, vehicleId:data.vehicleId || vehicle?.id || '', vehicle:vehicle?.plate || data.vehicle || data.manualVehicle, mechanic:currentUser?.name || data.mechanic, issue:data.issue, conclusion:data.conclusion, parts:data.parts || [], status:'Opened', reopenedBy:'', reopenReason:'', photos:data.photos || [], createdAt:new Date().toLocaleString() }; setAssessments(prev=>[newAssessment,...prev]); setNotifications(prev=>[`New assessment ${newAssessment.id} opened for ${newAssessment.vehicle}.`, ...prev]); await safe('create assessment', () => api.assessments.create(assessmentPayload(newAssessment)), refreshAll); return newAssessment; }
  async function updateAssessment(id, updates){ const item=assessments.find(a=>a.id===id || a.dbId===id); setAssessments(prev=>prev.map(a=>a.id===id || a.dbId===id ? {...a,...updates} : a)); if(item) await safe('update assessment', () => api.assessments.update(item.dbId || id, assessmentPayload({...item,...updates})), refreshAll); }
  async function reopenAssessment(id, reason){ const item=assessments.find(a=>a.id===id || a.dbId===id); setAssessments(prev=>prev.map(a=>a.id===id || a.dbId===id ? {...a,status:'Opened',reopenReason:reason,reopenedBy:currentUser?.name || currentUser?.label} : a)); await safe('reopen assessment', () => api.assessments.reopen(item?.dbId || id, reason), refreshAll); }
  async function completeAssessment(id){ const item=assessments.find(a=>a.id===id || a.dbId===id); setAssessments(prev=>prev.map(a=>a.id===id || a.dbId===id ? {...a,status:'Completed'} : a)); await safe('complete assessment', () => api.assessments.complete(item?.dbId || id), refreshAll); }
  async function addGarageOp(data){ const vehicle=vehicles.find(v=>v.id===data.vehicleId) || findVehicleByPlate(data.manualVehicle || data.vehicle); const assessment=assessments.find(a=>a.id===data.assessmentId || a.dbId===data.assessmentId); const op={ id:`PRC-${500+garageOps.length+1}`, vehicleId:data.vehicleId || vehicle?.id || '', vehicle:vehicle?.plate || data.manualVehicle || data.vehicle, assessmentId:data.assessmentId || '', transactionId:data.transactionId || '', type:data.type, mechanic:data.mechanic || currentUser?.name || 'Workshop Team', checkInDateTime:data.checkInDateTime || nowLocalInput(), start:data.start || nowLocalInput(), end:data.end || 'Pending', labor:data.labor || '0 hrs', expectedDeliveryDate:data.expectedDeliveryDate || vehicle?.expectedDeliveryDate || '', status:data.status || 'Ongoing', paymentStatus:data.paymentStatus || (vehicle?.ownership==='Internal'?'None':'Pending'), invoiceFile:data.invoiceFile || '', workDone:data.workDone, partsUsed:data.partsUsed || assessment?.parts || [], photos:data.photos || [] }; setGarageOps(prev=>[op,...prev]); setNotifications(prev=>[`Garage operation ${op.id} started for ${op.vehicle}.`, ...prev]); await safe('create garage operation', () => api.garageOps.create(garagePayload({ ...op, vehicleId: vehicle?.dbId || vehicle?.id || op.vehicleId, assessmentId: assessment?.dbId || undefined })), refreshAll); return op; }
  async function updateGarageOp(id, updates){ const op=garageOps.find(g=>g.id===id || g.dbId===id); setGarageOps(prev=>prev.map(g=>g.id===id || g.dbId===id ? {...g,...updates} : g)); if(updates.status==='Completed') setNotifications(prev=>[`Garage work ${id} completed for ${op?.vehicle || ''}.`, ...prev]); await safe('update garage operation', () => api.garageOps.update(op?.dbId || id, garagePayload({...op,...updates})), refreshAll); }
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
    await safe('issue parts', () => api.assessments.issueParts(assessment.dbId || id, { issuedParts, issuedPartsNote }), refreshAll); 
  }

  async function createGuestTicket(data){ 
    const c = catalogByPlate(data.plate); 
    const ticket = { id:`GST-${Date.now()}`, status:'Pending', createdAt:nowLocalInput(), ...c, ...data, plate:String(data.plate||'').toUpperCase(), vin:data.vin || c?.vin || '', model:data.model || c?.model || '', cc:data.cc || c?.cc || '', imageUrl:data.imageUrl || c?.imageUrl || '', type:data.type || c?.type || 'Quad' }; 
    const updatedGuestTickets = [ticket, ...guestTickets];
    setGuestTickets(updatedGuestTickets);
    localStorage.setItem('valle-guest-tickets', JSON.stringify(updatedGuestTickets)); 
    setNotifications(prev=>[`Guest garage drop-off ${ticket.id} created for ${ticket.plate}. Mechanic action required.`, ...prev]); 
    await safe('store guest ticket as backend transaction', () => api.transactions.create(transactionPayload({
      type:'Repair / Service Billing',
      status:'Pending',
      item:`Guest garage drop-off ${ticket.id} - ${ticket.plate}`,
      supplier: ticket.name || ticket.deliveryPersonName || 'Guest Drop-off',
      supplierEmail: ticket.email || '',
      startDate: todayLocal(),
      notes: `${ticket.notes || ''} Plate: ${ticket.plate}, VIN: ${ticket.vin}, Model: ${ticket.model}`,
      amount:0
    })));
    return ticket; 
  }

  function updateGuestTicket(ticketId, updates){
    const updated = guestTickets.map(t => t.id === ticketId ? { ...t, ...updates } : t);
    setGuestTickets(updated);
    localStorage.setItem('valle-guest-tickets', JSON.stringify(updated));
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

  const frequentAlerts = useMemo(() => { const counts={}; garageOps.forEach(g=>{ const key=normPlate(g.vehicle); if(key) counts[key]=(counts[key]||0)+1; }); return Object.entries(counts).filter(([,c])=>c>=3).map(([plate,c])=>`Attention: ${plate} has ${c} garage records and may need deeper inspection.`); }, [garageOps]);
  const searchIndex = useMemo(() => [ ...vehicles.map(item=>({ type:'Vehicle', label:`${item.plate} - ${item.model || item.type}`, path:`/vehicles/${encodeURIComponent(item.plate)}`, keywords:JSON.stringify(item) })), ...vehicleCatalog.slice(0,80).map(item=>({ type:'Vehicle Master', label:`${item.plate} - ${item.model || item.type}`, path:`/vehicles/${encodeURIComponent(item.plate)}`, keywords:JSON.stringify(item) })), ...assessments.map(item=>({ type:'Assessment', label:`${item.id} - ${item.vehicle}`, path:'/assessments', keywords:JSON.stringify(item) })), ...inventory.map(item=>({ type:'Part', label:`${item.sku} - ${item.name}`, path:'/inventory', keywords:JSON.stringify(item) })), ...garageOps.map(item=>({ type:'Garage Work', label:`${item.id} - ${item.vehicle}`, path:'/garage', keywords:JSON.stringify(item) })), ...transactions.map(item=>({ type:'Transaction', label:`${item.id} - ${item.item}`, path:'/transactions', keywords:JSON.stringify(item) })) ], [vehicles, assessments, inventory, garageOps, transactions]);

  const value = { apiStatus, currentUser, users, mechanics, addUser, login, guestLogin, logout, can, refreshAll, vehicles, addVehicle, updateVehicle, createVehicleFromTransaction, inventory, setInventory, assessments, addAssessment, updateAssessment, reopenAssessment, completeAssessment, issuePartsForAssessment, garageOps, addGarageOp, updateGarageOp, transactions, createTransaction, createPO, updateTransaction, notifications:[...frequentAlerts,...notifications], setNotifications, guestTickets, updateGuestTicket, createGuestTicket, takeGuestTicket, vehicleCatalog, findVehicleByPlate, getVehicleHistory, exportVehicleHistory, searchIndex, fileNames:(list)=>Array.from(list||[]).map(f=>f.name).join(', '), nowLocalInput, todayLocal };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
