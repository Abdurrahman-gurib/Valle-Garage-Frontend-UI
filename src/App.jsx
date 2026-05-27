import { Navigate, Route, Routes } from 'react-router-dom';
import { useApp } from './context/AppContext.jsx';
import AppLayout from './layouts/AppLayout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Vehicles from './pages/Vehicles.jsx';
import VehicleHistory from './pages/VehicleHistory.jsx';
import GuestDropoff from './pages/GuestDropoff.jsx';
import GuestPending from './pages/GuestPending.jsx';
import Assessments from './pages/Assessments.jsx';
import Garage from './pages/Garage.jsx';
import FuelConsumption from './pages/FuelConsumption.jsx';
import VehicleOut from './pages/VehicleOut.jsx';
import Inventory from './pages/Inventory.jsx';
import Transactions from './pages/Transactions.jsx';
import Reports from './pages/Reports.jsx';
import Settings from './pages/Settings.jsx';
import Notifications from './pages/Notifications.jsx';
import NotFound from './pages/NotFound.jsx';

function homeFor(role){
  if(role === 'fuel') return '/fuel';
  if(role === 'vehicle_manager') return '/vehicle-out';
  return '/dashboard';
}
function Protected({ children }) { const { currentUser } = useApp(); return currentUser ? children : <Navigate to="/login" replace />; }
function Allowed({ section, children }) { const { currentUser, can } = useApp(); if(!currentUser) return <Navigate to="/login" replace />; return can(section) ? children : <Navigate to={homeFor(currentUser.role)} replace />; }

export default function App(){
  return <Routes>
    <Route path="/login" element={<Login/>}/>
    <Route path="/guest" element={<GuestDropoff/>}/>
    <Route path="/" element={<Protected><AppLayout/></Protected>}>
      <Route index element={<Navigate to="/login" replace/>}/>
      <Route path="dashboard" element={<Allowed section="dashboard"><Dashboard/></Allowed>}/>
      <Route path="vehicles" element={<Allowed section="vehicles"><Vehicles/></Allowed>}/>
      <Route path="vehicles/:plate" element={<Allowed section="vehicles"><VehicleHistory/></Allowed>}/>
      <Route path="assessments" element={<Allowed section="assessments"><Assessments/></Allowed>}/>
      <Route path="garage" element={<Allowed section="garage"><Garage/></Allowed>}/>
      <Route path="fuel" element={<Allowed section="fuel"><FuelConsumption/></Allowed>}/>
      <Route path="vehicle-out" element={<Allowed section="vehicle-out"><VehicleOut/></Allowed>}/>
      <Route path="guest-pending" element={<Allowed section="guest-pending"><GuestPending/></Allowed>}/>
      <Route path="inventory" element={<Allowed section="inventory"><Inventory/></Allowed>}/>
      <Route path="transactions" element={<Allowed section="transactions"><Transactions/></Allowed>}/>
      <Route path="reports" element={<Allowed section="reports"><Reports/></Allowed>}/>
      <Route path="settings" element={<Allowed section="settings"><Settings/></Allowed>}/>
      <Route path="notifications" element={<Allowed section="notifications"><Notifications/></Allowed>}/>
    </Route>
    <Route path="*" element={<NotFound/>}/>
  </Routes>
}
