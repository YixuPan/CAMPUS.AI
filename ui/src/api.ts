const API_BASE_URL = 'http://localhost:8000';

// Helper function for making authenticated API requests
export const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('access_token');
  
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  
  // Handle token expiration
  if (response.status === 401) {
    localStorage.removeItem('access_token');
    localStorage.removeItem('rememberUser');
    window.location.href = '/login';
    throw new Error('Authentication failed');
  }
  
  return response;
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('access_token');
};

// Get user info from token
export const getUserInfo = async () => {
  try {
    const response = await apiRequest('/auth/isStudent');
    if (response.ok) {
      const studentCheck = await response.json();
      const staffResponse = await apiRequest('/auth/isStaff');
      const staffCheck = await staffResponse.json();
      
      return {
        isStudent: studentCheck.is_student,
        isStaff: staffCheck.is_staff,
      };
    }
    return null;
  } catch (error) {
    console.error('Failed to get user info:', error);
    return null;
  }
};

// Logout function
export const logout = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('rememberUser');
  window.location.href = '/login';
}; 