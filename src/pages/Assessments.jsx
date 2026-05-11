import { useState } from 'react';
import { AssessmentForm } from '../components/Forms.jsx';
import { Badge, Button, Card, Field, Input, Modal, PageHeader, TextArea, Select } from '../components/UI.jsx';
import { useApp } from '../context/AppContext.jsx';

export default function Assessments(){
 const { currentUser, assessments, completeAssessment, issuePartsForAssessment, reopenAssessment, updateAssessment, inventory } = useApp();
 const [modal,setModal]=useState(null);
 const opened=assessments.filter(a=>a.status!=='Completed');
 const completed=assessments.filter(a=>a.status==='Completed');
 const canCreate = currentUser.role === 'admin' || currentUser.role === 'mechanic';
 return <div className="page"><PageHeader title="Assessments" subtitle="Mechanics open tickets. Store keeper views required parts and completes after issuing parts." action={canCreate?()=>setModal({type:'new'}):null} actionLabel="New Assessment"/>
 <div className="section-tabs"><b>Opened / In Progress</b><span>{opened.length} ticket(s)</span></div>
 <div className="card-grid">{opened.map(a=><AssessmentCard key={a.id} assessment={a} onView={()=>setModal({type:'view', item:a})}/>)}</div>
 <div className="section-tabs"><b>Completed</b><span>{completed.length} ticket(s)</span></div>
 <div className="card-grid">{completed.map(a=><AssessmentCard key={a.id} assessment={a} onView={()=>setModal({type:'view', item:a})}/>)}</div>
 {modal?.type==='new' && <Modal title="New Assessment" onClose={()=>setModal(null)} wide><AssessmentForm onDone={()=>setModal(null)}/></Modal>}
 {modal?.type==='view' && <Modal title={`${modal.item.id} Assessment Details`} onClose={()=>setModal(null)} wide><AssessmentDetail assessment={modal.item} role={currentUser.role} inventory={inventory} onIssue={(note)=>{issuePartsForAssessment(modal.item.id, note); setModal(null)}} onComplete={()=>{completeAssessment(modal.item.id); setModal(null)}} onReopen={(reason)=>{reopenAssessment(modal.item.id, reason); setModal(null)}} onUpdate={(updates)=>{updateAssessment(modal.item.id,updates); setModal(null)}} /></Modal>}
 </div>
}
function AssessmentCard({assessment,onView}){return <Card><div className="card-head"><h2>{assessment.id}</h2><Badge tone={assessment.status==='Completed'?'success':'warning'}>{assessment.status}</Badge></div><p><b>Vehicle:</b> {assessment.vehicle}</p><p><b>Mechanic:</b> {assessment.mechanic}</p><p>{assessment.issue}</p><p><b>Parts:</b> {assessment.parts.map(p=>`${p.name} x${p.qty}`).join(', ') || 'None listed'}</p><button className="open-btn" onClick={onView}>View</button></Card>}
function AssessmentDetail({assessment, role, inventory, onComplete, onIssue, onReopen, onUpdate}){
 const [reason,setReason]=useState('');
 const [issue,setIssue]=useState(assessment.issue);
 const [conclusion,setConclusion]=useState(assessment.conclusion);
 const [parts,setParts]=useState(assessment.parts || []);
 const [partId,setPartId]=useState(inventory[0]?.id || 'manual');
 const [manualPart,setManualPart]=useState('');
 const [qty,setQty]=useState(1);
 const [issuedNote,setIssuedNote]=useState('');
 function addPart(){
  if(partId==='manual'){ if(!manualPart.trim()) return; setParts([...parts,{partId:'manual', name:manualPart.trim(), qty:Number(qty)}]); setManualPart(''); return; }
  const p=inventory.find(i=>i.id===partId); if(p) setParts([...parts,{partId:p.id,name:p.name,qty:Number(qty)}]);
 }
 return <div className="detail-stack"><p><b>Vehicle:</b> {assessment.vehicle}</p><p><b>Mechanic:</b> {assessment.mechanic}</p><p><b>Created:</b> {assessment.createdAt}</p>{assessment.reopenReason && <div className="notice"><b>Re-opened by:</b> {assessment.reopenedBy}<br/><b>Reason:</b> {assessment.reopenReason}</div>}
 <div className="form-grid"><Field label="Issue"><TextArea value={issue} onChange={e=>setIssue(e.target.value)}/></Field><Field label="Conclusion"><TextArea value={conclusion} onChange={e=>setConclusion(e.target.value)}/></Field></div>
 <h3 className="section-small">Required Parts</h3><div className="part-list">{parts.map((p,i)=><span key={i}>{p.name} x {p.qty}</span>)}</div>
 {(role==='admin'||role==='mechanic'||role==='store') && <div className="form-grid"><Field label="Add Part"><div className="inline-fields"><Select value={partId} onChange={e=>setPartId(e.target.value)}>{inventory.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}<option value="manual">Manual input</option></Select><Input type="number" min="1" value={qty} onChange={e=>setQty(e.target.value)}/><Button type="button" variant="secondary" onClick={addPart}>Add</Button></div></Field>{partId==='manual' && <Field label="Manual Part"><Input value={manualPart} onChange={e=>setManualPart(e.target.value)}/></Field>}</div>}
 {role==='store' && assessment.status!=='Completed' && <Field label="Issued Parts / Store Keeper Note"><TextArea placeholder="Write parts issued, quantity, invoice/store note..." value={issuedNote} onChange={e=>setIssuedNote(e.target.value)}/></Field>}<div className="button-row"><Button onClick={()=>{ if(window.confirm('Save assessment updates?')) onUpdate({issue, conclusion, parts}); }}>Save Updates</Button>{role==='store' && assessment.status!=='Completed' && <Button variant="warning" onClick={()=>{ if(window.confirm('Confirm parts issuance and complete this assessment?')) onIssue(issuedNote); }}>Issue Parts & Complete</Button>}{role!=='store' && assessment.status!=='Completed' && <Button variant="secondary" onClick={()=>{ if(window.confirm('Mark this assessment as completed?')) onComplete(); }}>Mark Complete</Button>}</div>
 <div className="section-small"><Field label="Reason to Re-open / Accountability"><Input value={reason} onChange={e=>setReason(e.target.value)} placeholder="Required if reopening"/></Field><Button variant="secondary" onClick={()=>reason.trim()?onReopen(reason):alert('Please provide a clear reason before reopening.')}>Re-open Assessment</Button></div></div> }
