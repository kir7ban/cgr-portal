import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import { CurrentUser } from '../hooks/useAuth';

interface ProtectedRouteProps {
  requiredRole?: CurrentUser['role'];
  element: React.ReactElement;
}

export function ProtectedRoute({ requiredRole, element }: ProtectedRouteProps) {
  const { currentUser } = useAuthContext();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && currentUser.role !== requiredRole) {
    return <Navigate to="/feed" replace />;
  }

  return element;
}

export function AdminOnly({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuthContext();
  if (!currentUser || currentUser.role !== 'ADMIN') {
    return null;
  }
  return <>{children}</>;
}

export function CommsOfficerOnly({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuthContext();
  if (!currentUser || (currentUser.role !== 'COMMS_OFFICER' && currentUser.role !== 'ADMIN')) {
    return null;
  }
  return <>{children}</>;
}
