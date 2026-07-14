import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { AuthProvider } from '../context/AuthContext';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('ProtectedRoute - RBAC', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should render protected route for authorized role', () => {
    const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6IkFETUluIn0.sig';
    localStorage.setItem('auth_token', mockToken);

    const TestComponent = () => <div>Admin Content</div>;

    render(
      <BrowserRouter>
        <AuthProvider>
          <ProtectedRoute requiredRole="ADMIN" element={<TestComponent />} />
        </AuthProvider>
      </BrowserRouter>
    );

    expect(screen.getByText('Admin Content')).toBeInTheDocument();
  });

  it('should redirect to /feed for unauthorized role', () => {
    const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJ1c2VybmFtZSI6ImVtcGxveWVlIiwicm9sZSI6IkVNUExPWUVFIn0.sig';
    localStorage.setItem('auth_token', mockToken);

    const TestComponent = () => <div>Admin Content</div>;

    render(
      <BrowserRouter>
        <AuthProvider>
          <ProtectedRoute requiredRole="ADMIN" element={<TestComponent />} />
        </AuthProvider>
      </BrowserRouter>
    );

    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });
});
