import { useState } from 'react';
import { Badge, Button, Card, Modal, PageHeader, Table } from '../components/UI.jsx';
import { useApp } from '../context/AppContext.jsx';
import { VehicleForm } from '../components/Forms.jsx';

export default function GuestPending(){
  const { guestTickets, updateGuestTicket, currentUser, findVehicleByPlate } = useApp();
  const [modal,setModal]=useState(null);

  const pendingTickets = guestTickets.filter(t => t.status === 'Pending');

  function vehicleDraft(ticket){
    return {
      ...ticket,
      id: undefined,
      guestTicketId: ticket.id,
      plate: ticket.plate,
      vin: ticket.vin || '',
      type: ticket.type || 'Quad',
      model: ticket.model || '',
      cc: ticket.cc || '',
      imageUrl: ticket.imageUrl || '',
      ownership:'External',
      owner:ticket.companyName || ticket.name || 'Guest Drop-off',
      deliveryPersonName:ticket.deliveryPersonName || ticket.name,
      contactNumber:ticket.contactNumber,
      email:ticket.email,
      checkInDateTime:ticket.createdAt,
      status:'Under Repair',
      mechanic:currentUser?.name || '',
      notes:`Guest ticket ${ticket.id}. ${ticket.notes || ''}`
    };
  }

  function afterVehicleSaved(ticket, savedVehicle){
    const vehicle = savedVehicle || findVehicleByPlate(ticket.plate) || { id:`TEMP-${ticket.plate}`, plate:ticket.plate };
    updateGuestTicket(ticket.id, {
      status:'Taken',
      vehicleId: vehicle.id,
      takenBy: currentUser?.name || 'Mechanic',
      takenAt: new Date().toLocaleString('en-GB')
    });
    setModal({ type:'done', ticket, vehicle });
  }

  return <div className="page">
    <PageHeader title="Guest Pending Tickets" subtitle="Guest tickets waiting for mechanic action. Mechanic can view or take the ticket only." />

    {pendingTickets.length===0 && <Card><h2>No guest tickets pending</h2><p>When a guest submits a garage drop-off ticket, it will appear here.</p></Card>}

    <Table headers={["Ticket","Plate","Model","Person","Date/Time","Reason","Status","Action"]}>
      {guestTickets.map(t=><tr key={t.id}>
        <td><b>{t.id}</b></td>
        <td>{t.plate}</td>
        <td>{t.model || t.type}</td>
        <td>{t.name || t.deliveryPersonName}</td>
        <td>{t.createdAt?.replace('T',' ')}</td>
        <td>{t.notes}</td>
        <td><Badge tone={t.status==='Pending'?'warning':'success'}>{t.status}</Badge></td>
        <td>{t.status==='Pending'
          ? <div className="inline-actions">
              <Button variant="secondary" onClick={()=>setModal({type:'view', ticket:t})}>View</Button>
              <Button onClick={()=>setModal({type:'take', ticket:t})}>Take</Button>
            </div>
          : <span>Taken by {t.takenBy || '-'}</span>}
        </td>
      </tr>)}
    </Table>

    {modal?.type==='view' && <Modal title={`View Guest Ticket - ${modal.ticket.id}`} onClose={()=>setModal(null)} wide>
      <GuestTicketView ticket={modal.ticket} onTake={()=>setModal({type:'take', ticket:modal.ticket})}/>
    </Modal>}

    {modal?.type==='take' && <Modal title={`Take Guest Ticket - ${modal.ticket.id}`} onClose={()=>setModal(null)} wide>
      <div className="notice">Taking the ticket opens the normal Add Vehicle form. After saving, the ticket is marked as taken. Then go to Assessments to create/start the assessment normally.</div>
      <VehicleForm initialVehicle={vehicleDraft(modal.ticket)} onDone={(savedVehicle)=>afterVehicleSaved(modal.ticket, savedVehicle)} />
    </Modal>}

    {modal?.type==='done' && <Modal title="Guest Ticket Taken" onClose={()=>setModal(null)} wide>
      <Card>
        <h2>Vehicle saved and ticket taken</h2>
        <p><b>Plate:</b> {modal.vehicle?.plate || modal.ticket.plate}</p>
        <p>The ticket is no longer pending. Continue the original flow by opening <b>Assessments</b> and creating the assessment for this vehicle.</p>
      </Card>
      <div className="form-actions">
        <Button onClick={()=>setModal(null)}>Close</Button>
      </div>
    </Modal>}
  </div>
}

function GuestTicketView({ticket,onTake}){
  return <div className="detail-stack">
    <div className="vehicle-hero-card">
      <img src={ticket.imageUrl || '/vehicles/quad-450l.jpeg'} />
      <div>
        <h2>{ticket.plate}</h2>
        <p><b>Model:</b> {ticket.model || ticket.type} • <b>VIN:</b> {ticket.vin || 'Not provided'}</p>
        <p><b>Delivered by:</b> {ticket.name || ticket.deliveryPersonName} • <b>Contact:</b> {ticket.contactNumber || '-'}</p>
        <p><b>Date/Time:</b> {ticket.createdAt?.replace('T',' ')}</p>
        <p><b>Reason:</b> {ticket.notes || '-'}</p>
      </div>
    </div>
    <div className="notice">View only does not assign this ticket. Click Take to continue with Add Vehicle.</div>
    <div className="form-actions"><Button onClick={onTake}>Take Ticket</Button></div>
  </div>
}
