
export default function VehicleChecklist({ checklist = {}, setChecklist }) {
  const checklistItems = [
    'Brake Pads','Oil Level','Brake Fluid','Suspension',
    'Alignment','Tyre Pressure','Radiator','Battery',
    'Lights','Steering','Safety Accessories'
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {checklistItems.map((item) => (
        <label key={item} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={checklist[item] || false}
            onChange={(e)=>setChecklist({
              ...checklist,
              [item]: e.target.checked
            })}
          />
          <span>{item}</span>
        </label>
      ))}
    </div>
  );
}
