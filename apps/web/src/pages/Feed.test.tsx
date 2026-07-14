import { render, screen, waitFor } from '@testing-library/react';
import { Feed } from './Feed';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * TEST SUITE: Issue #3 - Feed Page - List & Pagination
 */

describe('Feed Page - Issue #3', () => {
  beforeEach(() => {
    localStorage.clear();
    const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJ1c2VybmFtZSI6ImFsaWNlIiwicm9sZSI6IkVNUExPWUVFIn0.sig';
    localStorage.setItem('auth_token', mockToken);
  });

  it('should render feed with published posts', async () => {
    const mockPosts = {
      items: [
        {
          id: '1',
          text: 'First post',
          createdAt: '2026-07-14T10:00:00Z',
          createdBy: 'alice',
          state: 'PUBLISHED',
        },
        {
          id: '2',
          text: 'Second post',
          createdAt: '2026-07-14T09:00:00Z',
          createdBy: 'bob',
          state: 'PUBLISHED',
        },
      ],
      totalCount: 2,
      pageNumber: 1,
      pageSize: 20,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockPosts,
    });

    render(
      <BrowserRouter>
        <AuthProvider>
          <Feed />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('First post')).toBeInTheDocument();
      expect(screen.getByText('Second post')).toBeInTheDocument();
    });
  });

  it('should display pagination controls', async () => {
    const mockPosts = {
      items: Array(20).fill(null).map((_, i) => ({
        id: String(i),
        text: `Post ${i}`,
        createdAt: new Date(Date.now() - i * 60000).toISOString(),
        createdBy: 'alice',
        state: 'PUBLISHED',
      })),
      totalCount: 50,
      pageNumber: 1,
      pageSize: 20,
      totalPages: 3,
      hasNextPage: true,
      hasPreviousPage: false,
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockPosts,
    });

    render(
      <BrowserRouter>
        <AuthProvider>
          <Feed />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
    });
  });

  it('should show loading state while fetching', () => {
    global.fetch = vi.fn(() => new Promise(() => {}));

    render(
      <BrowserRouter>
        <AuthProvider>
          <Feed />
        </AuthProvider>
      </BrowserRouter>
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should display error message on fetch failure', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: { message: 'Server error' } }),
    });

    render(
      <BrowserRouter>
        <AuthProvider>
          <Feed />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/server error/i)).toBeInTheDocument();
    });
  });
});
