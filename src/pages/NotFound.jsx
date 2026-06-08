import { Link } from 'react-router-dom';
import Logo from '../components/Logo.jsx';

export default function NotFound(){
  return (
    <div className="not-found-page valle-rescue-404">
      <div className="rescue-sky" />
      <div className="rescue-trail trail-one" />
      <div className="rescue-trail trail-two" />
      <div className="rescue-card">
        <Logo />
        <p className="eyebrow">VALLÉ ADVENTURE PARK SYSTEM</p>
        <div className="rescue-code">
          <span>4</span>
          <span className="compass-zero">0</span>
          <span>4</span>
        </div>
        <h1>Route Not Found</h1>
        <p className="rescue-copy">
          This page is outside the garage map. Return to operations, ask support,
          or switch login if this area needs another role.
        </p>
        <div className="rescue-map">
          <span>Garage</span><i /> <span>Parts</span><i /> <span>Fuel</span><i /> <span>Reports</span>
        </div>
        <div className="not-found-actions">
          <Link className="btn btn-primary" to="/dashboard">Return to Dashboard</Link>
          <Link className="outline-btn" to="/support">Ask Support</Link>
          <Link className="outline-btn" to="/login">Switch Login</Link>
        </div>
      </div>
    </div>
  );
}
