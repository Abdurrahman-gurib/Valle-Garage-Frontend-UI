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
import Inventory from './pages/Inventory.jsx';
import Transactions from './pages/Transactions.jsx';
import Reports from './pages/Reports.jsx';
import Settings from './pages/Settings.jsx';
import Notifications from './pages/Notifications.jsx';
import NotFound from './pages/NotFound.jsx';

function Protected({ children }) { const { currentUser } = useApp(); return currentUser ? children : <Navigate to="/login" replace />; }

export default function App(){
  return <Routes>
    <Route path="/login" element={<Login/>}/>
    <Route path="/guest" element={<GuestDropoff/>}/>
    <Route path="/" element={<Protected><AppLayout/></Protected>}>
      <Route index element={<Navigate to="/login" replace/>}/>
      <Route path="dashboard" element={<Dashboard/>}/>
      <Route path="vehicles" element={<Vehicles/>}/>
      <Route path="vehicles/:plate" element={<VehicleHistory/>}/>
      <Route path="assessments" element={<Assessments/>}/>
      <Route path="garage" element={<Garage/>}/>
      <Route path="guest-pending" element={<GuestPending/>}/>
      <Route path="inventory" element={<Inventory/>}/>
      <Route path="transactions" element={<Transactions/>}/>
      <Route path="reports" element={<Reports/>}/>
      <Route path="settings" element={<Settings/>}/>
      <Route path="notifications" element={<Notifications/>}/>
    </Route>
    <Route path="*" element={<NotFound/>}/>
  </Routes>
}
