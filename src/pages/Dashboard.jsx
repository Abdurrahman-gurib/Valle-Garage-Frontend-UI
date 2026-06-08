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
  XAxis,
  YAxis,
} from 'recharts';
import { Badge, Button, Card, PageHeader } from '../components/UI.jsx';
import { useApp } from '../context/AppContext.jsx';

function n(v) {
  return Number(v || 0);
}

function money(v) {
  return `MUR ${n(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function toDate(v) {
  const d = v ? new Date(v) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
}

function dayKey(v) {
  const d = toDate(v) || new Date();
  return d.toISOString().slice(0, 10);
}

function weekKey(v) {
  const d = toDate(v) || new Date();
  const first = new Date(d.getFullYear(), 0, 1);
  const diff = Math.floor((d.getTime() - first.getTime()) / 86400000);
  return `${d.getFullYear()}-W${String(
    Math.ceil((diff + first.getDay() + 1) / 7)
  ).padStart(2, '0')}`;
}

function monthKey(v) {
  const d = toDate(v) || new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function secondsBetween(startValue, endValue) {
  const start = toDate(startValue);
  const end = toDate(endValue) || new Date();
  return start ? Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000)) : 0;
}

function duration(seconds) {
  let s = Math.max(0, Math.floor(n(seconds)));
  const d = Math.floor(s / 86400); s %= 86400;
  const h = Math.floor(s / 3600); s %= 3600;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return d ? `${d}d ${h}h ${m}m ${sec}s` : `${h}h ${m}m ${sec}s`;
}

function formatDateTime(value) {
  const d = toDate(value);
  if (!d) return '-';
  const pad = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
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

    return {
      fuelTrend: trendWithVehicleBreakdown(
        fuelTrendRows,
        chartPeriods.dailyFuel,
        (fuel) => fuel.recordedAt,
        (fuel) => fuel.vehicle || fuel.vehiclePlate || fuel.plate || 'Unknown',
        (fuel) => n(fuel.fuelLitres),
        (value) => `${Number(value).toFixed(1)} L`
      ).slice(-14),

      fuelByVehicle: group(
        fuelRows,
        (fuel) => fuel.vehicle || fuel.vehiclePlate || fuel.plate || 'Unknown',
        (fuel) => n(fuel.fuelLitres)
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
      ).slice(0, 12).map((row) => ({
        ...row,
        costLabel: money(row.value),
        partsLabel: (partsByPlate[row.label] || []).slice(0, 4).join(', ') || 'No parts listed',
      })),

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
      vehicleOutActivities,
      garageOps,
      assessments,
      chartPeriods,
      customRanges,
      liveNow,
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
    (sum, fuel) => sum + n(fuel.fuelLitres),
    0
  );

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
        </div>

        <div className="dashboard-chart-grid">
          <ChartCard
            title="Low Stock Risk"
            subtitle="Items at or below reorder level."
            badge="Stock"
          >
            <BarList rows={storeCharts.lowStock} />
          </ChartCard>

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
              <ResponsiveContainer width="100%" height="100%">
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
          label="Parts Cost Today"
          value={money(repairCostToday)}
          note="Actual cost price total"
          onClick={() => navigate('/reports')}
        />
        <Kpi
          label="Parts Charged Today"
          value={money(partsChargedToday)}
          note={`Margin ${money(partsMarginToday)}`}
          onClick={() => navigate('/reports')}
        />
        <Kpi
          label="Low Stock"
          value={lowStock.length}
          note="At/below reorder level"
          onClick={() => navigate('/inventory')}
        />
      </div>

      <div className="dashboard-chart-grid">
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
            <ResponsiveContainer width="100%" height="100%">
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
            <ResponsiveContainer width="100%" height="100%">
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
            <ResponsiveContainer width="100%" height="100%">
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
            <ResponsiveContainer width="100%" height="100%">
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
            <ResponsiveContainer width="100%" height="100%">
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
            <ResponsiveContainer width="100%" height="100%">
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
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="value"
                  name="Parts Cost"
                  label={{ value: 'X Axis: Parts Cost (MUR)', position: 'insideBottom', offset: -3 }}
                />
                <YAxis
                  type="number"
                  dataKey="value"
                  name="Repair Cost"
                  label={{ value: 'Y Axis: Repair Cost (MUR)', angle: -90, position: 'insideLeft' }}
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
          title="Low Stock Risk"
          subtitle="Items at or below reorder level."
          badge="Stock"
        >
          <BarList
            rows={lowStock.slice(0, 12).map((item) => ({
              label: item.name,
              value: n(item.stock),
            }))}
          />
        </ChartCard>
      </div>
    </div>
  );
}
