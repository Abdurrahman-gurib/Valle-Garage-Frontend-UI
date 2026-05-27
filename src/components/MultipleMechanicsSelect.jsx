
import { useMemo, useState } from 'react';

export default function MultipleMechanicsSelect({ mechanics = [], selectedMechanics = [], setSelectedMechanics }) {
  const [value, setValue] = useState('');
  const selectedSet = new Set(selectedMechanics || []);
  const selected = useMemo(() => mechanics.filter(m => selectedSet.has(m.id)), [mechanics, selectedMechanics]);
  const remaining = mechanics.filter(m => !selectedSet.has(m.id));
  function add(id){ if(!id) return; setSelectedMechanics([...(selectedMechanics || []), id]); setValue(''); }
  function remove(id){ setSelectedMechanics((selectedMechanics || []).filter(x => x !== id)); }
  return <div className="multi-mechanics-picker">
    <select className="input" value={value} onChange={e=>add(e.target.value)}>
      <option value="">Choose mechanic to add</option>
      {remaining.map(m => <option key={m.id || m.email} value={m.id}>{m.name}</option>)}
    </select>
    <div className="selected-chips">
      {selected.map(m => <button type="button" key={m.id || m.email} onClick={()=>remove(m.id)}><span>{m.name}</span><b>×</b></button>)}
      {!selected.length && <small>No extra mechanic selected yet.</small>}
    </div>
  </div>;
}
