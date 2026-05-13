import { useState } from 'react';
import { AssessmentForm } from '../components/Forms.jsx';
import { Badge, Button, Card, Field, Input, Modal, PageHeader, TextArea, Select, Table } from '../components/UI.jsx';
import { useApp } from '../context/AppContext.jsx';

export default function Assessments(){
  const app = useApp();
  const currentUser = app?.currentUser || { role:'mechanic', name:'Mechanic' };
  const assessments = app?.assessments || [];
  const completeAssessment = app?.completeAssessment;
  const issuePartsForAssessment = app?.issuePartsForAssessment;
  const reopenAssessment = app?.reopenAssessment;
  const updateAssessment = app?.updateAssessment;
  const inventory = app?.inventory || [];
  const [modal,setModal]=useState(null);

  const role = currentUser?.role || 'mechanic';
  const opened = assessments.filter(a => a.status !== 'Completed');
  const completed = assessments.filter(a => a.status === 'Completed');
  const canCreate = role === 'admin' || role === 'mechanic';

  return <div className="page">
    <PageHeader
      title="Assessments"
      subtitle="Mechanics create assessment tickets. Store Keeper views tickets and issues parts."
      action={canCreate ? () => setModal({type:'new'}) : null}
      actionLabel="New Assessment"
    />

    <div className="section-tabs"><b>Opened / In Progress</b><span>{opened.length} ticket(s)</span></div>
    {opened.length === 0 && <Card><h2>No open assessments</h2><p>Create a new assessment from the button above.</p></Card>}
    <div className="card-grid">
      {opened.map(a => <AssessmentCard key={a.id} assessment={a} onView={()=>setModal({type:'view', item:a})}/>)}
    </div>

    <div className="section-tabs"><b>Completed</b><span>{completed.length} ticket(s)</span></div>
    <div className="card-grid">
      {completed.map(a => <AssessmentCard key={a.id} assessment={a} onView={()=>setModal({type:'view', item:a})}/>)}
    </div>

    {modal?.type==='new' && <Modal title="New Assessment" onClose={()=>setModal(null)} wide>
      <AssessmentForm onDone={()=>setModal(null)} />
    </Modal>}

    {modal?.type==='view' && <Modal title={`${modal.item.id} Assessment Details`} onClose={()=>setModal(null)} wide>
      <AssessmentDetail
        assessment={modal.item}
        role={role}
        inventory={inventory}
        onIssue={(note, parts)=>{
          if(window.confirm('Confirm issued parts and deduct inventory now?')){
            issuePartsForAssessment?.(modal.item.id, note, parts);
            setModal(null);
          }
        }}
        onComplete={()=>{ completeAssessment?.(modal.item.id); setModal(null); }}
        onReopen={(reason)=>{ reopenAssessment?.(modal.item.id, reason || 'Reopened'); setModal(null); }}
        onUpdate={(updates)=>{ updateAssessment?.(modal.item.id, updates); setModal(null); }}
      />
    </Modal>}
  </div>
}

function AssessmentCard({assessment,onView}){
  return <Card>
    <div className="card-head">
      <h2>{assessment.id}</h2>
      <Badge tone={assessment.status==='Completed'?'success':assessment.status==='Parts Issued'?'success':'warning'}>{assessment.status}</Badge>
    </div>
    <p><b>Vehicle:</b> {assessment.vehicle || assessment.vehicleId || '-'}</p>
    <p><b>Mechanic:</b> {assessment.mechanic || '-'}</p>
    <p>{assessment.issue || 'No issue recorded'}</p>
    <p><b>Parts:</b> {(assessment.parts||[]).map(p=>`${p.name} x${p.qty}`).join(', ') || 'None listed'}</p>
    <button className="open-btn" onClick={onView}>View Ticket</button>
  </Card>
}

function AssessmentDetail({assessment,role,inventory,onIssue,onComplete,onReopen,onUpdate}){
  const [issuedNote,setIssuedNote]=useState(assessment.issuedPartsNote || '');
  const [reason,setReason]=useState('');
  const [extraPart,setExtraPart]=useState(inventory[0]?.id || '');
  const [extraQty,setExtraQty]=useState(1);
  const [parts,setParts]=useState(assessment.parts || []);
  const isStore = role === 'store' || role === 'admin';

  function addInventoryPart(){
    const item = inventory.find(i => i.id === extraPart);
    if(!item) return;
    const qty = Number(extraQty || 1);
    setParts(prev => [...prev, {
      partId:item.id,
      sku:item.sku,
      name:item.name,
      qty,
      stockBefore:item.stock,
      location:item.location,
      category:item.category
    }]);
  }

  function removePart(index){
    setParts(prev => prev.filter((_,i)=>i!==index));
  }

  return <div className="detail-stack">
    <Card>
      <h2>{assessment.vehicle || assessment.vehicleId || '-'}</h2>
      <p><b>Mechanic:</b> {assessment.mechanic || '-'}</p>
      <p><b>Status:</b> {assessment.status}</p>
      <p><b>Issue:</b> {assessment.issue}</p>
      <p><b>Conclusion:</b> {assessment.conclusion || '-'}</p>
    </Card>

    <Card>
      <h3>Required / Issued Parts</h3>
      <Table headers={["SKU","Part","Available Qty","Issue Qty","Location","Action"]}>
        {parts.map((p,i)=><tr key={`${p.name}-${i}`}>
          <td>{p.sku || p.partId || '-'}</td>
          <td><b>{p.name}</b></td>
          <td>{p.stockBefore ?? '-'}</td>
          <td>{p.qty}</td>
          <td>{p.location || '-'}</td>
          <td><button className="part-remove-row" onClick={()=>removePart(i)}>× Remove</button></td>
        </tr>)}
      </Table>

      {isStore && <div className="inventory-picker">
        <Field label="Select Part from Inventory">
          <Select value={extraPart} onChange={e=>setExtraPart(e.target.value)}>
            {inventory.map(p=><option value={p.id} key={p.id}>{p.sku || p.id} | {p.name} | Qty: {p.stock} | {p.location || 'No location'}</option>)}
          </Select>
        </Field>
        <Field label="Quantity"><Input type="number" min="1" value={extraQty} onChange={e=>setExtraQty(e.target.value)}/></Field>
        <Button type="button" variant="secondary" onClick={addInventoryPart}>Add Part</Button>
      </div>}
    </Card>

    {isStore && <Card>
      <h3>Store Keeper Action</h3>
      <Field label="Issued Parts Note"><TextArea value={issuedNote} onChange={e=>setIssuedNote(e.target.value)} /></Field>
      <div className="form-actions">
        <Button onClick={()=>onIssue(issuedNote, parts)}>Issue Parts & Close Store Ticket</Button>
        <Button variant="secondary" onClick={()=>onReopen(reason || prompt('Reason for reopening?') || 'Reopened by Store Keeper')}>Re-open Ticket</Button>
      </div>
    </Card>}

    {role==='mechanic' && <div className="form-actions">
      <Button variant="secondary" onClick={()=>onUpdate({status:'In Diagnosis'})}>Mark In Diagnosis</Button>
      <Button onClick={onComplete}>Mark Completed</Button>
    </div>}

    {role==='mechanic' && assessment.status==='Completed' && <Card>
      <h3>Reopen Assessment</h3>
      <Field label="Reason"><Input value={reason} onChange={e=>setReason(e.target.value)}/></Field>
      <Button variant="secondary" onClick={()=>onReopen(reason)}>Reopen</Button>
    </Card>}
  </div>
}
