import jwtDecode from 'jwt-decode';

export const saveToken = (token) => {
  localStorage.setItem('token', token);
};

export const getToken = () => localStorage.getItem('token');

export const removeToken = () => {
  localStorage.removeItem('token');
};

export const getCurrentUserId = () => {
  const token = getToken();
  if (!token) return null;
  try {
    const decoded = jwtDecode(token);
    return decoded.id;
  } catch {
    return null;
  }
};
