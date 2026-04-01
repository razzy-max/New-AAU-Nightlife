import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { clearUserAuth, getUserData, USER_AUTH_CHANGED_EVENT } from '../utils/userAuth';

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const syncUser = () => setUser(getUserData());
    syncUser();
    window.addEventListener('storage', syncUser);
    window.addEventListener('focus', syncUser);
    window.addEventListener(USER_AUTH_CHANGED_EVENT, syncUser);
    return () => {
      window.removeEventListener('storage', syncUser);
      window.removeEventListener('focus', syncUser);
      window.removeEventListener(USER_AUTH_CHANGED_EVENT, syncUser);
    };
  }, []);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleLogout = () => {
    clearUserAuth();
    setUser(null);
    setIsOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-logo">
          <Link to="/" aria-label="AAU Nightlife Home">
            <span className="logo-text">AAU Nightlife</span>
          </Link>
        </div>
        <div className={`navbar-menu ${isOpen ? 'active' : ''}`}>
          <ul>
            <li><Link to="/" onClick={() => setIsOpen(false)}>Home</Link></li>
            <li><Link to="/events" onClick={() => setIsOpen(false)}>Events</Link></li>
            <li><Link to="/jobs" onClick={() => setIsOpen(false)}>Jobs</Link></li>
            <li><Link to="/blog" onClick={() => setIsOpen(false)}>Blog</Link></li>
            <li><Link to="/awards" onClick={() => setIsOpen(false)}>🏆 Awards</Link></li>
            {user ? (
              <>
                <li><Link to="/profile" onClick={() => setIsOpen(false)}>My Tickets</Link></li>
                <li><button type="button" className="nav-action-btn" onClick={handleLogout}>Log Out</button></li>
              </>
            ) : (
              <>
                <li><Link to="/login" onClick={() => setIsOpen(false)}>Sign In</Link></li>
                <li><Link to="/register" onClick={() => setIsOpen(false)}>Sign Up</Link></li>
              </>
            )}
          </ul>
        </div>
        <div className={`navbar-toggle ${isOpen ? 'active' : ''}`} onClick={toggleMenu} aria-label="Toggle menu">
          <span className="bar"></span>
          <span className="bar"></span>
          <span className="bar"></span>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;