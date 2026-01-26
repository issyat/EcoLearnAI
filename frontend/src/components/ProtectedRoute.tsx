import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  // Vérifier si le token existe dans localStorage
  const token = localStorage.getItem('token');

  // Si pas de token → rediriger vers /login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Si token existe → afficher le composant enfant
  return <>{children}</>;
}
