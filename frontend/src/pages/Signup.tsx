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
      const response = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'An error occurred');
      }

      const responseData = await response.json();
      // Store user data
      localStorage.setItem('userId', responseData.id);
      localStorage.setItem('userEmail', responseData.email);

      setSuccessMessage('Registration successful! Redirecting to dashboard...');
      
      // Redirection après 2 secondes
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred';
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
            <p className="sidebar-subtitle">Learn ecology differently</p>
            <div className="eco-icon">🌱</div>
            <p className="sidebar-description">
              Join our community and learn to take concrete action for the planet thanks to AI.
            </p>
          </div>
        </div>

        {/* Formulaire d'inscription */}
        <div className="signup-form-section">
          <div className="form-wrapper">
            <h1 className="form-title">Create an account</h1>
            <p className="form-subtitle">
              Already registered? <a href="/login" className="login-link">Log In</a>
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
          </div>
        </div>
      </div>
    </div>
  );
}