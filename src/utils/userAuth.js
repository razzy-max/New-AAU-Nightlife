export const USER_TOKEN_KEY = 'userToken';
export const USER_DATA_KEY = 'userData';

export const getUserToken = () => localStorage.getItem(USER_TOKEN_KEY);

export const getUserData = () => {
  const raw = localStorage.getItem(USER_DATA_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const setUserAuth = (payload) => {
  localStorage.setItem(USER_TOKEN_KEY, payload.token);
  localStorage.setItem(USER_DATA_KEY, JSON.stringify(payload));
};

export const clearUserAuth = () => {
  localStorage.removeItem(USER_TOKEN_KEY);
  localStorage.removeItem(USER_DATA_KEY);
};
