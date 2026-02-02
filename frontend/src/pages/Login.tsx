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
        throw new Error(errorData.detail || 'Invalid credentials');
      }

      const responseData = await response.json();
      console.log('Login response:', responseData);
      localStorage.setItem('token', responseData.access_token);
      localStorage.setItem('email', responseData.email);
      if (responseData.user_id) {
        localStorage.setItem('userId', responseData.user_id.toString());
      }

      setSuccessMessage('Login successful! Redirecting to dashboard...');
      
      // Redirection après 1 seconde
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred';
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
            <p className="sidebar-subtitle">Learn ecology differently</p>
            <div className="eco-icon">🌱</div>
            <p className="sidebar-description">
              Log in and continue your ecological learning with AI.
            </p>
          </div>
        </div>

        {/* Formulaire de connexion */}
        <div className="login-form-section">
          <div className="form-wrapper">
            <h1 className="form-title">Log In</h1>
            <p className="form-subtitle">
              Not registered yet? <a href="/signup" className="signup-link">Create an account</a>
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
          </div>
        </div>
      </div>
    </div>
  );
}
