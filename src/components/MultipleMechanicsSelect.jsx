import { useMemo, useState } from 'react';

export default function MultipleMechanicsSelect({ mechanics = [], selectedMechanics = [], setSelectedMechanics }) {
  const [value, setValue] = useState('');

  const cleanMechanics = useMemo(() => {
    const seen = new Set();
    return (mechanics || [])
      .filter(Boolean)
      .map((m) => ({
        ...m,
        id: m.id || m.email || m.name,
        name: m.name || m.email || 'Unnamed mechanic',
        email: m.email || '',
      }))
      .filter((m) => {
        if (!m.id || seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [mechanics]);

  const selectedSet = new Set((selectedMechanics || []).filter(Boolean));
  const selected = cleanMechanics.filter((m) => selectedSet.has(m.id));
  const remaining = cleanMechanics.filter((m) => !selectedSet.has(m.id));

  function add(id) {
    if (!id || selectedSet.has(id)) return;
    setSelectedMechanics([...(selectedMechanics || []), id]);
    setValue('');
  }

  function remove(id) {
    setSelectedMechanics((selectedMechanics || []).filter((x) => x !== id));
  }

  return (
    <div className="multi-mechanics-picker">
      <select className="input" value={value} onChange={(e) => add(e.target.value)}>
        <option value="">Choose mechanic to add</option>
        {remaining.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}{m.email ? ` (${m.email})` : ''}
          </option>
        ))}
      </select>

      <div className="selected-chips mechanic-chip-list">
        {selected.map((m) => (
          <button type="button" key={m.id} onClick={() => remove(m.id)} title="Remove mechanic">
            <span>{m.name}</span><b>×</b>
          </button>
        ))}
        {!selected.length && <small>No mechanic selected yet.</small>}
      </div>

      {cleanMechanics.length === 0 && (
        <small className="form-warning">No mechanic users were loaded from the database. Check backend /api/users/mechanics.</small>
      )}
    </div>
  );
}
