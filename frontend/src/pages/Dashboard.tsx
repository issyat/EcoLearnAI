import '../styles/dashboard.css';

export default function Dashboard() {
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    window.location.href = '/login';
  };

  return (
    <div className="dashboard-container">
      <nav className="dashboard-navbar">
        <div className="navbar-brand">
          <div className="eco-icon">🌱</div>
          <h1>EcoLearnAI</h1>
        </div>
        <button onClick={handleLogout} className="logout-btn">
          Déconnexion
        </button>
      </nav>
      <div className="dashboard-content">
        {/* Content goes here */}
      </div>
    </div>
  );
}
