// JWT token storage key
export const AUTH_TOKEN_KEY = 'pos_auth_token';

// Roles enum - add more roles here in future
export const ROLES = {
  OWNER: 'OWNER'
  // Add more roles here when needed:
  // MANAGER: 'MANAGER',
  // CASHIER: 'CASHIER'
};

export function setAuthToken(token) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function clearAuthToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

// Get user role from JWT token
export function getUserRole() {
  const token = getAuthToken();
  if (!token) return null;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.role;
  } catch (e) {
    return null;
  }
}

// Check if user is owner
export function isOwner() {
  return getUserRole() === ROLES.OWNER;
}

// Check if user is authenticated and is owner
export function isAuthenticated() {
  const token = getAuthToken();
  if (!token) return false;
  
  try {
    // Verify token hasn't expired
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiryTimestamp = payload.exp * 1000; // Convert to milliseconds
    
    if (Date.now() >= expiryTimestamp) {
      clearAuthToken();
      return false;
    }
    
    // For now, only owners are allowed
    return payload.role === ROLES.OWNER;
  } catch (e) {
    return false;
  }
}