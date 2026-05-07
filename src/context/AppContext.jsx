import React, { createContext, useContext, useMemo, useState } from 'react';
import { users as seedUsers, vehicles as seedVehicles, inventory as seedInventory, assessments as seedAssessments, garageOps as seedGarageOps, transactions as seedTransactions } from '../data/seedData.js';

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

const roleAccess = {
  admin: ['dashboard', 'vehicles', 'assessments', 'inventory', 'garage', 'transactions', 'reports', 'settings'],
  mechanic: ['dashboard', 'vehicles', 'assessments', 'garage'],
  store: ['dashboard', 'vehicles', 'assessments', 'inventory', 'transactions', 'reports']
};

const nextId = (prefix, length, offset = 1) => `${prefix}-${String(offset).padStart(length, '0')}`;
const fileNames = (list) => Array.from(list || []).map(file => file.name).join(', ');

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('valle-user');
    return saved ? JSON.parse(saved) : null;
  });
  const [vehicles, setVehicles] = useState(seedVehicles);
  const [inventory, setInventory] = useState(seedInventory);
  const [assessments, setAssessments] = useState(seedAssessments);
  const [garageOps, setGarageOps] = useState(seedGarageOps);
  const [transactions, setTransactions] = useState(seedTransactions);
  const [notifications, setNotifications] = useState([
    'Drive Belt is below reorder level.',
    'ASM-1001 is opened and waiting for parts.',
    'PRC-503 build ticket is in progress for external customer order.',
    'External vehicle order TX-9002 is build in progress.'
  ]);

  function login(role, email, password) {
    const user = seedUsers.find(u => u.role === role && u.email === email && u.password === password);
    if (!user) return { ok: false, message: 'Invalid email or password for selected role.' };
    setCurrentUser(user);
    localStorage.setItem('valle-user', JSON.stringify(user));
    return { ok: true };
  }

  function logout() {
    localStorage.removeItem('valle-user');
    setCurrentUser(null);
  }

  function can(section) {
    if (!currentUser) return false;
    return roleAccess[currentUser.role]?.includes(section);
  }

  function addVehicle(vehicle) {
    const index = vehicles.length + 1;
    const type = vehicle.type === 'Other' ? vehicle.customType || 'Other' : vehicle.type;
    const newVehicle = {
      ...vehicle,
      type,
      id: nextId('V', 3, index),
      photos: vehicle.photos || [],
      hours: Number(vehicle.hours || 0),
      nextService: Number(vehicle.nextService || 100),
      status: vehicle.status || 'Active',
      checkInDateTime: vehicle.checkInDateTime || new Date().toISOString().slice(0, 16)
    };
    setVehicles(prev => [newVehicle, ...prev]);
    setNotifications(prev => [`Vehicle ${newVehicle.plate} registered with status ${newVehicle.status}.`, ...prev]);
    return newVehicle;
  }

  function createVehicleFromTransaction(transactionId, vehicleData = {}) {
    const tx = transactions.find(t => t.id === transactionId);
    const vehicle = addVehicle({
      plate: vehicleData.plate || `BUILD-${transactions.length + vehicles.length + 1}`,
      vin: vehicleData.vin || `PENDING-${transactionId}`,
      type: vehicleData.type || 'Quad',
      customType: vehicleData.customType || '',
      ownership: 'External',
      owner: tx?.supplier || vehicleData.owner || 'External Customer',
      companyName: tx?.supplier || vehicleData.companyName || '',
      deliveryPersonName: vehicleData.deliveryPersonName || '',
      contactNumber: vehicleData.contactNumber || '',
      email: tx?.supplierEmail || vehicleData.email || '',
      checkInDateTime: vehicleData.checkInDateTime || new Date().toISOString().slice(0, 16),
      status: 'Build in Progress',
      hours: 0,
      nextService: 100,
      mechanic: vehicleData.mechanic || 'Workshop Team',
      expectedDeliveryDate: tx?.expectedDeliveryDate || vehicleData.expectedDeliveryDate || '',
      sourceTransactionId: transactionId,
      notes: `Vehicle created from ${tx?.poNumber || transactionId}. ${vehicleData.notes || ''}`
    });
    const buildOp = addGarageOp({
      vehicleId: vehicle.id,
      assessmentId: '',
      transactionId,
      type: 'Build / Assembly',
      checkInDateTime: vehicle.checkInDateTime,
      expectedDeliveryDate: vehicle.expectedDeliveryDate,
      workDone: 'Assembly ticket created from purchase order. Mechanic to update build progress.',
      labor: '0 hrs',
      status: 'Build in Progress',
      mechanic: vehicle.mechanic
    });
    updateTransaction(transactionId, { status: 'Build in Progress', linkedVehicleId: vehicle.id, linkedGarageOpId: buildOp.id });
    setNotifications(prev => [`Build vehicle ${vehicle.plate} created from ${transactionId}.`, ...prev]);
    return vehicle;
  }

  function addAssessment(data) {
    const vehicle = vehicles.find(v => v.id === data.vehicleId);
    const newAssessment = {
      id: `ASM-${1000 + assessments.length + 1}`,
      vehicleId: data.vehicleId,
      vehicle: vehicle?.plate || data.vehicle || data.manualVehicle,
      mechanic: currentUser?.name || data.mechanic,
      issue: data.issue,
      conclusion: data.conclusion,
      parts: data.parts || [],
      status: 'Opened',
      reopenedBy: '',
      reopenReason: '',
      photos: data.photos || [],
      createdAt: new Date().toLocaleString()
    };
    setAssessments(prev => [newAssessment, ...prev]);
    setNotifications(prev => [`New assessment ${newAssessment.id} opened for ${newAssessment.vehicle}. Store keeper can review required parts.`, ...prev]);
    return newAssessment;
  }

  function updateAssessment(id, updates) {
    setAssessments(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    setNotifications(prev => [`Assessment ${id} updated.`, ...prev]);
  }

  function reopenAssessment(id, reason) {
    setAssessments(prev => prev.map(a => a.id === id ? { ...a, status: 'Opened', reopenReason: reason, reopenedBy: currentUser?.label || currentUser?.role } : a));
    setNotifications(prev => [`Assessment ${id} re-opened by ${currentUser?.label}.`, ...prev]);
  }

  function completeAssessment(id) {
    setAssessments(prev => prev.map(a => a.id === id ? { ...a, status: 'Completed' } : a));
    setNotifications(prev => [`Assessment ${id} marked completed after parts issuance.`, ...prev]);
  }

  function addGarageOp(data) {
    const vehicle = vehicles.find(v => v.id === data.vehicleId);
    const assessment = assessments.find(a => a.id === data.assessmentId);
    const op = {
      id: `PRC-${500 + garageOps.length + 1}`,
      vehicleId: data.vehicleId,
      vehicle: vehicle?.plate || data.manualVehicle || data.vehicle,
      assessmentId: data.assessmentId || '',
      transactionId: data.transactionId || '',
      type: data.type,
      mechanic: data.mechanic || currentUser?.name || 'Workshop Team',
      checkInDateTime: data.checkInDateTime || new Date().toISOString().slice(0, 16),
      start: data.start || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      end: data.end || 'Pending',
      labor: data.labor || '0 hrs',
      expectedDeliveryDate: data.expectedDeliveryDate || vehicle?.expectedDeliveryDate || '',
      status: data.status || 'Ongoing',
      paymentStatus: data.paymentStatus || 'Pending',
      invoiceFile: data.invoiceFile || '',
      workDone: data.workDone,
      partsUsed: data.partsUsed || assessment?.parts || [],
      photos: data.photos || []
    };
    setGarageOps(prev => [op, ...prev]);
    if (vehicle?.id && data.status) {
      setVehicles(prev => prev.map(v => v.id === vehicle.id ? { ...v, status: data.status, expectedDeliveryDate: data.expectedDeliveryDate || v.expectedDeliveryDate } : v));
    }
    setNotifications(prev => [`Garage operation ${op.id} started for ${op.vehicle}.`, ...prev]);
    return op;
  }

  function updateGarageOp(id, updates) {
    setGarageOps(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g));
    const op = garageOps.find(g => g.id === id);
    if (updates.status && op?.vehicleId) {
      setVehicles(prev => prev.map(v => v.id === op.vehicleId ? { ...v, status: updates.status === 'Completed' ? 'Active' : updates.status, expectedDeliveryDate: updates.expectedDeliveryDate || v.expectedDeliveryDate } : v));
    }
    if (updates.transactionId || op?.transactionId) {
      const txId = updates.transactionId || op?.transactionId;
      if (updates.status === 'Built and Testing' || updates.status === 'Delivered' || updates.status === 'Completed') {
        updateTransaction(txId, { status: updates.status });
      }
      if (updates.invoiceFile || updates.paymentStatus === 'Paid') {
        updateTransaction(txId, { invoiceFile: updates.invoiceFile || undefined, paymentStatus: updates.paymentStatus, status: updates.paymentStatus === 'Paid' ? 'Paid' : undefined });
      }
    }
    setNotifications(prev => [`Garage operation ${id} updated.`, ...prev]);
  }

  function createTransaction(data) {
    const tx = {
      id: `TX-${9000 + transactions.length + 1}`,
      type: data.type || 'External Vehicle Order',
      supplier: data.supplier || data.customerName || 'Supplier / Customer',
      supplierEmail: data.supplierEmail || data.customerEmail || '',
      item: data.item || 'Vehicle Order',
      quantity: Number(data.quantity || 1),
      status: data.status || 'Pending',
      poNumber: data.poNumber || `PO-${Math.floor(10000 + Math.random() * 89999)}`,
      poFile: data.poFile || '',
      invoiceFile: data.invoiceFile || '',
      grn: null,
      amount: Number(data.amount || 0),
      startDate: data.startDate || new Date().toISOString().slice(0, 10),
      expectedDeliveryDate: data.expectedDeliveryDate || '',
      notes: data.notes || '',
      message: data.message || `Dear ${data.supplier || data.customerName || 'Supplier'}, please process the attached purchase order.`
    };
    setTransactions(prev => [tx, ...prev]);
    setNotifications(prev => [`Transaction ${tx.id} created and marked ${tx.status}.`, ...prev]);
    return tx;
  }

  function createPO(part, qty = 10, custom = {}) {
    return createTransaction({
      type: custom.type || 'Parts Re-order',
      supplier: custom.supplier || part.supplier,
      supplierEmail: custom.supplierEmail || part.supplierEmail,
      item: custom.item || part.name,
      quantity: Number(custom.quantity || qty),
      status: 'Pending',
      poNumber: custom.poNumber || `PO-${Math.floor(10000 + Math.random() * 89999)}`,
      poFile: custom.poFile || '',
      amount: Number(custom.amount || (part.lastPrice * Number(custom.quantity || qty))),
      startDate: custom.startDate,
      expectedDeliveryDate: custom.expectedDeliveryDate,
      notes: custom.notes,
      message: custom.message || `Dear Supplier, please process the attached purchase order for ${custom.item || part.name}.`
    });
  }

  function updateTransaction(id, updates) {
    setTransactions(prev => prev.map(tx => {
      if (tx.id !== id) return tx;
      const cleaned = Object.fromEntries(Object.entries(updates).filter(([, value]) => value !== undefined));
      return { ...tx, ...cleaned };
    }));
    if (updates.status === 'Completed') setNotifications(prev => [`Transaction ${id} completed. GRN is required now.`, ...prev]);
    if (updates.status || updates.invoiceFile || updates.paymentStatus) setNotifications(prev => [`Transaction ${id} updated.`, ...prev]);
  }

  function issuePartsForAssessment(id) {
    const assessment = assessments.find(a => a.id === id);
    if (!assessment) return;
    setInventory(prev => prev.map(part => {
      const needed = assessment.parts.find(p => p.partId === part.id);
      return needed ? { ...part, stock: Math.max(0, Number(part.stock) - Number(needed.qty)) } : part;
    }));
    completeAssessment(id);
    setNotifications(prev => [`Parts issued for ${id}; stock deducted and assessment completed.`, ...prev]);
  }

  const searchIndex = useMemo(() => {
    return [
      ...vehicles.map(item => ({ type: 'Vehicle', label: `${item.plate} - ${item.type}`, path: '/vehicles', keywords: JSON.stringify(item) })),
      ...assessments.map(item => ({ type: 'Assessment', label: `${item.id} - ${item.vehicle}`, path: '/assessments', keywords: JSON.stringify(item) })),
      ...inventory.map(item => ({ type: 'Part', label: `${item.sku} - ${item.name}`, path: '/inventory', keywords: JSON.stringify(item) })),
      ...garageOps.map(item => ({ type: 'Garage Work', label: `${item.id} - ${item.vehicle}`, path: '/garage', keywords: JSON.stringify(item) })),
      ...transactions.map(item => ({ type: 'Transaction', label: `${item.id} - ${item.item}`, path: '/transactions', keywords: JSON.stringify(item) }))
    ];
  }, [vehicles, assessments, inventory, garageOps, transactions]);

  const value = { currentUser, login, logout, can, vehicles, addVehicle, createVehicleFromTransaction, inventory, setInventory, assessments, addAssessment, updateAssessment, reopenAssessment, completeAssessment, issuePartsForAssessment, garageOps, addGarageOp, updateGarageOp, transactions, createTransaction, createPO, updateTransaction, notifications, setNotifications, searchIndex, fileNames };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
