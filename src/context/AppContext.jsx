import React, { createContext, useContext, useMemo, useState } from 'react';
import { users as seedUsers, vehicles as seedVehicles, inventory as seedInventory, assessments as seedAssessments, garageOps as seedGarageOps, transactions as seedTransactions } from '../data/seedData.js';

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

const roleAccess = {
  admin: ['dashboard', 'vehicles', 'assessments', 'inventory', 'garage', 'transactions', 'reports', 'settings'],
  mechanic: ['dashboard', 'vehicles', 'assessments', 'garage'],
  store: ['dashboard', 'vehicles', 'assessments', 'inventory', 'transactions', 'reports']
};

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
    'PRC-501 is ongoing for CFM-1042.',
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
    const newVehicle = { ...vehicle, id: `V-${String(vehicles.length + 1).padStart(3, '0')}`, photos: [], hours: Number(vehicle.hours || 0), nextService: Number(vehicle.nextService || 100) };
    setVehicles(prev => [newVehicle, ...prev]);
    setNotifications(prev => [`Vehicle ${newVehicle.plate} registered.`, ...prev]);
  }

  function addAssessment(data) {
    const vehicle = vehicles.find(v => v.id === data.vehicleId);
    const newAssessment = {
      id: `ASM-${1000 + assessments.length + 1}`,
      vehicleId: data.vehicleId,
      vehicle: vehicle?.plate || data.vehicle,
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
    setNotifications(prev => [`New assessment ${newAssessment.id} opened for ${newAssessment.vehicle}.`, ...prev]);
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
    setNotifications(prev => [`Assessment ${id} completed after parts issuance.`, ...prev]);
  }

  function addGarageOp(data) {
    const vehicle = vehicles.find(v => v.id === data.vehicleId);
    const assessment = assessments.find(a => a.id === data.assessmentId);
    const op = {
      id: `PRC-${500 + garageOps.length + 1}`,
      vehicleId: data.vehicleId,
      vehicle: vehicle?.plate,
      assessmentId: data.assessmentId,
      type: data.type,
      mechanic: currentUser?.name || data.mechanic,
      start: data.start || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      end: data.end || 'Pending',
      labor: data.labor || '0 hrs',
      status: data.status || 'Ongoing',
      workDone: data.workDone,
      partsUsed: assessment?.parts || data.partsUsed || [],
      photos: data.photos || []
    };
    setGarageOps(prev => [op, ...prev]);
    setNotifications(prev => [`Garage operation ${op.id} started for ${op.vehicle}.`, ...prev]);
  }

  function createPO(part, qty = 10, custom = {}) {
    const tx = {
      id: `TX-${9000 + transactions.length + 1}`,
      type: custom.type || 'Parts Re-order',
      supplier: custom.supplier || part.supplier,
      supplierEmail: custom.supplierEmail || part.supplierEmail,
      item: custom.item || part.name,
      quantity: Number(custom.quantity || qty),
      status: 'Pending',
      poNumber: `PO-${Math.floor(10000 + Math.random() * 89999)}`,
      invoiceFile: '',
      grn: null,
      amount: Number(custom.amount || (part.lastPrice * Number(custom.quantity || qty))),
      date: new Date().toISOString().slice(0, 10),
      message: custom.message || `Dear Supplier, please process the attached purchase order for ${custom.item || part.name}.`
    };
    setTransactions(prev => [tx, ...prev]);
    setNotifications(prev => [`Purchase order ${tx.poNumber} created for ${tx.item}.`, ...prev]);
    return tx;
  }

  function updateTransaction(id, updates) {
    setTransactions(prev => prev.map(tx => tx.id === id ? { ...tx, ...updates } : tx));
    if (updates.status === 'Completed') setNotifications(prev => [`Transaction ${id} completed. GRN required.`, ...prev]);
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

  const value = { currentUser, login, logout, can, vehicles, addVehicle, inventory, setInventory, assessments, addAssessment, updateAssessment, reopenAssessment, completeAssessment, garageOps, addGarageOp, transactions, createPO, updateTransaction, notifications, setNotifications, searchIndex };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
