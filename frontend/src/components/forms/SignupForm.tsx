import { useState } from 'react';
import '../../styles/signup.css';

interface SignupFormProps {
  onSubmit: (data: SignupData) => Promise<void>;
  loading?: boolean;
}

interface SignupData {
  email: string;
  password: string;
}

export default function SignupForm({ onSubmit, loading = false }: SignupFormProps) {
  const [formData, setFormData] = useState<SignupData>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Partial<SignupData>>({});
  const [showPassword, setShowPassword] = useState(false);

  const validateForm = () => {
    const newErrors: Partial<SignupData> = {};

    if (!formData.email.trim()) {
      newErrors.email = 'L\'email est requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Veuillez entrer un email valide';
    }

    if (!formData.password) {
      newErrors.password = 'Le mot de passe est requis';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Le mot de passe doit contenir au moins 8 caractères';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field
    if (errors[name as keyof SignupData]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Signup error:', error);
    }
  };

  return (
    <form className="signup-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="email" className="form-label">
          Adresse Email
        </label>
        <input
          type="email"
          id="email"
          name="email"
          className={`form-input ${errors.email ? 'input-error' : ''}`}
          value={formData.email}
          onChange={handleChange}
          placeholder="votre.email@exemple.com"
          disabled={loading}
        />
        {errors.email && <span className="error-message">{errors.email}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="password" className="form-label">
          Mot de Passe
        </label>
        <div className="password-input-wrapper">
          <input
            type={showPassword ? 'text' : 'password'}
            id="password"
            name="password"
            className={`form-input ${errors.password ? 'input-error' : ''}`}
            value={formData.password}
            onChange={handleChange}
            placeholder="••••••••"
            disabled={loading}
          />
          <button
            type="button"
            className="toggle-password"
            onClick={() => setShowPassword(!showPassword)}
            disabled={loading}
          >
            {showPassword ? '👁️' : '👁️‍🗨️'}
          </button>
        </div>
        {errors.password && <span className="error-message">{errors.password}</span>}
      </div>

      <button
        type="submit"
        className="submit-button"
        disabled={loading}
      >
        {loading ? 'Inscription en cours...' : 'S\'inscrire'}
      </button>
    </form>
  );
}
