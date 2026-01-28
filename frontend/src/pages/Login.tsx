import { useState } from 'react';
import LoginForm from '../components/forms/LoginForm';
import '../styles/login.css';

interface LoginData {
  email: string;
  password: string;
}

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleLogin = async (data: LoginData) => {
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // Appel API au backend
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Identifiants invalides');
      }

      const responseData = await response.json();
      localStorage.setItem('token', responseData.token);
      localStorage.setItem('email', responseData.email);

      setSuccessMessage('Connexion réussie! Redirection vers le dashboard...');
      
      // Redirection après 1 seconde
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Une erreur est survenue';
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        {/* Sidebar gauche avec illustration */}
        <div className="login-sidebar">
          <div className="sidebar-content">
            <h2 className="sidebar-title">EcoLearnAI</h2>
            <p className="sidebar-subtitle">Apprendre l'écologie autrement</p>
            <div className="eco-icon">🌱</div>
            <p className="sidebar-description">
              Connectez-vous et continuez votre apprentissage écologique avec l'IA.
            </p>
          </div>
        </div>

        {/* Formulaire de connexion */}
        <div className="login-form-section">
          <div className="form-wrapper">
            <h1 className="form-title">Se connecter</h1>
            <p className="form-subtitle">
              Pas encore inscrit? <a href="/signup" className="signup-link">Créer un compte</a>
            </p>

            {errorMessage && (
              <div className="alert alert-error">
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div className="alert alert-success">
                {successMessage}
              </div>
            )}

            <LoginForm onSubmit={handleLogin} loading={loading} />

            <div className="divider">
              <span>ou</span>
            </div>

            <p className="security-text">
              🔒 Nous ne partageons jamais votre mot de passe. Vos données sont sécurisées.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
