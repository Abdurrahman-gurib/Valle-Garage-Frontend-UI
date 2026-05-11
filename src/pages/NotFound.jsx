import { Link } from 'react-router-dom';
import Logo from '../components/Logo.jsx';

export default function NotFound(){
  return <div className="not-found-page">
    <div className="not-found-card">
      <Logo />
      <h1>404</h1>
      <h2>Page not found</h2>
      <p>The page you tried to open does not exist or your role does not have access to it.</p>
      <div className="button-row center"><Link className="btn btn-primary" to="/dashboard">Back to Dashboard</Link><Link className="outline-btn" to="/login">Login</Link></div>
    </div>
  </div>
}
