export const API_BASE = 'http://localhost:3001';

export const authFetch = async (url: string, token: string | null, options: RequestInit = {}) => {
  if (!token) throw new Error("No token");
  
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const response = await fetch(url, { ...options, headers });
  if (response.status === 401 || response.status === 403) {
      throw new Error("Unauthorized");
  }
  return response;
};
