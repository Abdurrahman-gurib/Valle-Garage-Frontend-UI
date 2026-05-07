export const users = [
  { id: 1, name: 'Admin User', email: 'admin@valle.com', password: 'admin123', role: 'admin', label: 'Admin' },
  { id: 2, name: 'Jean Marc', email: 'mechanic@valle.com', password: 'mech123', role: 'mechanic', label: 'Mechanic' },
  { id: 3, name: 'CFMOTO Store', email: 'store@valle.com', password: 'store123', role: 'store', label: 'Store Keeper' }
];

export const vehicles = [
  { id: 'V-001', plate: 'CFM-1042', vin: 'LCELV1Z42P6001042', type: 'Quad', customType: '', ownership: 'Internal', owner: 'Vallé Adventure Park', companyName: '', deliveryPersonName: '', contactNumber: '', email: '', checkInDateTime: '2026-05-06T08:20', status: 'Under Repair', hours: 1180, nextService: 1250, mechanic: 'Jean Marc', expectedDeliveryDate: '2026-05-09', sourceTransactionId: '', photos: [], notes: 'Brake issue reported after morning trail.' },
  { id: 'V-002', plate: 'BUG-2201', vin: 'BUGGY-VIN-2201', type: 'Buggy', customType: '', ownership: 'Internal', owner: 'Vallé Adventure Park', companyName: '', deliveryPersonName: '', contactNumber: '', email: '', checkInDateTime: '2026-05-05T11:00', status: 'Active', hours: 820, nextService: 900, mechanic: 'Kevin', expectedDeliveryDate: '', sourceTransactionId: '', photos: [], notes: 'Ready for customer rides.' },
  { id: 'V-003', plate: 'JEEP-77', vin: 'JEEP-VIN-0077', type: 'Jeep', customType: '', ownership: 'External', owner: 'External Client', companyName: 'External Client Ltd', deliveryPersonName: 'Ravi', contactNumber: '+230 5555 1000', email: 'client@example.com', checkInDateTime: '2026-05-06T12:30', status: 'Out of Service', hours: 1540, nextService: 1600, mechanic: 'Arvind', expectedDeliveryDate: '2026-05-12', sourceTransactionId: '', photos: [], notes: 'Engine vibration under load.' },
  { id: 'V-004', plate: 'BUILD-009', vin: 'CFMOTO-BUILD-009', type: 'Quad', customType: '', ownership: 'External', owner: 'Outdoor Ltd', companyName: 'Outdoor Ltd', deliveryPersonName: 'Mr. Thomas', contactNumber: '+230 5900 1100', email: 'client@example.com', checkInDateTime: '2026-05-06T09:30', status: 'Build in Progress', hours: 0, nextService: 100, mechanic: 'Workshop Team', expectedDeliveryDate: '2026-05-20', sourceTransactionId: 'TX-9002', photos: [], notes: 'External customer order under assembly.' }
];

export const inventory = [
  { id: 'P-001', sku: 'CF-OIL-221', name: 'Oil Filter CFMOTO', category: 'Service', stock: 7, reorderLevel: 10, supplier: 'CF MOTO Mauritius', supplierEmail: 'supplier@example.com', barcode: '889102210', lastPrice: 450, photos: [] },
  { id: 'P-002', sku: 'CF-BRK-110', name: 'Brake Pad Set', category: 'Brake', stock: 34, reorderLevel: 12, supplier: 'CF MOTO Mauritius', supplierEmail: 'supplier@example.com', barcode: '889100110', lastPrice: 1250, photos: [] },
  { id: 'P-003', sku: 'CF-BLT-501', name: 'Drive Belt', category: 'Transmission', stock: 4, reorderLevel: 8, supplier: 'CF MOTO Mauritius', supplierEmail: 'supplier@example.com', barcode: '889105501', lastPrice: 3800, photos: [] },
  { id: 'P-004', sku: 'CF-SPK-330', name: 'Spark Plug', category: 'Engine', stock: 58, reorderLevel: 20, supplier: 'CF MOTO Mauritius', supplierEmail: 'supplier@example.com', barcode: '889103330', lastPrice: 290, photos: [] },
  { id: 'P-005', sku: 'CF-TYR-870', name: 'All Terrain Tyre', category: 'Tyres', stock: 8, reorderLevel: 6, supplier: 'CF MOTO Mauritius', supplierEmail: 'supplier@example.com', barcode: '889108870', lastPrice: 5200, photos: [] }
];

export const assessments = [
  { id: 'ASM-1001', vehicleId: 'V-001', vehicle: 'CFM-1042', mechanic: 'Jean Marc', issue: 'Brake noise and weak stopping response', conclusion: 'Replace front brake pads and inspect brake fluid.', parts: [{ partId: 'P-002', name: 'Brake Pad Set', qty: 2 }], status: 'Opened', reopenedBy: '', reopenReason: '', photos: [], createdAt: '2026-05-06 09:15' },
  { id: 'ASM-1002', vehicleId: 'V-002', vehicle: 'BUG-2201', mechanic: 'Kevin', issue: 'Routine service due', conclusion: 'Oil and filter replacement.', parts: [{ partId: 'P-001', name: 'Oil Filter CFMOTO', qty: 1 }], status: 'Completed', reopenedBy: '', reopenReason: '', photos: [], createdAt: '2026-05-06 10:30' },
  { id: 'ASM-1003', vehicleId: 'V-003', vehicle: 'JEEP-77', mechanic: 'Arvind', issue: 'Engine vibration under load', conclusion: 'Further inspection required.', parts: [], status: 'In Diagnosis', reopenedBy: '', reopenReason: '', photos: [], createdAt: '2026-05-06 11:05' }
];

export const garageOps = [
  { id: 'PRC-501', vehicleId: 'V-001', vehicle: 'CFM-1042', assessmentId: 'ASM-1001', transactionId: '', type: 'Repair', mechanic: 'Jean Marc', checkInDateTime: '2026-05-06T09:20', start: '09:30', end: 'Pending', labor: '2.5 hrs', expectedDeliveryDate: '2026-05-09', status: 'Ongoing', paymentStatus: 'Pending', invoiceFile: '', workDone: 'Brake inspection started. Waiting for issued parts.', partsUsed: [{ partId: 'P-002', name: 'Brake Pad Set', qty: 2 }], photos: [] },
  { id: 'PRC-502', vehicleId: 'V-002', vehicle: 'BUG-2201', assessmentId: 'ASM-1002', transactionId: '', type: 'Servicing', mechanic: 'Kevin', checkInDateTime: '2026-05-05T11:00', start: '11:30', end: '12:45', labor: '1.25 hrs', expectedDeliveryDate: '2026-05-05', status: 'Completed', paymentStatus: 'Paid', invoiceFile: 'service-invoice.pdf', workDone: 'Service completed and vehicle tested.', partsUsed: [{ partId: 'P-001', name: 'Oil Filter CFMOTO', qty: 1 }], photos: [] },
  { id: 'PRC-503', vehicleId: 'V-004', vehicle: 'BUILD-009', assessmentId: '', transactionId: 'TX-9002', type: 'Build / Assembly', mechanic: 'Workshop Team', checkInDateTime: '2026-05-06T09:30', start: '10:00', end: 'Pending', labor: '0 hrs', expectedDeliveryDate: '2026-05-20', status: 'Build in Progress', paymentStatus: 'Pending', invoiceFile: '', workDone: 'Assembly ticket created from external customer purchase order.', partsUsed: [], photos: [] }
];

export const transactions = [
  { id: 'TX-9001', type: 'Parts Re-order', supplier: 'CF MOTO Mauritius', supplierEmail: 'supplier@example.com', item: 'Drive Belt', quantity: 12, status: 'Pending', poNumber: 'PO-45707', poFile: 'PO-45707.pdf', invoiceFile: '', grn: null, amount: 45600, startDate: '2026-05-06', expectedDeliveryDate: '2026-05-13', notes: 'Re-order below stock level.', message: 'Dear Supplier, please process this purchase order for Drive Belt.' },
  { id: 'TX-9002', type: 'External Vehicle Order', supplier: 'Outdoor Ltd', supplierEmail: 'client@example.com', item: 'CFMOTO Quad x2', quantity: 2, status: 'Build in Progress', poNumber: 'CUST-PO-884', poFile: 'customer-po-884.pdf', invoiceFile: '', grn: null, amount: 890000, startDate: '2026-05-06', expectedDeliveryDate: '2026-05-20', notes: 'Admin created build ticket for external customer order.', message: 'Customer purchase order received for two CFMOTO quads.' }
];
