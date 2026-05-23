
export default function PartsCostTable({ parts = [] }) {

  const total = parts.reduce(
    (sum,p)=>sum + (
      Number(p.qty || 0) *
      Number(p.sellingPrice || 0)
    ),
    0
  );

  return (
    <div className="parts-cost-table">
      <table style={{width:'100%'}}>
        <thead>
          <tr>
            <th>Part</th>
            <th>Qty</th>
            <th>Selling Price (MUR)</th>
            <th>Total</th>
          </tr>
        </thead>

        <tbody>
          {parts.map((p,i)=>(
            <tr key={i}>
              <td>{p.name}</td>
              <td>{p.qty}</td>
              <td>
                Rs {Number(
                  p.sellingPrice || 0
                ).toLocaleString()}
              </td>
              <td>
                Rs {(
                  Number(p.qty || 0) *
                  Number(p.sellingPrice || 0)
                ).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 style={{marginTop:'16px'}}>
        Total Cost: Rs {total.toLocaleString()}
      </h3>
    </div>
  );
}
