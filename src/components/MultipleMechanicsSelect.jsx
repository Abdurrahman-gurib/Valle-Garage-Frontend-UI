
export default function MultipleMechanicsSelect({
  mechanics = [],
  selectedMechanics = [],
  setSelectedMechanics
}) {

  const toggleMechanic = (id) => {
    if(selectedMechanics.includes(id)) {
      setSelectedMechanics(
        selectedMechanics.filter((m)=>m !== id)
      );
    } else {
      setSelectedMechanics([
        ...selectedMechanics,
        id
      ]);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      {mechanics.map((m)=>(
        <label key={m.id} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={selectedMechanics.includes(m.id)}
            onChange={()=>toggleMechanic(m.id)}
          />
          <span>{m.name}</span>
        </label>
      ))}
    </div>
  );
}
