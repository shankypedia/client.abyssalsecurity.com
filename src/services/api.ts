const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface User {
  id: number;
  email: string;
  username: string;
  createdAt?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: User;
  errors?: any[];
}

class ApiService {
  private csrfToken: string | null = null;

  async initializeCSRF(): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL.replace('/api', '')}/api/csrf-token`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        this.csrfToken = data.csrfToken;
      }
    } catch (error) {
      console.error('Failed to initialize CSRF token:', error);
    }
  }

  private getAuthHeaders(): HeadersInit {
    const token = this.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(this.csrfToken && { 'X-CSRF-Token': this.csrfToken }),
    };
  }

  private getToken(): string | null {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  }

  private setToken(token: string, remember: boolean = true): void {
    if (remember) {
      localStorage.setItem('authToken', token);
      sessionStorage.removeItem('authToken'); // Clean up session storage
    } else {
      sessionStorage.setItem('authToken', token);
      localStorage.removeItem('authToken'); // Clean up local storage
    }
  }

  private setUser(user: User, remember: boolean = true): void {
    const storage = remember ? localStorage : sessionStorage;
    const otherStorage = remember ? sessionStorage : localStorage;
    
    storage.setItem('user', JSON.stringify(user));
    otherStorage.removeItem('user'); // Clean up other storage
  }

  private async handleResponse(response: Response) {
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'An error occurred');
    }
    return data;
  }

  async register(email: string, username: string, password: string, firstName: string, lastName: string, remember: boolean = true): Promise<AuthResponse> {
    // Ensure CSRF token is available
    if (!this.csrfToken) {
      await this.initializeCSRF();
    }

    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ email, username, password, firstName, lastName }),
    });
    
    const data = await this.handleResponse(response);
    
    if (data.success && data.data?.tokens?.accessToken) {
      this.setToken(data.data.tokens.accessToken, remember);
      this.setUser(data.data.user, remember);
    }
    
    return data;
  }

  async login(email: string, password: string, remember: boolean = true): Promise<AuthResponse> {
    // Ensure CSRF token is available
    if (!this.csrfToken) {
      await this.initializeCSRF();
    }

    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ login: email, password }),
    });
    
    const data = await this.handleResponse(response);
    
    if (data.success && data.data?.tokens?.accessToken) {
      this.setToken(data.data.tokens.accessToken, remember);
      this.setUser(data.data.user, remember);
    }
    
    return data;
  }

  async getUserProfile(): Promise<{ success: boolean; user?: User; message?: string }> {
    const response = await fetch(`${API_BASE_URL}/user/profile`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    
    return this.handleResponse(response);
  }

  async verifyToken(): Promise<{ success: boolean; user?: User; message?: string }> {
    const response = await fetch(`${API_BASE_URL}/user/verify`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    
    return this.handleResponse(response);
  }

  logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('user');
  }

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}

export const apiService = new ApiService();