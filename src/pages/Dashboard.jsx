import React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  Scatter,
  ScatterChart,
  ResponsiveContainer,
  Tooltip,
  Legend,
  XAxis,
  YAxis,
} from 'recharts';
import { Badge, Button, Card, PageHeader } from '../components/UI.jsx';
import { useApp } from '../context/AppContext.jsx';
import { parseAppDate, dayKey, weekKey, monthKey, secondsBetween, durationLabel, formatDateTime as formatMauritiusDateTime, mauritiusNowDate } from '../utils/time.js';

function n(v) {
  return Number(v || 0);
}

function money(v) {
  return `MUR ${n(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function toDate(v) {
  return parseAppDate(v);
}

function duration(seconds) {
  return durationLabel(seconds);
}

function formatDateTime(value) {
  return formatMauritiusDateTime(value);
}

function partQty(part) {
  return n(part?.qty || part?.quantity || 1);
}
function partUnitCost(part) {
  return n(part?.costPrice ?? part?.unitCostPrice ?? part?.inventoryItem?.costPrice ?? 0);
}
function partUnitSelling(part) {
  return n(part?.sellingPrice ?? part?.unitSellingPrice ?? part?.price ?? part?.lastPrice ?? part?.inventoryItem?.sellingPrice ?? 0);
}
function partCost(part) {
  return n(part?.lineCostTotal ?? part?.costTotal) || partQty(part) * partUnitCost(part);
}
function partCharged(part) {
  return n(part?.lineSellingTotal ?? part?.sellingTotal ?? part?.lineTotal) || partQty(part) * partUnitSelling(part);
}
function partMargin(part) {
  return n(part?.margin) || partCharged(part) - partCost(part);
}

function group(rows, keyFn, valueFn = () => 1) {
  return Object.entries(
    (rows || []).reduce((acc, row) => {
      const label = keyFn(row) || 'Unknown';
      acc[label] = (acc[label] || 0) + valueFn(row);
      return acc;
    }, {})
  )
    .map(([label, value]) => ({
      label,
      value: Number(value || 0),
      plate: label,
    }))
    .sort((a, b) => b.value - a.value);
}

function shortInventoryLabel(value){
  const text = String(value || '-').trim();
  if(text.length <= 18) return text;
  return `${text.slice(0, 8)}…${text.slice(-7)}`;
}
function cleanInventoryItem(item){
  return {
    ...item,
    sku: item?.sku || '',
    name: item?.name || item?.part || '',
    category: item?.category || 'Uncategorised',
    stock: n(item?.stock ?? item?.currentStock ?? 0),
    currentStock: n(item?.stock ?? item?.currentStock ?? 0),
    reorderLevel: n(item?.reorderLevel ?? 0),
    costPrice: n(item?.costPrice ?? 0),
    sellingPrice: n(item?.sellingPrice ?? item?.lastPrice ?? item?.price ?? 0),
    location: item?.location || '',
    supplierName: item?.supplierName || item?.supplier || '',
  };
}
function LowStockTooltip({ active, payload, label }){
  if(!active || !payload?.length) return null;
  const row = payload[0]?.payload || {};
  return <div className="analytics-tooltip"><b>{row.fullLabel || label}</b><span>Current stock: {row.stock}</span><span>Reorder level: {row.reorder}</span><span>Part: {row.name || '-'}</span><span>Location: {row.location || '-'}</span></div>;
}
function StoreChartSet({ stockRiskData, categoryChartData, lowStockData, zeroStockData, titlePrefix = '', onExport }){
  return <>
    <ChartCard title={`${titlePrefix}Stock Risk Overview`} subtitle="Live DB count by stock risk level. No estimated values." badge="Inventory">
      {stockRiskData.some((x)=>x.value>0) ? <ResponsiveContainer width="100%" height={280} minWidth={260} minHeight={220}><PieChart><Pie data={stockRiskData} dataKey="value" nameKey="label" innerRadius={58} outerRadius={92} label={({label,value})=>`${label}: ${value}`}>{stockRiskData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip/><Legend/></PieChart></ResponsiveContainer> : <EmptyChart/>}
    </ChartCard>
    <ChartCard title={`${titlePrefix}Parts by Category`} subtitle="Category distribution from InventoryItem table." badge="Store">
      {categoryChartData.length ? <ResponsiveContainer width="100%" height={280} minWidth={260} minHeight={220}><BarChart data={categoryChartData} layout="vertical" margin={{left:80,right:24,top:8,bottom:8}}><CartesianGrid strokeDasharray="3 3"/><XAxis type="number" allowDecimals={false}/><YAxis type="category" dataKey="label" width={120} tick={{fontSize:11}}/><Tooltip content={<AnalyticsTooltip valueLabel="Parts" xAxisName="Category" yAxisName="Parts Count" />}/><Legend/><Bar dataKey="value" name="Parts count" fill="#6f3cff" radius={[0,8,8,0]}/></BarChart></ResponsiveContainer> : <EmptyChart/>}
    </ChartCard>
    <ChartCard title={`${titlePrefix}Low Stock Items`} subtitle="All items at or below reorder level. Export includes SKU, part, stock, reorder level, category and location." badge="Low stock" onExport={onExport ? ()=>onExport(`${titlePrefix.toLowerCase().replace(/\s+/g,'-')}low-stock-items`, lowStockData) : undefined}>
      <BarList rows={(lowStockData || []).map(row => ({...row, value: row.stock, displayValue:`Stock ${row.stock} / Reorder ${row.reorder}`}))} />
    </ChartCard>
    <ChartCard title={`${titlePrefix}Zero Stock Items`} subtitle="All parts where current stock is zero. Export gives the complete zero-stock list." badge="Zero stock" onExport={onExport ? ()=>onExport(`${titlePrefix.toLowerCase().replace(/\s+/g,'-')}zero-stock-items`, zeroStockData) : undefined}>
      <BarList rows={(zeroStockData || []).map(row => ({...row, value: row.reorder || 1, displayValue:`Stock 0 / Reorder ${row.reorder}`}))} />
    </ChartCard>
  </>;
}


function normPlate(v){
  return String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function vehicleTypeForPlate(plate, vehicles){
  const key = normPlate(plate);
  const found = (vehicles || []).find((v) => normPlate(v.plate || v.plateNumber) === key);
  return String(found?.vehicleType || found?.type || 'Unknown').toUpperCase();
}

function recordVehicleType(record, vehicles){
  return vehicleTypeForPlate(record?.vehicle || record?.vehiclePlate || record?.plate, vehicles);
}
function routeName(record){
  const raw = record?.destinationRoute || record?.destination || '';
  const value = String(raw || '').trim();
  return value && value !== '-' ? value : 'Not specified';
}
function bikingTypeName(record){
  const raw = record?.bikingVehicleType || record?.quadActivity || record?.activityType || '';
  const value = String(raw || '').trim();
  const lower = value.toLowerCase();
  if(lower.includes('quad') && lower.includes('single')) return 'Quad Single';
  if(lower.includes('quad') && lower.includes('double')) return 'Quad Double';
  if(lower === 'quad' || lower.includes('quad')) return 'Quad Single';
  if(lower.includes('buggy')) return 'Buggy';
  return 'Unspecified Type';
}
const ROUTE_TYPE_SERIES = ['Quad Single', 'Quad Double', 'Buggy', 'Unspecified Type'];
function routeByBikingTypeRows(rows){
  const map = {};
  (rows || []).forEach((activity) => {
    const route = routeName(activity);
    const type = ROUTE_TYPE_SERIES.includes(bikingTypeName(activity)) ? bikingTypeName(activity) : 'Unspecified Type';
    if(!map[route]) map[route] = { label: route, value: 0, total: 0, 'Quad Single': 0, 'Quad Double': 0, Buggy: 0, 'Unspecified Type': 0 };
    map[route][type] += 1;
    map[route].total += 1;
    map[route].value += 1;
    map[route].displayValue = `${map[route].total} trip(s)`;
  });
  return Object.values(map).sort((a,b)=>b.total-a.total);
}

function fuelLitresValue(fuel){
  return n(fuel?.fuelLitres ?? fuel?.litres ?? fuel?.quantity ?? 0);
}

function hourBucket(value){
  const d = toDate(value);
  if(!d) return '-';
  return `${String(d.getHours()).padStart(2, '0')}:00`;
}

function exactTimeLabel(value){
  const d = toDate(value);
  if(!d) return '-';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

function chrono(rows, keyFn, valueFn = () => 1) {
  return group(rows, keyFn, valueFn).sort((a, b) =>
    String(a.label).localeCompare(String(b.label))
  );
}

function trendWithVehicleBreakdown(rows, period, dateFn, plateFn, valueFn = () => 1, displayFn) {
  const bucket = {};

  (rows || []).forEach((row) => {
    const label = periodKey(period, dateFn(row));
    const plate = plateFn(row) || 'Unknown';
    const value = n(valueFn(row));

    if (!bucket[label]) {
      bucket[label] = {
        label,
        value: 0,
        plateMap: {},
      };
    }

    bucket[label].value += value;
    bucket[label].plateMap[plate] = (bucket[label].plateMap[plate] || 0) + value;
  });

  return Object.values(bucket)
    .map((item) => ({
      label: item.label,
      value: item.value,
      plate: item.label,
      plates: Object.entries(item.plateMap)
        .map(([plate, value]) => ({
          plate,
          value,
          displayValue: displayFn ? displayFn(value) : value,
        }))
        .sort((a, b) => b.value - a.value),
    }))
    .sort((a, b) => String(a.label).localeCompare(String(b.label)));
}

function localStartOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function localEndOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function daysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function periodFilter(period, range = {}) {
  return (value) => {
    const d = toDate(value);
    if (!d) return false;

    const now = new Date();
    let start = null;
    let end = null;

    if (period === 'today') {
      start = localStartOfDay(now);
      end = localEndOfDay(now);
    }

    if (period === 'week') {
      start = localStartOfDay(daysAgo(6));
      end = localEndOfDay(now);
    }

    if (period === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    if (period === 'year') {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    }

    if (period === 'custom' || period === 'manual-date') {
      start = range?.from ? new Date(`${range.from}T00:00:00`) : null;
      end = range?.to ? new Date(`${range.to}T23:59:59`) : null;
    }

    if (period === 'manual-month') {
      const source = range?.month || range?.from?.slice(0, 7);
      if (source) {
        const [year, month] = source.split('-').map(Number);
        start = new Date(year, month - 1, 1);
        end = new Date(year, month, 0, 23, 59, 59, 999);
      }
    }

    if (period === 'manual-year') {
      const year = Number(range?.year || new Date().getFullYear());
      if (year) {
        start = new Date(year, 0, 1);
        end = new Date(year, 11, 31, 23, 59, 59, 999);
      }
    }

    return (!start || d >= start) && (!end || d <= end);
  };
}

function periodKey(period, dateValue) {
  if (period === 'year' || period === 'manual-year') return monthKey(dateValue);
  return dayKey(dateValue);
}

function periodLabel(period, range = {}) {
  if (period === 'today') return 'Today Only';
  if (period === 'week') return 'Last 7 Days';
  if (period === 'month') return 'Current Month';
  if (period === 'year') return 'Current Year - All Months';
  if (period === 'manual-date' || period === 'custom') return `Manual Date Range: ${range?.from || 'start'} to ${range?.to || 'end'}`;
  if (period === 'manual-month') return `Manual Month: ${range?.month || '-'}`;
  if (period === 'manual-year') return `Manual Year: ${range?.year || '-'}`;
  return period || '-';
}
function mechanicNames(job) {
  const raw = job?.mechanic || job?.mechanicName || job?.assignedMechanics || 'Unassigned';
  if (Array.isArray(raw)) {
    return raw.map((m) => m?.name || m?.mechanic?.name || m).filter(Boolean);
  }
  return String(raw)
    .split(/,|;/)
    .map((x) => x.trim())
    .filter(Boolean);
}


const COLORS = ['#24f66f', '#6f3cff', '#ff315f', '#ffd84d', '#2bb7ff', '#2b0048'];

function AnalyticsTooltip({ active, payload, label, valueLabel = 'Value', suffix = '', xAxisName = 'Period', yAxisName }) {
  if (!active || !payload?.length) return null;

  const item = payload[0]?.payload || {};
  const rawValue = payload[0]?.value;
  const lowerLabel = String(valueLabel || '').toLowerCase();

  const displayValue =
    lowerLabel.includes('cost') || lowerLabel.includes('amount') || lowerLabel.includes('mur')
      ? money(rawValue)
      : `${n(rawValue).toLocaleString()}${suffix}`;

  const plateBreakdown = Array.isArray(item.plates) ? item.plates : [];

  return (
    <div className="analytics-tooltip">
      <b>{item.plate || item.label || label}</b>

      <span>{xAxisName}: {item.label || label}</span>
      <span>{yAxisName || valueLabel}: {displayValue}</span>

      {item.ticketCountLabel && <span>{item.ticketCountLabel}</span>}
      {item.outTimesLabel && <span>Out time(s): {item.outTimesLabel}</span>}
      {item.statusLabel && <span>Status: {item.statusLabel}</span>}
      {item.durationLabel && <span>Duration: {item.durationLabel}</span>}
      {item.costLabel && <span>Cost: {item.costLabel}</span>}
      {item.partsLabel && <span>Details: {item.partsLabel}</span>}
      {item.mechanicLabel && <span>Mechanic: {item.mechanicLabel}</span>}

      {plateBreakdown.length > 0 && (
        <div className="tooltip-plate-list">
          <strong>Vehicle plate breakdown:</strong>
          {plateBreakdown.slice(0, 10).map((plateRow) => (
            <span key={plateRow.plate}>
              {plateRow.plate}: {plateRow.displayValue || plateRow.value}
            </span>
          ))}
          {plateBreakdown.length > 10 && (
            <span>+{plateBreakdown.length - 10} more vehicles</span>
          )}
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, note, onClick }) {
  return (
    <Card
      onClick={onClick}
      className={`metric-card dashboard-kpi-card ${onClick ? 'clickable-card' : ''}`}
    >
      <span>{label}</span>
      <b>{value}</b>
      <small>{note}</small>
    </Card>
  );
}

function ChartPeriodSelect({ value, onChange }) {
  return (
    <select
      className="chart-period-select"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      title="Choose report period"
    >
      <option value="today">Today Only</option>
      <option value="week">Last 7 Days</option>
      <option value="month">Current Month</option>
      <option value="year">Current Year - All Months</option>
      <option value="manual-date">Manual Date Range</option>
      <option value="manual-month">Manual Month</option>
      <option value="manual-year">Manual Year</option>
    </select>
  );
}

function ChartCard({
  title,
  subtitle,
  badge,
  period,
  onPeriodChange,
  customRange,
  onCustomRangeChange,
  onExport,
  children,
}) {
  return (
    <Card className="chart-card dashboard-chart-card">
      <div className="card-head chart-card-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>

        <div className="chart-card-tools">
          {badge && <Badge>{badge}</Badge>}
          {period && <ChartPeriodSelect value={period} onChange={onPeriodChange} />}
          {(period === 'custom' || period === 'manual-date') && (
            <div className="chart-custom-range">
              <input
                type="date"
                value={customRange?.from || ''}
                onChange={(e) => onCustomRangeChange?.({ ...(customRange || {}), from: e.target.value })}
                title="From date"
              />
              <input
                type="date"
                value={customRange?.to || ''}
                onChange={(e) => onCustomRangeChange?.({ ...(customRange || {}), to: e.target.value })}
                title="To date"
              />
            </div>
          )}
          {period === 'manual-month' && (
            <div className="chart-custom-range">
              <input
                type="month"
                value={customRange?.month || ''}
                onChange={(e) => onCustomRangeChange?.({ ...(customRange || {}), month: e.target.value })}
                title="Choose month"
              />
            </div>
          )}
          {period === 'manual-year' && (
            <div className="chart-custom-range">
              <input
                type="number"
                min="2020"
                max="2100"
                value={customRange?.year || new Date().getFullYear()}
                onChange={(e) => onCustomRangeChange?.({ ...(customRange || {}), year: e.target.value })}
                title="Choose year"
              />
            </div>
          )}
          {onExport && (
            <Button variant="secondary" onClick={onExport}>
              Export XLSX
            </Button>
          )}
        </div>
      </div>

      <div className="chart-box">{children}</div>
    </Card>
  );
}

function EmptyChart() {
  return (
    <div className="empty-chart">
      <span>No data for selected period.</span>
    </div>
  );
}

function BarList({ rows, suffix = '', cost = false }) {
  const list = rows || [];
  const max = Math.max(...list.map((x) => n(x.value)), 1);

  if (!list.length) return <EmptyChart />;

  return (
    <div className="bar-list-chart">
      {list.map((x, i) => (
        <div className="bar-list-row-static" key={`${x.label}-${i}`}>
          <div className="bar-list-meta">
            <b>{x.label}</b>
            <span>{x.displayValue || x.durationLabel || (cost ? money(x.value) : `${n(x.value).toLocaleString()}${suffix}`)}</span>
          </div>
          <div className="bar-list-track">
            <em style={{ width: `${Math.min(100, (n(x.value) / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

async function exportXlsx(fileName, headers, rows, sheetName = 'Report', meta = {}) {
  const safeName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  const exportedAt = new Date();
  const exportedAtText = exportedAt.toLocaleString('en-GB');

  const aoa = [
    ['VALLÉ GARAGE OPERATIONS'],
    [meta.title || sheetName || 'Dashboard Chart Export'],
    [],
    ['Source Page', meta.sourcePage || 'Admin Analytics Dashboard'],
    ['Exported By', meta.userName || '-'],
    ['User Email', meta.userEmail || '-'],
    ['User Role', meta.userRole || '-'],
    ['Exported Date/Time', exportedAtText],
    ['Selected Period', meta.period || '-'],
    ['Manual From', meta.from || '-'],
    ['Manual To', meta.to || '-'],
    ['Manual Month', meta.month || '-'],
    ['Manual Year', meta.year || '-'],
    ['Rows Exported', rows?.length || 0],
    [],
    headers,
    ...rows,
  ];

  try {
    const XLSX = await import('xlsx');
    const worksheet = XLSX.utils.aoa_to_sheet(aoa);
    worksheet['!cols'] = headers.map((h, i) => ({
      wch: Math.max(16, String(h).length + 4, ...rows.map(r => String(r[i] ?? '').length + 2).slice(0, 200)),
    }));
    worksheet['!cols'][0] = { wch: 24 };
    worksheet['!freeze'] = { xSplit: 0, ySplit: 15 };
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
    XLSX.writeFile(workbook, safeName);
  } catch {
    const csv = aoa
      .map((row) =>
        row
          .map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`)
          .join(',')
      )
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = safeName.replace('.xlsx', '.csv');
    a.click();
    URL.revokeObjectURL(a.href);
  }
}

export default function Dashboard() {
  const navigate = useNavigate();
  const {
    currentUser,
    vehicles,
    inventory,
    assessments,
    garageOps,
    fuelConsumptions,
    vehicleOutActivities,
    guestTickets,
    fuelStockLogs = [],
    wheelRequests = [],
  } = useApp();

  const [chartPeriods, setChartPeriods] = useState({
    dailyFuel: 'today',
    fuelByVehicle: 'today',
    repairs: 'today',
    repairCost: 'month',
    vehicleOut: 'today',
    outDuration: 'today',
    mechanicWork: 'week',
    parts: 'month',
    garageTracking: 'week',
    vehicleInOutOverview: 'today',
    vehicleFleetType: 'today',
    vehicleRouteUsage: 'today',
    vehiclePeakTime: 'today',
    fuelTypeDashboard: 'today',
    fuelVisitVehiclePlate: 'today',
  });

  const [customRanges, setCustomRanges] = useState({
    dailyFuel: {},
    fuelByVehicle: {},
    repairs: {},
    repairCost: {},
    vehicleOut: {},
    outDuration: {},
    mechanicWork: {},
    parts: {},
    garageTracking: {},
    vehicleInOutOverview: {},
    vehicleFleetType: {},
    vehicleRouteUsage: {},
    vehiclePeakTime: {},
    fuelTypeDashboard: {},
    fuelVisitVehiclePlate: {},
  });
  const [liveNow, setLiveNow] = useState(() => Date.now());
  useEffect(() => { const timer = setInterval(() => setLiveNow(Date.now()), 1000); return () => clearInterval(timer); }, []);

  const isAdmin = currentUser?.role === 'admin';
  const isMechanic = currentUser?.role === 'mechanic';
  const isStoreKeeper = currentUser?.role === 'store';

  const openGuests = (guestTickets || []).filter(
    (ticket) => String(ticket.status || '').toLowerCase() === 'pending'
  );

  const activeGarage = garageOps.filter(
    (job) => !['Completed', 'Cancelled', 'Delivered'].includes(job.status)
  );

  const openAssessments = assessments.filter(
    (assessment) => assessment.status !== 'Completed'
  );

  const lowStock = inventory.filter((item) => n(item.stock) <= n(item.reorderLevel));

  const inventoryClean = useMemo(() => (inventory || []).map(cleanInventoryItem), [inventory]);
  const inventoryLowStock = useMemo(() => inventoryClean.filter((item) => item.stock <= item.reorderLevel), [inventoryClean]);
  const stockRiskData = useMemo(() => [
    { label: 'OK', value: inventoryClean.filter((item) => item.stock > item.reorderLevel).length },
    { label: 'Low stock', value: inventoryLowStock.length },
    { label: 'Zero stock', value: inventoryClean.filter((item) => item.stock <= 0).length },
  ], [inventoryClean, inventoryLowStock]);
  const categoryChartData = useMemo(() => group(inventoryClean, (item) => item.category || 'Uncategorised', () => 1).slice(0, 8), [inventoryClean]);
  const lowStockData = useMemo(() => inventoryLowStock
    .map((item) => ({ label: shortInventoryLabel(item.sku || item.name || '-'), fullLabel: `${item.sku || '-'} - ${item.name || ''}`, name: item.name, stock: item.stock, reorder: item.reorderLevel, category: item.category, location: item.location, sku: item.sku }))
    .sort((a,b)=>(a.stock-b.stock)||(b.reorder-a.reorder)), [inventoryLowStock]);
  const zeroStockData = useMemo(() => inventoryClean
    .filter((item) => item.stock <= 0)
    .map((item) => ({ label: shortInventoryLabel(item.sku || item.name || '-'), fullLabel: `${item.sku || '-'} - ${item.name || ''}`, name: item.name, stock: item.stock, reorder: item.reorderLevel, category: item.category, location: item.location, sku: item.sku }))
    .sort((a,b)=>(b.reorder-a.reorder)||String(a.label).localeCompare(String(b.label))), [inventoryClean]);

  function rowsForPeriod(rows, dateField, period, range = {}) {
    const ok = periodFilter(period, range);
    return (rows || []).filter((row) => ok(row?.[dateField]));
  }

  function chartRows() {
    const fuelRows = rowsForPeriod(fuelConsumptions, 'recordedAt', chartPeriods.fuelByVehicle, customRanges.fuelByVehicle);
    const fuelTrendRows = rowsForPeriod(fuelConsumptions, 'recordedAt', chartPeriods.dailyFuel, customRanges.dailyFuel);

    const repairRows = rowsForPeriod(garageOps, 'start', chartPeriods.repairs, customRanges.repairs).length
      ? rowsForPeriod(garageOps, 'start', chartPeriods.repairs, customRanges.repairs)
      : rowsForPeriod(garageOps, 'createdAt', chartPeriods.repairs, customRanges.repairs);

    const costOps = rowsForPeriod(garageOps, 'start', chartPeriods.repairCost, customRanges.repairCost).length
      ? rowsForPeriod(garageOps, 'start', chartPeriods.repairCost, customRanges.repairCost)
      : rowsForPeriod(garageOps, 'createdAt', chartPeriods.repairCost, customRanges.repairCost);

    const issuedPartRows = assessments
      .filter((assessment) => periodFilter(chartPeriods.repairCost, customRanges.repairCost)(assessment.createdAt))
      .flatMap((assessment) =>
        (assessment.parts || []).map((part) => ({
          ...part,
          vehicle: assessment.vehicle,
          date: assessment.createdAt,
          assessmentId: assessment.dbId || assessment.id,
          ticket: assessment.id,
        }))
      );

    const issuedAssessmentKeys = new Set(
      issuedPartRows.map((part) => String(part.assessmentId || part.assessmentDbId || part.ticket || part.assessment || '').trim()).filter(Boolean)
    );

    const garagePartRows = costOps.flatMap((operation) => {
      const linkedAssessmentKey = String(operation.assessmentId || operation.assessmentDbId || operation.assessment || '').trim();

      // If the garage operation is linked to an assessment that already has issued parts,
      // do not count garage parts again. The issued/deducted store parts are the real cost.
      if (linkedAssessmentKey && issuedAssessmentKeys.has(linkedAssessmentKey)) return [];

      return (operation.partsUsed || []).map((part) => ({
        ...part,
        vehicle: operation.vehicle,
        date: operation.start || operation.createdAt,
        assessmentId: linkedAssessmentKey,
      }));
    });

    const partsForCost = [...issuedPartRows, ...garagePartRows];

    const costByPlate = partsForCost.reduce((acc, part) => {
      const plate = part.vehicle || part.vehiclePlate || 'Unknown';
      acc[plate] = (acc[plate] || 0) + partCost(part);
      return acc;
    }, {});

    const partsByPlate = partsForCost.reduce((acc, part) => {
      const plate = part.vehicle || part.vehiclePlate || 'Unknown';
      const partName = part.name || part.sku || 'Part';
      if (!acc[plate]) acc[plate] = [];
      acc[plate].push(`${partName} x${part.qty || part.quantity || 1}`);
      return acc;
    }, {});

    const outRows = rowsForPeriod(
      vehicleOutActivities,
      'startDateTime',
      chartPeriods.vehicleOut,
      customRanges.vehicleOut
    );

    const outDurationRows = rowsForPeriod(
      vehicleOutActivities,
      'startDateTime',
      chartPeriods.outDuration,
      customRanges.outDuration
    );

    const mechanicRows = rowsForPeriod(
      garageOps,
      'start',
      chartPeriods.mechanicWork,
      customRanges.mechanicWork
    ).length
      ? rowsForPeriod(garageOps, 'start', chartPeriods.mechanicWork)
      : rowsForPeriod(garageOps, 'createdAt', chartPeriods.mechanicWork, customRanges.mechanicWork);

    const partsPeriodAssessments = assessments.filter((assessment) =>
      periodFilter(chartPeriods.parts, customRanges.parts)(assessment.createdAt)
    );

    const garageTrackingRows = rowsForPeriod(
      garageOps,
      'start',
      chartPeriods.garageTracking || chartPeriods.repairs,
      customRanges.garageTracking || customRanges.repairs
    ).length
      ? rowsForPeriod(garageOps, 'start', chartPeriods.garageTracking || chartPeriods.repairs, customRanges.garageTracking || customRanges.repairs)
      : rowsForPeriod(garageOps, 'createdAt', chartPeriods.garageTracking || chartPeriods.repairs, customRanges.garageTracking || customRanges.repairs);

    const overviewOutRows = rowsForPeriod(vehicleOutActivities, 'startDateTime', chartPeriods.vehicleInOutOverview, customRanges.vehicleInOutOverview);
    const fleetRows = rowsForPeriod(vehicleOutActivities, 'startDateTime', chartPeriods.vehicleFleetType, customRanges.vehicleFleetType);
    const routeRows = rowsForPeriod(vehicleOutActivities, 'startDateTime', chartPeriods.vehicleRouteUsage, customRanges.vehicleRouteUsage);
    const peakRows = rowsForPeriod(vehicleOutActivities, 'startDateTime', chartPeriods.vehiclePeakTime, customRanges.vehiclePeakTime);
    const fuelTypeRows = rowsForPeriod(fuelConsumptions, 'recordedAt', chartPeriods.fuelTypeDashboard, customRanges.fuelTypeDashboard);
    const fuelPlateRows = rowsForPeriod(fuelConsumptions, 'recordedAt', chartPeriods.fuelVisitVehiclePlate, customRanges.fuelVisitVehiclePlate);

    return {
      vehicleInOutOverview: trendWithVehicleBreakdown(
        overviewOutRows,
        chartPeriods.vehicleInOutOverview,
        (activity) => activity.startDateTime,
        (activity) => activity.vehicle || activity.vehiclePlate || 'Unknown',
        () => 1,
        (value) => `${Number(value).toLocaleString()} OUT record(s)`
      ).map((row) => {
        const label = row.label;
        const inCount = overviewOutRows.filter((activity) => periodKey(chartPeriods.vehicleInOutOverview, activity.endDateTime) === label && activity.endDateTime).length;
        return { ...row, out: row.value, in: inCount, stillOut: Math.max(0, row.value - inCount), displayValue: `${row.value} OUT / ${inCount} IN` };
      }).slice(-14),

      vehicleFleetTypeAdmin: group(
        fleetRows,
        (activity) => recordVehicleType(activity, vehicles),
        () => 1
      ).slice(0, 10),

      routeUsageAdmin: routeByBikingTypeRows(routeRows).slice(0, 10),

      peakOutInAdmin: group(
        peakRows.flatMap((activity) => [
          { label: exactTimeLabel(activity.startDateTime), kind: 'OUT', sortKey: String(activity.startDateTime || ''), plate: activity.vehicle || activity.vehiclePlate || '-' },
          ...(activity.endDateTime ? [{ label: exactTimeLabel(activity.endDateTime), kind: 'IN', sortKey: String(activity.endDateTime || ''), plate: activity.vehicle || activity.vehiclePlate || '-' }] : [])
        ]),
        (row) => row.label,
        () => 1
      ).map((row) => {
        const label = row.label;
        return {
          ...row,
          OUT: peakRows.filter((activity) => exactTimeLabel(activity.startDateTime) === label).length,
          IN: peakRows.filter((activity) => exactTimeLabel(activity.endDateTime) === label).length,
          outVehicles: peakRows.filter((activity) => exactTimeLabel(activity.startDateTime) === label).map((a)=>a.vehicle || a.vehiclePlate || '-').join(', '),
          inVehicles: peakRows.filter((activity) => exactTimeLabel(activity.endDateTime) === label).map((a)=>a.vehicle || a.vehiclePlate || '-').join(', '),
        };
      }).filter((row) => row.label !== '-').sort((a,b)=>String(a.label).localeCompare(String(b.label))),

      fuelByVehicleTypeAdmin: group(
        fuelTypeRows,
        (fuel) => recordVehicleType(fuel, vehicles),
        fuelLitresValue
      ).slice(0, 10),

      fuelVisitsByPlateAdmin: group(
        fuelPlateRows,
        (fuel) => fuel.vehicle || fuel.vehiclePlate || fuel.plate || 'Unknown plate',
        () => 1
      ).slice(0, 15),

      fuelTrend: trendWithVehicleBreakdown(
        fuelTrendRows,
        chartPeriods.dailyFuel,
        (fuel) => fuel.recordedAt,
        (fuel) => fuel.vehicle || fuel.vehiclePlate || fuel.plate || 'Unknown',
        fuelLitresValue,
        (value) => `${Number(value).toFixed(1)} L`
      ).slice(-14),

      fuelByVehicle: group(
        fuelRows,
        (fuel) => fuel.vehicle || fuel.vehiclePlate || fuel.plate || 'Unknown',
        fuelLitresValue
      ).slice(0, 12),

      repairs: trendWithVehicleBreakdown(
        repairRows,
        chartPeriods.repairs,
        (job) => job.start || job.createdAt,
        (job) => job.vehicle || job.vehiclePlate || job.plate || 'Unknown',
        () => 1,
        (value) => `${Number(value).toLocaleString()} repair(s)`
      ).slice(-14),

      repairCostByVehicle: group(
        partsForCost,
        (part) => part.vehicle || part.vehiclePlate || 'Unknown',
        partCost
      ).slice(0, 12).map((row) => {
        const vehicleAssessments = assessments.filter((a) => (a.vehicle || a.vehiclePlate || 'Unknown') === row.label && periodFilter(chartPeriods.repairCost, customRanges.repairCost)(a.createdAt));
        const vehicleGarageOps = costOps.filter((g) => (g.vehicle || g.vehiclePlate || 'Unknown') === row.label);
        const repairCount = Math.max(0, vehicleAssessments.length || vehicleGarageOps.length);
        return {
          ...row,
          repairCount,
          costValue: row.value,
          costLabel: money(row.value),
          displayValue: money(row.value),
          ticketCountLabel: `Repair/assessment count: ${repairCount}`,
          partsLabel: (partsByPlate[row.label] || []).slice(0, 4).join(', ') || 'No parts listed',
        };
      }),

      repairCostTrend: trendWithVehicleBreakdown(
        partsForCost,
        chartPeriods.repairCost,
        (part) => part.date,
        (part) => part.vehicle || part.vehiclePlate || 'Unknown',
        partCost,
        (value) => money(value)
      ).slice(-14),

      vehicleOut: group(
        outRows,
        (activity) => activity.vehicle || activity.vehiclePlate || 'Unknown',
        () => 1
      ).slice(0, 12).map((row) => {
        const trips = outRows.filter((activity) => (activity.vehicle || activity.vehiclePlate || 'Unknown') === row.label);
        return {
          ...row,
          displayValue: `${row.value} ticket(s)`,
          ticketCountLabel: `Tickets: ${row.value}`,
          outTimesLabel: trips.map((activity) => formatDateTime(activity.startDateTime)).join(', '),
          statusLabel: trips.some((activity) => !activity.endDateTime) ? 'Currently out / open' : 'Returned / closed',
        };
      }),

      outDuration: group(
        outDurationRows,
        (activity) => activity.vehicle || activity.vehiclePlate || 'Unknown',
        (activity) => secondsBetween(activity.startDateTime, activity.endDateTime)
      )
        .slice(0, 12)
        .map((row) => ({
          ...row,
          durationLabel: duration(row.value),
          displayValue: duration(row.value),
        })),

      mechanicWork: group(
        mechanicRows.flatMap((job) => {
          const hours = n(String(job.labor || job.laborHours || '0').replace(/[^\d.]/g, '')) || Math.max(0.25, secondsBetween(job.start || job.checkInDateTime, job.end || job.endDateTime) / 3600) || 1;
          return mechanicNames(job).map((mechanic) => ({ ...job, mechanicNameForChart: mechanic, computedHours: hours }));
        }),
        (job) => job.mechanicNameForChart || 'Unassigned',
        (job) => n(job.computedHours)
      ).slice(0, 12).map((row) => ({ ...row, displayValue: `${n(row.value).toFixed(2)} h`, mechanicLabel: `${n(row.value).toFixed(2)} total hours` })),

      partsIssued: group(
        partsPeriodAssessments.flatMap((assessment) => assessment.parts || []),
        (part) => part.name || part.sku || 'Part',
        (part) => n(part.qty || 1)
      ).slice(0, 10),

      garageTracking: garageTrackingRows.slice(0, 15).map((job) => {
        const seconds = secondsBetween(job.start || job.checkInDateTime || job.createdAt, job.end || job.endDateTime);
        return {
          label: job.id || job.processNo || 'Garage ticket',
          plate: job.vehicle || job.vehiclePlate || 'Unknown',
          value: seconds,
          displayValue: duration(seconds),
          durationLabel: duration(seconds),
          partsLabel: `${job.vehicle || job.vehiclePlate || 'Unknown'} • ${job.status || '-'} • ${job.type || '-'}`,
          statusLabel: ['completed','closed','cancelled','delivered'].includes(String(job.status || '').toLowerCase()) ? 'Closed' : 'Live - counting until checkout',
        };
      }),
    };
  }

  const charts = useMemo(
    () => chartRows(),
    [
      fuelConsumptions,
      fuelStockLogs,
      wheelRequests,
      vehicleOutActivities,
      garageOps,
      assessments,
      chartPeriods,
      customRanges,
      liveNow,
      vehicles,
    ]
  );

  const todayOk = periodFilter('today');
  const fuelToday = fuelConsumptions.filter((fuel) => todayOk(fuel.recordedAt));
  const outToday = vehicleOutActivities.filter((activity) =>
    todayOk(activity.startDateTime)
  );
  const assessmentToday = assessments.filter((assessment) =>
    todayOk(assessment.createdAt)
  );

  const issuedToday = assessmentToday.flatMap((assessment) => assessment.parts || []);
  const repairCostToday = issuedToday.reduce((sum, part) => sum + partCost(part), 0);
  const partsChargedToday = issuedToday.reduce((sum, part) => sum + partCharged(part), 0);
  const partsMarginToday = partsChargedToday - repairCostToday;

  const fuelLitresToday = fuelToday.reduce(
    (sum, fuel) => sum + fuelLitresValue(fuel),
    0
  );


  const petrolUsedToday = fuelToday
    .filter((fuel) => String(fuel.fuelType || '').toUpperCase().includes('PETROL'))
    .reduce((sum, fuel) => sum + fuelLitresValue(fuel), 0);
  const dieselUsedToday = fuelToday
    .filter((fuel) => String(fuel.fuelType || '').toUpperCase().includes('DIESEL'))
    .reduce((sum, fuel) => sum + fuelLitresValue(fuel), 0);
  const petrolRefillTotal = (fuelStockLogs || [])
    .filter((log) => String(log.fuelType || '').toUpperCase().includes('PETROL'))
    .reduce((sum, log) => sum + n(log.litres || log.fuelLitres || log.quantity), 0);
  const dieselRefillTotal = (fuelStockLogs || [])
    .filter((log) => String(log.fuelType || '').toUpperCase().includes('DIESEL'))
    .reduce((sum, log) => sum + n(log.litres || log.fuelLitres || log.quantity), 0);
  const petrolReserveLive = Math.max(0, petrolRefillTotal - (fuelConsumptions || []).filter((fuel) => String(fuel.fuelType || '').toUpperCase().includes('PETROL')).reduce((sum, fuel) => sum + fuelLitresValue(fuel), 0));
  const dieselReserveLive = Math.max(0, dieselRefillTotal - (fuelConsumptions || []).filter((fuel) => String(fuel.fuelType || '').toUpperCase().includes('DIESEL')).reduce((sum, fuel) => sum + fuelLitresValue(fuel), 0));
  const wheelIssuedToday = (wheelRequests || [])
    .filter((wheel) => String(wheel.issuedAt || '').slice(0,10) === new Date().toISOString().slice(0,10) && String(wheel.status || '').toUpperCase() === 'ISSUED')
    .reduce((sum, wheel) => sum + n(wheel.quantity || 1), 0);
  const wheelPendingLive = (wheelRequests || []).filter((wheel) => String(wheel.status || '').toUpperCase() === 'REQUESTED').length;
  const zeroStockCountLive = inventoryClean.filter((item) => item.stock <= 0).length;
  const activeVehicleOutLive = (vehicleOutActivities || []).filter((activity) => !activity.endDateTime).length;

  const outSecondsToday = outToday.reduce(
    (sum, activity) =>
      sum + secondsBetween(activity.startDateTime, activity.endDateTime),
    0
  );

  const isToday = periodFilter('today');

  const guestTicketsToday = openGuests.filter((ticket) =>
    isToday(ticket.createdAt || ticket.createdDate || ticket.date)
  );

  const openAssessmentsLive = assessments.filter((assessment) => {
    const status = String(assessment.status || '').toLowerCase();
    return !['completed', 'closed', 'cancelled', 'delivered'].includes(status);
  });

  const openGarageWorkLive = garageOps.filter((job) => {
    const status = String(job.status || '').toLowerCase();
    return !['completed', 'closed', 'cancelled', 'delivered'].includes(status);
  });

  const garageVisitsToday = assessments.filter((assessment) =>
    isToday(assessment.createdAt || assessment.date || assessment.start)
  );

  function setChartPeriod(key, value) {
    setChartPeriods((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function setCustomRange(key, value) {
    setCustomRanges((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function exportMetaForChart(name) {
    const keyMap = {
      'daily-fuel-consumption': 'dailyFuel',
      'fuel-by-vehicle-plate': 'fuelByVehicle',
      'repaired-vehicles': 'repairs',
      'repair-cost-by-month': 'repairCost',
      'vehicle-out-frequency': 'vehicleOut',
      'out-duration-by-vehicle': 'outDuration',
      'mechanic-productivity': 'mechanicWork',
      'parts-issued-mix': 'parts',
      'store-parts-issued-mix': 'parts',
      'store-top-25-parts-used-issued': 'parts',
      'store-parts-cost-by-vehicle': 'repairCost',
      'garage-work-extraction-tracking': 'garageTracking',
      'store-mechanic-ticket-workload': 'mechanicWork',
      'store-assessment-parts-cost': 'repairCost',
      'admin-vehicle-activity-overview': 'vehicleInOutOverview',
      'admin-fleet-by-type': 'vehicleFleetType',
      'admin-route-usage': 'vehicleRouteUsage',
      'admin-peak-out-in-time': 'vehiclePeakTime',
      'admin-fuel-type-usage': 'fuelTypeDashboard',
      'admin-fuel-visits-by-plate': 'fuelVisitVehiclePlate',
    };
    const key = keyMap[name] || 'dailyFuel';
    const period = chartPeriods[key];
    const range = customRanges[key] || {};
    return {
      title: name.split('-').map(x => x.charAt(0).toUpperCase() + x.slice(1)).join(' '),
      sourcePage: isAdmin ? 'Admin Analytics Dashboard' : isStoreKeeper ? 'Store Keeper Dashboard' : 'Dashboard',
      userName: currentUser?.name,
      userEmail: currentUser?.email,
      userRole: currentUser?.role,
      period: periodLabel(period, range),
      from: range.from || '',
      to: range.to || '',
      month: range.month || '',
      year: range.year || '',
    };
  }

  function exportSimple(name, rows) {
    return exportXlsx(
      name,
      ['Label / Period', 'Vehicle Plate / Breakdown', 'Value', 'Extra Details'],
      (rows || []).flatMap((row) => {
        if (Array.isArray(row.plates) && row.plates.length) {
          return row.plates.map((plateRow) => [
            row.label,
            plateRow.plate,
            plateRow.displayValue || plateRow.value,
            row.durationLabel || row.costLabel || row.partsLabel || '',
          ]);
        }

        return [[
          row.label,
          row.plate || row.label,
          row.displayValue || row.durationLabel || row.costLabel || row.value,
          row.partsLabel || row.mechanicLabel || '',
        ]];
      }),
      name,
      exportMetaForChart(name)
    );
  }

  if (isMechanic) {
    return (
      <div className="page">
        <PageHeader
          title="Mechanic Dashboard"
          subtitle="Open work, assessments and pending guest tickets."
        />

        <div className="metrics-grid mechanic-dashboard-row mechanic-compact-grid">
          <Kpi
            label="Guest Tickets Today"
            value={guestTicketsToday.length}
            note={`${openGuests.length} total pending drop-off(s)`}
            onClick={() => navigate('/guest-pending')}
          />
          <Kpi
            label="Open Assessments"
            value={openAssessmentsLive.length}
            note="Not completed / not closed"
            onClick={() => navigate('/assessments')}
          />
          <Kpi
            label="Garage Work Open"
            value={openGarageWorkLive.length}
            note="Active work tickets"
            onClick={() => navigate('/garage')}
          />
          <Kpi
            label="Garage Visits Today"
            value={garageVisitsToday.length}
            note="One assessment = one visit"
            onClick={() => navigate('/reports')}
          />
        </div>

        <Card className="mechanic-summary-card">
          <div className="card-head">
            <div>
              <h2>Today’s Mechanic Summary</h2>
              <p>Live counts from guest tickets, assessments and garage work.</p>
            </div>
            <Badge>{guestTicketsToday.length} guest today</Badge>
          </div>

          <div className="mechanic-summary-list">
            <span><b>Pending guest tickets:</b> {openGuests.length}</span>
            <span><b>Open assessments:</b> {openAssessmentsLive.length}</span>
            <span><b>Open garage work:</b> {openGarageWorkLive.length}</span>
            <span><b>Garage visits today:</b> {garageVisitsToday.length}</span>
          </div>
        </Card>

        <div className="dashboard-chart-grid dashboard-modern-chart-grid mechanic-analytics-grid">
          <ChartCard title="Assessment Status" subtitle="Live assessment count by current status." badge="Mechanic">
            <ResponsiveContainer width="100%" height={280} minWidth={260} minHeight={220}><PieChart><Pie data={group(assessments, (a)=>a.status || 'Unknown', () => 1)} dataKey="value" nameKey="label" innerRadius={58} outerRadius={92} label={({label,value})=>`${label}: ${value}`}>{group(assessments, (a)=>a.status || 'Unknown', () => 1).map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip/><Legend/></PieChart></ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Parts Given by Vehicle" subtitle="Issued assessment parts grouped by vehicle plate." badge="Parts">
            <BarList rows={group(assessments.flatMap((a)=>(a.parts || []).map((p)=>({...p, vehicle:a.vehicle || a.vehiclePlate || 'Unknown'}))), (p)=>p.vehicle, (p)=>n(p.qty || p.quantity || 1)).slice(0,10)} />
          </ChartCard>
          <ChartCard title="Completed Tickets" subtitle="Completed assessment tickets by date." badge="Completed">
            <ResponsiveContainer width="100%" height={280} minWidth={260} minHeight={220}><LineChart data={chrono(assessments.filter((a)=>String(a.status||'').toLowerCase()==='completed'), (a)=>dayKey(a.updatedAt || a.createdAt), () => 1).slice(-14)}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="label"/><YAxis allowDecimals={false}/><Tooltip content={<AnalyticsTooltip valueLabel="Completed" xAxisName="Date" yAxisName="Completed Tickets"/>}/><Line dataKey="value" stroke="#24f66f" strokeWidth={3}/></LineChart></ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Guest Ticket Intake" subtitle="Today and pending drop-off visibility." badge="Guests">
            <ResponsiveContainer width="100%" height={280} minWidth={260} minHeight={220}><BarChart data={[{label:'Today', value:guestTicketsToday.length},{label:'Pending', value:openGuests.length},{label:'Garage visits', value:garageVisitsToday.length}]}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="label"/><YAxis allowDecimals={false}/><Tooltip/><Bar dataKey="value" fill="#6f3cff" radius={[8,8,0,0]}/></BarChart></ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Garage Visits Today" subtitle="Every garage visit recorded today from live DB data." badge="Visits">
            <ResponsiveContainer width="100%" height={280} minWidth={260} minHeight={220}><BarChart data={[{label:'Garage visits today', value:garageVisitsToday.length},{label:'Open garage work', value:openGarageWorkLive.length},{label:'Open assessments', value:openAssessmentsLive.length}]}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="label"/><YAxis allowDecimals={false}/><Tooltip/><Bar dataKey="value" fill="#2997ff" radius={[8,8,0,0]}/></BarChart></ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Open Garage Work" subtitle="Active garage work grouped by current status." badge="Open">
            <ResponsiveContainer width="100%" height={280} minWidth={260} minHeight={220}><PieChart><Pie data={group(openGarageWorkLive, (g)=>g.status || 'Open', () => 1)} dataKey="value" nameKey="label" innerRadius={58} outerRadius={92} label={({label,value})=>`${label}: ${value}`}>{group(openGarageWorkLive, (g)=>g.status || 'Open', () => 1).map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip/><Legend/></PieChart></ResponsiveContainer>
          </ChartCard>
        </div>
      </div>
    );
  }


  if (isStoreKeeper) {
    const storePartsIssuedToday = assessments
      .filter((assessment) => isToday(assessment.createdAt || assessment.date))
      .flatMap((assessment) => assessment.parts || []);

    const storePartsIssuedCostToday = storePartsIssuedToday.reduce(
      (sum, part) => sum + partCost(part),
      0
    );
    const storePartsChargedToday = storePartsIssuedToday.reduce((sum, part) => sum + partCharged(part), 0);
    const storePartsMarginToday = storePartsChargedToday - storePartsIssuedCostToday;

    const storeCharts = {
      lowStock: lowStock.slice(0, 12).map((item) => ({
        label: item.name,
        value: n(item.stock),
        plate: item.name,
      })),
      partsIssued: group(
        assessments
          .filter((assessment) => periodFilter(chartPeriods.parts, customRanges.parts)(assessment.createdAt))
          .flatMap((assessment) => assessment.parts || []),
        (part) => part.name || part.sku || 'Part',
        (part) => n(part.qty || 1)
      ).slice(0, 25),
      partsCost: group(
        assessments
          .filter((assessment) => periodFilter(chartPeriods.repairCost, customRanges.repairCost)(assessment.createdAt))
          .flatMap((assessment) =>
            (assessment.parts || []).map((part) => ({
              ...part,
              vehicle: assessment.vehicle,
              vehiclePlate: assessment.vehiclePlate,
            }))
          ),
        (part) => part.vehicle || part.vehiclePlate || 'Unknown vehicle',
        partCost
      ).slice(0, 10),
      stockValueByCategory: group(
        inventory || [],
        (item) => item.category || 'Uncategorised',
        (item) => n(item.stock ?? item.currentStock) * n(item.costPrice)
      ).slice(0, 10),
    };

    return (
      <div className="page dashboard-page dashboard-original-layout">
        <PageHeader
          title="Store Keeper Dashboard"
          subtitle="Live stock, parts issue and assessment-parts tracking. Fuel data is hidden for Store Keeper."
        />

        <div className="dashboard-metrics-grid">
          <Kpi
            label="Low Stock"
            value={lowStock.length}
            note="At/below reorder level"
            onClick={() => navigate('/inventory')}
          />
          <Kpi
            label="Inventory Items"
            value={inventory.length}
            note="Parts in database"
            onClick={() => navigate('/inventory')}
          />
          <Kpi
            label="Open Assessments"
            value={openAssessmentsLive.length}
            note="May require parts"
            onClick={() => navigate('/assessments')}
          />
          <Kpi
            label="Parts Issued Today"
            value={storePartsIssuedToday.length}
            note={`Cost ${money(storePartsIssuedCostToday)} • Charged ${money(storePartsChargedToday)} • Margin ${money(storePartsMarginToday)}`}
            onClick={() => navigate('/reports')}
          />
          <Kpi
            label="Wheel Issued Today"
            value={wheelIssuedToday}
            note={`${wheelPendingLive} pending wheel request(s)`}
            onClick={() => navigate('/wheel')}
          />
        </div>

        <div className="dashboard-chart-grid dashboard-modern-chart-grid">
          <StoreChartSet stockRiskData={stockRiskData} categoryChartData={categoryChartData} lowStockData={lowStockData} zeroStockData={zeroStockData} onExport={exportSimple} />

          <ChartCard
            title="Top 25 Parts Used / Issued"
            subtitle="Most used/issued parts by quantity. Filter by period or manual date range."
            period={chartPeriods.parts}
            onPeriodChange={(value) => setChartPeriod('parts', value)}
            customRange={customRanges.parts}
            onCustomRangeChange={(value) => setCustomRange('parts', value)}
            onExport={() => exportSimple('store-top-25-parts-used-issued', storeCharts.partsIssued)}
          >
            {storeCharts.partsIssued.length ? (
              <ResponsiveContainer width="100%" height={280} minWidth={260} minHeight={220}>
                <PieChart>
                  <Pie data={storeCharts.partsIssued} dataKey="value" nameKey="label" innerRadius={55} outerRadius={90}>
                    {storeCharts.partsIssued.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<AnalyticsTooltip valueLabel="Quantity" xAxisName="Part" yAxisName="Quantity Issued" />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </ChartCard>

          <ChartCard
            title="Parts Cost by Vehicle"
            subtitle="Vehicle plate and issued parts cost, with date/manual filters."
            period={chartPeriods.repairCost}
            onPeriodChange={(value) => setChartPeriod('repairCost', value)}
            customRange={customRanges.repairCost}
            onCustomRangeChange={(value) => setCustomRange('repairCost', value)}
            onExport={() => exportSimple('store-parts-cost-by-vehicle', storeCharts.partsCost)}
          >
            <BarList rows={storeCharts.partsCost} cost />
          </ChartCard>

          <ChartCard
            title="Mechanic Ticket Workload"
            subtitle="Garage ticket hours by mechanic. Multiple mechanics on a ticket are counted."
            period={chartPeriods.mechanicWork}
            onPeriodChange={(value) => setChartPeriod('mechanicWork', value)}
            customRange={customRanges.mechanicWork}
            onCustomRangeChange={(value) => setCustomRange('mechanicWork', value)}
            onExport={() => exportSimple('store-mechanic-ticket-workload', charts.mechanicWork)}
          >
            <BarList rows={charts.mechanicWork} />
          </ChartCard>

          <ChartCard
            title="Assessment Parts Cost"
            subtitle="Issued parts cost by assessment/vehicle for stock visibility."
            period={chartPeriods.repairCost}
            onPeriodChange={(value) => setChartPeriod('repairCost', value)}
            customRange={customRanges.repairCost}
            onCustomRangeChange={(value) => setCustomRange('repairCost', value)}
            onExport={() => exportSimple('store-assessment-parts-cost', charts.repairCostByVehicle)}
          >
            <BarList rows={charts.repairCostByVehicle} cost />
          </ChartCard>

          <ChartCard
            title="Stock Value by Category"
            subtitle="Inventory value from current stock × cost price."
            badge="Inventory"
            onExport={() => exportSimple('store-stock-value-by-category', storeCharts.stockValueByCategory)}
          >
            <BarList rows={storeCharts.stockValueByCategory} cost />
          </ChartCard>

          <ChartCard
            title="Assessment Parts Ticket Flow Today"
            subtitle="Parts issued, completed assessment tickets and reopened tickets from live assessment data."
            badge="Tickets"
            onExport={() => exportSimple('store-assessment-parts-ticket-flow-today', [
              { label:'Parts issued today', value:storePartsIssuedToday.length },
              { label:'Completed assessments today', value:assessments.filter((a)=>isToday(a.updatedAt || a.createdAt) && String(a.status||'').toLowerCase()==='completed').length },
              { label:'Reopened tickets today', value:assessments.filter((a)=>isToday(a.reopenedAt || a.updatedAt || a.createdAt) && (a.reopenReason || String(a.status||'').toLowerCase()==='reopened')).length }
            ])}
          >
            <ResponsiveContainer width="100%" height={280} minWidth={260} minHeight={220}><BarChart data={[
              {label:'Parts issued', value:storePartsIssuedToday.length},
              {label:'Completed', value:assessments.filter((a)=>isToday(a.updatedAt || a.createdAt) && String(a.status||'').toLowerCase()==='completed').length},
              {label:'Reopened', value:assessments.filter((a)=>isToday(a.reopenedAt || a.updatedAt || a.createdAt) && (a.reopenReason || String(a.status||'').toLowerCase()==='reopened')).length}
            ]}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="label"/><YAxis allowDecimals={false}/><Tooltip/><Bar dataKey="value" fill="#ff8b00" radius={[8,8,0,0]}/></BarChart></ResponsiveContainer>
          </ChartCard>
        </div>

        <Card className="report-result-card">
          <div className="card-head">
            <div>
              <h2>Report Result Table</h2>
              <p>Filtered database results with stored date/time, vehicle plate, ticket, visit count, repair details and costs. Excel export keeps the same professional structure.</p>
            </div>
            <Badge>{storeCharts.partsCost.length} vehicles</Badge>
          </div>
          <div className="table-wrap table-responsive">
            <table>
              <thead>
                <tr><th>Vehicle Plate</th><th>Parts Cost</th><th>Issued Parts</th><th>Filter</th></tr>
              </thead>
              <tbody>
                {storeCharts.partsCost.map((row) => (
                  <tr key={row.label}>
                    <td><b>{row.label}</b></td>
                    <td>{money(row.value)}</td>
                    <td>{row.partsLabel || '-'}</td>
                    <td>{periodLabel(chartPeriods.repairCost, customRanges.repairCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="page dashboard-page dashboard-original-layout">
      <PageHeader
        title={isAdmin ? 'Admin Analytics Dashboard' : 'Operations Dashboard'}
        subtitle="Live operational tracking for fuel, garage visits, repairs, vehicle activity, stock and cost."
      />

      <div className="dashboard-metrics-grid">
        <Kpi
          label="Garage Visits Today"
          value={assessmentToday.length}
          note="Exact: one assessment = one visit"
          onClick={() => navigate('/reports')}
        />
        <Kpi
          label="Fuel Used Today"
          value={`${fuelLitresToday.toFixed(1)} L`}
          note={`${fuelToday.length} fuel records`}
          onClick={() => navigate('/reports')}
        />
        <Kpi
          label="Vehicles Out Today"
          value={outToday.length}
          note={`Duration ${duration(outSecondsToday)}`}
          onClick={() => navigate('/reports')}
        />
        <Kpi
          label="Petrol Reserve"
          value={`${petrolReserveLive.toFixed(1)} L`}
          note={`Petrol used today ${petrolUsedToday.toFixed(1)} L`}
          onClick={() => navigate('/fuel')}
        />
        <Kpi
          label="Diesel Reserve"
          value={`${dieselReserveLive.toFixed(1)} L`}
          note={`Diesel used today ${dieselUsedToday.toFixed(1)} L`}
          onClick={() => navigate('/fuel')}
        />
        <Kpi
          label="Vehicle Still Out"
          value={activeVehicleOutLive}
          note="Live vehicles not yet recorded IN"
          onClick={() => navigate('/vehicle-out')}
        />
        <Kpi
          label="Wheel Issued Today"
          value={wheelIssuedToday}
          note={`${wheelPendingLive} pending wheel request(s)`}
          onClick={() => navigate('/wheel')}
        />
        <Kpi
          label="Zero Stock"
          value={zeroStockCountLive}
          note="Parts currently at zero stock"
          onClick={() => navigate('/inventory')}
        />
        <Kpi
          label="Low Stock"
          value={lowStock.length}
          note="At/below reorder level"
          onClick={() => navigate('/inventory')}
        />
      </div>

      <div className="dashboard-chart-grid dashboard-modern-chart-grid admin-store-visibility-grid">
        <StoreChartSet stockRiskData={stockRiskData} categoryChartData={categoryChartData} lowStockData={lowStockData} zeroStockData={zeroStockData} titlePrefix="Store " onExport={exportSimple} />
      </div>

      <div className="dashboard-chart-grid dashboard-modern-chart-grid">
        <ChartCard title="Fuel Reserve Control" subtitle="Live reserve = fuel truck refill logs minus vehicle/tool fuel distribution." badge="Boss">
          <ResponsiveContainer width="100%" height={280} minWidth={260} minHeight={220}><BarChart data={[{label:'Petrol reserve', value:petrolReserveLive},{label:'Diesel reserve', value:dieselReserveLive},{label:'Petrol used today', value:petrolUsedToday},{label:'Diesel used today', value:dieselUsedToday}]}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="label"/><YAxis/><Tooltip/><Bar dataKey="value" fill="#24f66f" radius={[8,8,0,0]}/></BarChart></ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Vehicle In / Out Today" subtitle="Today only: out records, still out and returned vehicles." badge="Vehicle">
          <ResponsiveContainer width="100%" height={280} minWidth={260} minHeight={220}><BarChart data={[{label:'Out today', value:outToday.length},{label:'Still out', value:activeVehicleOutLive},{label:'Returned today', value:outToday.filter(x=>x.endDateTime).length}]}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="label"/><YAxis allowDecimals={false}/><Tooltip/><Bar dataKey="value" fill="#2997ff" radius={[8,8,0,0]}/></BarChart></ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Store Wheel Control" subtitle="Wheel issued today and pending requests from mechanics." badge="Wheel">
          <ResponsiveContainer width="100%" height={280} minWidth={260} minHeight={220}><BarChart data={[{label:'Wheel issued today', value:wheelIssuedToday},{label:'Wheel pending', value:wheelPendingLive},{label:'Low stock parts', value:lowStock.length},{label:'Zero stock', value:zeroStockCountLive}]}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="label"/><YAxis allowDecimals={false}/><Tooltip/><Bar dataKey="value" fill="#6f3cff" radius={[8,8,0,0]}/></BarChart></ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="dashboard-chart-grid dashboard-modern-chart-grid">
        <ChartCard
          title="Fuel Consumption Trend"
          subtitle="Hover to see the date and litres from live DB records."
          period={chartPeriods.dailyFuel}
          onPeriodChange={(value) => setChartPeriod('dailyFuel', value)}
          customRange={customRanges.dailyFuel}
          onCustomRangeChange={(value) => setCustomRange('dailyFuel', value)}
          onExport={() => exportSimple('fuel-consumption-trend', charts.fuelTrend)}
        >
          {charts.fuelTrend.length ? (
            <ResponsiveContainer width="100%" height={280} minWidth={260} minHeight={220}>
              <AreaChart data={charts.fuelTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" label={{ value: 'X Axis: Date / Period', position: 'insideBottom', offset: -3 }} />
                <YAxis label={{ value: 'Y Axis: Fuel Litres', angle: -90, position: 'insideLeft' }} />
                <Tooltip content={<AnalyticsTooltip valueLabel="Fuel" suffix=" L" xAxisName="Date/Period" yAxisName="Fuel Litres" />} />
                <Area dataKey="value" fill="#24f66f" stroke="#24f66f" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>

        <ChartCard
          title="Fuel by Vehicle Plate"
          subtitle="Hover shows the exact vehicle plate and fuel litres."
          period={chartPeriods.fuelByVehicle}
          onPeriodChange={(value) => setChartPeriod('fuelByVehicle', value)}
          customRange={customRanges.fuelByVehicle}
          onCustomRangeChange={(value) => setCustomRange('fuelByVehicle', value)}
          onExport={() => exportSimple('fuel-by-vehicle-plate', charts.fuelByVehicle)}
        >
          {charts.fuelByVehicle.length ? (
            <ResponsiveContainer width="100%" height={280} minWidth={260} minHeight={220}>
              <BarChart data={charts.fuelByVehicle}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" label={{ value: 'X Axis: Vehicle Plate', position: 'insideBottom', offset: -3 }} />
                <YAxis label={{ value: 'Y Axis: Fuel Litres', angle: -90, position: 'insideLeft' }} />
                <Tooltip content={<AnalyticsTooltip valueLabel="Fuel" suffix=" L" xAxisName="Vehicle Plate" yAxisName="Fuel Litres" />} />
                <Bar dataKey="value" fill="#6f3cff" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>

        <ChartCard
          title="Repaired Vehicles"
          subtitle="Repair workload by selected period."
          period={chartPeriods.repairs}
          onPeriodChange={(value) => setChartPeriod('repairs', value)}
          customRange={customRanges.repairs}
          onCustomRangeChange={(value) => setCustomRange('repairs', value)}
          onExport={() => exportSimple('repaired-vehicles', charts.repairs)}
        >
          {charts.repairs.length ? (
            <ResponsiveContainer width="100%" height={280} minWidth={260} minHeight={220}>
              <LineChart data={charts.repairs}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" label={{ value: 'X Axis: Date / Period', position: 'insideBottom', offset: -3 }} />
                <YAxis label={{ value: 'Y Axis: Repair Count', angle: -90, position: 'insideLeft' }} />
                <Tooltip content={<AnalyticsTooltip valueLabel="Repairs" xAxisName="Date/Period" yAxisName="Repair Count" />} />
                <Line dataKey="value" stroke="#ff315f" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>

        <ChartCard
          title="Repair Cost by Vehicle"
          subtitle="Parts-only repair cost. Vehicle plate is shown on hover/list."
          period={chartPeriods.repairCost}
          onPeriodChange={(value) => setChartPeriod('repairCost', value)}
          customRange={customRanges.repairCost}
          onCustomRangeChange={(value) => setCustomRange('repairCost', value)}
          onExport={() => exportSimple('repair-cost-by-vehicle', charts.repairCostByVehicle)}
        >
          <BarList rows={charts.repairCostByVehicle} cost />
        </ChartCard>

        <ChartCard
          title="Repair Cost Trend"
          subtitle="Cost by date/month depending on selected period."
          period={chartPeriods.repairCost}
          onPeriodChange={(value) => setChartPeriod('repairCost', value)}
          customRange={customRanges.repairCost}
          onCustomRangeChange={(value) => setCustomRange('repairCost', value)}
          onExport={() => exportSimple('repair-cost-trend', charts.repairCostTrend)}
        >
          {charts.repairCostTrend.length ? (
            <ResponsiveContainer width="100%" height={280} minWidth={260} minHeight={220}>
              <AreaChart data={charts.repairCostTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" label={{ value: 'X Axis: Date / Period', position: 'insideBottom', offset: -3 }} />
                <YAxis label={{ value: 'Y Axis: Parts Cost (MUR)', angle: -90, position: 'insideLeft' }} />
                <Tooltip content={<AnalyticsTooltip valueLabel="Repair Cost" xAxisName="Date/Period" yAxisName="Parts Cost" />} />
                <Area dataKey="value" fill="#ffd84d" stroke="#ff315f" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>

        <ChartCard
          title="Vehicle Out Frequency"
          subtitle="Each dot is a vehicle. Hover shows plate, ticket count and every out time."
          period={chartPeriods.vehicleOut}
          onPeriodChange={(value) => setChartPeriod('vehicleOut', value)}
          customRange={customRanges.vehicleOut}
          onCustomRangeChange={(value) => setCustomRange('vehicleOut', value)}
          onExport={() => exportSimple('vehicle-out-frequency', charts.vehicleOut)}
        >
          {charts.vehicleOut.length ? (
            <ResponsiveContainer width="100%" height={280} minWidth={260} minHeight={220}>
              <ScatterChart data={charts.vehicleOut.map((row, index) => ({ ...row, x: index + 1, y: row.value }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="x" type="number" tickFormatter={(v) => charts.vehicleOut[v - 1]?.label || v} label={{ value: 'X Axis: Vehicle Plate', position: 'insideBottom', offset: -3 }} />
                <YAxis dataKey="y" type="number" allowDecimals={false} label={{ value: 'Y Axis: Ticket Count', angle: -90, position: 'insideLeft' }} />
                <Tooltip content={<AnalyticsTooltip valueLabel="Trips" xAxisName="Vehicle Plate" yAxisName="Trip Count" />} />
                <Scatter dataKey="y" fill="#ff315f" />
              </ScatterChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>

        <ChartCard
          title="Vehicle Out Duration"
          subtitle="Exact accumulated out time by vehicle in days, hours, minutes and seconds."
          period={chartPeriods.outDuration}
          onPeriodChange={(value) => setChartPeriod('outDuration', value)}
          customRange={customRanges.outDuration}
          onCustomRangeChange={(value) => setCustomRange('outDuration', value)}
          onExport={() => exportSimple('vehicle-out-duration', charts.outDuration)}
        >
          <BarList rows={charts.outDuration} />
        </ChartCard>

        <ChartCard
          title="Mechanic Productivity"
          subtitle="Hours/jobs by mechanic for the selected period."
          period={chartPeriods.mechanicWork}
          onPeriodChange={(value) => setChartPeriod('mechanicWork', value)}
          customRange={customRanges.mechanicWork}
          onCustomRangeChange={(value) => setCustomRange('mechanicWork', value)}
          onExport={() => exportSimple('mechanic-productivity', charts.mechanicWork)}
        >
          <BarList rows={charts.mechanicWork} suffix=" h" />
        </ChartCard>

        <ChartCard
          title="Garage Work Extraction Tracking"
          subtitle="Live ticket tracking from check-in until checkout. Open tickets keep counting in days, hours, minutes and seconds."
          period={chartPeriods.garageTracking}
          onPeriodChange={(value) => setChartPeriod('garageTracking', value)}
          customRange={customRanges.garageTracking}
          onCustomRangeChange={(value) => setCustomRange('garageTracking', value)}
          onExport={() => exportSimple('garage-work-extraction-tracking', charts.garageTracking)}
        >
          <BarList rows={charts.garageTracking} />
        </ChartCard>

        <ChartCard
          title="Parts Issued Mix"
          subtitle="Store Keeper issued parts only."
          period={chartPeriods.parts}
          onPeriodChange={(value) => setChartPeriod('parts', value)}
          customRange={customRanges.parts}
          onCustomRangeChange={(value) => setCustomRange('parts', value)}
          onExport={() => exportSimple('parts-issued-mix', charts.partsIssued)}
        >
          {charts.partsIssued.length ? (
            <ResponsiveContainer width="100%" height={280} minWidth={260} minHeight={220}>
              <PieChart>
                <Pie
                  data={charts.partsIssued}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={55}
                  outerRadius={90}
                >
                  {charts.partsIssued.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<AnalyticsTooltip valueLabel="Quantity" xAxisName="Part" yAxisName="Quantity Issued" />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>

        <ChartCard
          title="Repair Cost vs Repair Count"
          subtitle="Each point is a vehicle plate. Hover shows plate, cost and repair count."
          period={chartPeriods.repairCost}
          onPeriodChange={(value) => setChartPeriod('repairCost', value)}
          customRange={customRanges.repairCost}
          onCustomRangeChange={(value) => setCustomRange('repairCost', value)}
          onExport={() => exportSimple('repair-cost-vs-repair-count', charts.repairCostByVehicle)}
        >
          {charts.repairCostByVehicle.length ? (
            <ResponsiveContainer width="100%" height={280} minWidth={260} minHeight={220}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="repairCount"
                  name="Repair Count"
                  allowDecimals={false}
                  label={{ value: 'X Axis: Repair / Assessment Count', position: 'insideBottom', offset: -3 }}
                />
                <YAxis
                  type="number"
                  dataKey="costValue"
                  name="Parts Cost"
                  label={{ value: 'Y Axis: Parts Cost (MUR)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip content={<AnalyticsTooltip valueLabel="Repair Cost" xAxisName="Vehicle Plate" yAxisName="Parts Cost" />} />
                <Scatter data={charts.repairCostByVehicle} fill="#6f3cff" />
              </ScatterChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>

        <ChartCard
          title="Admin Vehicle Activity Overview"
          subtitle="OUT, IN and still-out records from vehicle management with full period filters."
          period={chartPeriods.vehicleInOutOverview}
          onPeriodChange={(value) => setChartPeriod('vehicleInOutOverview', value)}
          customRange={customRanges.vehicleInOutOverview}
          onCustomRangeChange={(value) => setCustomRange('vehicleInOutOverview', value)}
          onExport={() => exportSimple('admin-vehicle-activity-overview', charts.vehicleInOutOverview)}
        >
          {charts.vehicleInOutOverview.length ? (
            <ResponsiveContainer width="100%" height={280} minWidth={260} minHeight={220}>
              <LineChart data={charts.vehicleInOutOverview}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line dataKey="out" name="Vehicle OUT" stroke="#6f3cff" strokeWidth={3} />
                <Line dataKey="in" name="Vehicle IN" stroke="#24f66f" strokeWidth={3} />
                <Line dataKey="stillOut" name="Still OUT" stroke="#ff315f" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </ChartCard>

        <ChartCard
          title="Admin Fleet by Type"
          subtitle="Vehicle categories involved in OUT/IN activity for the selected period."
          period={chartPeriods.vehicleFleetType}
          onPeriodChange={(value) => setChartPeriod('vehicleFleetType', value)}
          customRange={customRanges.vehicleFleetType}
          onCustomRangeChange={(value) => setCustomRange('vehicleFleetType', value)}
          onExport={() => exportSimple('admin-fleet-by-type', charts.vehicleFleetTypeAdmin)}
        >
          {charts.vehicleFleetTypeAdmin.length ? (
            <ResponsiveContainer width="100%" height={280} minWidth={260} minHeight={220}>
              <PieChart>
                <Pie data={charts.vehicleFleetTypeAdmin} dataKey="value" nameKey="label" innerRadius={55} outerRadius={90}>
                  {charts.vehicleFleetTypeAdmin.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip content={<AnalyticsTooltip valueLabel="Trips" xAxisName="Vehicle Type" yAxisName="Trip Count" />} />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </ChartCard>

        <ChartCard
          title="Admin Route Usage by Biking Type"
          subtitle="Adventure/Discovery split by Quad Single, Quad Double, Quad and Buggy for the selected period."
          period={chartPeriods.vehicleRouteUsage}
          onPeriodChange={(value) => setChartPeriod('vehicleRouteUsage', value)}
          customRange={customRanges.vehicleRouteUsage}
          onCustomRangeChange={(value) => setCustomRange('vehicleRouteUsage', value)}
          onExport={() => exportSimple('admin-route-usage-by-biking-type', charts.routeUsageAdmin)}
        >
          {charts.routeUsageAdmin.length ? (
            <ResponsiveContainer width="100%" height={280} minWidth={260} minHeight={220}>
              <BarChart data={charts.routeUsageAdmin} margin={{ left: 10, right: 20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis allowDecimals={false} />
                <Tooltip content={<AnalyticsTooltip valueLabel="Trip count" xAxisName="Route" yAxisName="Trips" />} />
                <Legend />
                <Bar dataKey="Quad Single" stackId="route" fill={COLORS[1]} />
                <Bar dataKey="Quad Double" stackId="route" fill={COLORS[0]} />
                <Bar dataKey="Buggy" stackId="route" fill={COLORS[3]} />
                <Bar dataKey="Unspecified Type" stackId="route" fill={COLORS[2]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </ChartCard>

        <ChartCard
          title="Admin Exact OUT / IN Timeline"
          subtitle="Exact minute/second visibility for vehicle OUT and IN activity. No hour rounding."
          period={chartPeriods.vehiclePeakTime}
          onPeriodChange={(value) => setChartPeriod('vehiclePeakTime', value)}
          customRange={customRanges.vehiclePeakTime}
          onCustomRangeChange={(value) => setCustomRange('vehiclePeakTime', value)}
          onExport={() => exportSimple('admin-peak-out-in-time', charts.peakOutInAdmin)}
        >
          {charts.peakOutInAdmin.length ? (
            <ResponsiveContainer width="100%" height={280} minWidth={260} minHeight={220}>
              <LineChart data={charts.peakOutInAdmin}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" interval={0} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="linear" dataKey="OUT" name="OUT count" stroke="#6f3cff" strokeWidth={3} dot={{ r: 5 }} />
                <Line type="linear" dataKey="IN" name="IN count" stroke="#24f66f" strokeWidth={3} dot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </ChartCard>

        <ChartCard
          title="Admin Fuel by Vehicle Type"
          subtitle="Fuel litres grouped by vehicle type/category from live fuel records."
          period={chartPeriods.fuelTypeDashboard}
          onPeriodChange={(value) => setChartPeriod('fuelTypeDashboard', value)}
          customRange={customRanges.fuelTypeDashboard}
          onCustomRangeChange={(value) => setCustomRange('fuelTypeDashboard', value)}
          onExport={() => exportSimple('admin-fuel-type-usage', charts.fuelByVehicleTypeAdmin)}
        >
          {charts.fuelByVehicleTypeAdmin.length ? (
            <ResponsiveContainer width="100%" height={280} minWidth={260} minHeight={220}>
              <PieChart>
                <Pie data={charts.fuelByVehicleTypeAdmin} dataKey="value" nameKey="label" innerRadius={55} outerRadius={90}>
                  {charts.fuelByVehicleTypeAdmin.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip content={<AnalyticsTooltip valueLabel="Fuel" suffix=" L" xAxisName="Vehicle Type" yAxisName="Fuel Litres" />} />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </ChartCard>

        <ChartCard
          title="Admin Fuel Visits by Plate"
          subtitle="Count of fuel-up records by exact vehicle plate."
          period={chartPeriods.fuelVisitVehiclePlate}
          onPeriodChange={(value) => setChartPeriod('fuelVisitVehiclePlate', value)}
          customRange={customRanges.fuelVisitVehiclePlate}
          onCustomRangeChange={(value) => setCustomRange('fuelVisitVehiclePlate', value)}
          onExport={() => exportSimple('admin-fuel-visits-by-plate', charts.fuelVisitsByPlateAdmin)}
        >
          <BarList rows={charts.fuelVisitsByPlateAdmin} />
        </ChartCard>

        <ChartCard
          title="Store Stock Value by Category"
          subtitle="Exact inventory cost value grouped by category from live InventoryItem stock."
          badge="Value"
          onExport={() => exportSimple('store-stock-value-by-category', group((inventory || []).map(cleanInventoryItem), (item) => item.category || 'Uncategorised', (item) => n(item.currentStock) * n(item.costPrice)).slice(0, 12))}
        >
          <BarList
            rows={group((inventory || []).map(cleanInventoryItem), (item) => item.category || 'Uncategorised', (item) => n(item.currentStock) * n(item.costPrice)).slice(0, 12).map((row) => ({
              ...row,
              displayValue: money(row.value),
            }))}
            cost
          />
        </ChartCard>
      </div>
    </div>
  );
}
