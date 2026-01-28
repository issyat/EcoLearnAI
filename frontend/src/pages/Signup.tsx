import { useState } from 'react';
import SignupForm from '../components/forms/SignupForm';
import '../styles/signup.css';

interface SignupData {
  email: string;
  password: string;
}

export default function Signup() {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSignup = async (data: SignupData) => {
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // Appel API au backend
      const response = await fetch('/api/v1/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Une erreur est survenue');
      }

       const responseData = await response.json();
      localStorage.setItem('token', responseData.token);
      localStorage.setItem('email', responseData.email);

      setSuccessMessage('Inscription réussie! Redirection vers le dashboard...');
      
      // Redirection après 2 secondes
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Une erreur est survenue';
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-page">
      <div className="signup-container">
        {/* Sidebar gauche avec illustration */}
        <div className="signup-sidebar">
          <div className="sidebar-content">
            <h2 className="sidebar-title">EcoLearnAI</h2>
            <p className="sidebar-subtitle">Apprendre l'écologie autrement</p>
            <div className="eco-icon">🌱</div>
            <p className="sidebar-description">
              Rejoignez notre communauté et apprenez à agir concrètement pour la planète grâce à l’IA.
            </p>
          </div>
        </div>

        {/* Formulaire d'inscription */}
        <div className="signup-form-section">
          <div className="form-wrapper">
            <h1 className="form-title">Créer un compte</h1>
            <p className="form-subtitle">
              Déjà inscrit? <a href="/login" className="login-link">Se connecter</a>
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

            <SignupForm onSubmit={handleSignup} loading={loading} />

            <div className="divider">
              <span>ou</span>
            </div>

            <p className="terms-text">
              En vous inscrivant, vous acceptez nos{' '}
              <a href="#" className="terms-link">conditions d'utilisation</a> et notre{' '}
              <a href="#" className="terms-link">politique de confidentialité</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}