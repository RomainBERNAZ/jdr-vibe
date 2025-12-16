import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '../../src/context/AuthContext.jsx';

// Test component that uses the context
const TestComponent = () => {
  const { token, user, login, logout } = useAuth();
  return (
    <div>
      <div data-testid="token">{token || 'null'}</div>
      <div data-testid="user">{user ? user.email : 'null'}</div>
      <button
        data-testid="login-btn"
        onClick={() => login('test-token', { id: 1, email: 'test@example.com' })}
      >
        Login
      </button>
      <button data-testid="logout-btn" onClick={logout}>
        Logout
      </button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should provide null token and user initially', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('token')).toHaveTextContent('null');
    expect(screen.getByTestId('user')).toHaveTextContent('null');
  });

  it('should load token and user from localStorage', () => {
    localStorage.setItem('token', 'stored-token');
    localStorage.setItem('user', JSON.stringify({ id: 1, email: 'stored@example.com' }));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('token')).toHaveTextContent('stored-token');
    expect(screen.getByTestId('user')).toHaveTextContent('stored@example.com');
  });

  it('should login and update token and user', async () => {
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const loginBtn = screen.getByTestId('login-btn');
    
    await act(async () => {
      await user.click(loginBtn);
    });

    expect(screen.getByTestId('token')).toHaveTextContent('test-token');
    expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
    expect(localStorage.getItem('token')).toBe('test-token');
    expect(JSON.parse(localStorage.getItem('user'))).toEqual({
      id: 1,
      email: 'test@example.com',
    });
  });

  it('should logout and clear token and user', async () => {
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('user', JSON.stringify({ id: 1, email: 'test@example.com' }));

    const user = userEvent.setup();

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const logoutBtn = screen.getByTestId('logout-btn');
    
    await act(async () => {
      await user.click(logoutBtn);
    });

    expect(screen.getByTestId('token')).toHaveTextContent('null');
    expect(screen.getByTestId('user')).toHaveTextContent('null');
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });
});
