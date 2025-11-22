export function saveUserSession(username) {
  try {
    const sessionData = {
      username: username,
      timestamp: Date.now()
    };
    localStorage.setItem('user_session', JSON.stringify(sessionData));
  } catch (err) {
    console.error('Failed to save user session:', err);
  }
}

export function getUserSession() {
  try {
    const sessionData = localStorage.getItem('user_session');
    if (!sessionData) return null;
    
    const data = JSON.parse(sessionData);
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    
    if (Date.now() - data.timestamp > oneWeek) {
      localStorage.removeItem('user_session');
      return null;
    }
    
    return data.username;
  } catch (err) {
    console.error('Failed to get user session:', err);
    return null;
  }
}

export function clearUserSession() {
  try {
    localStorage.removeItem('user_session');
  } catch (err) {
    console.error('Failed to clear user session:', err);
  }
}

