const SESSION_KEY = 'admin_session'

/**
 * Reads the session from sessionStorage.
 * @returns {object|null} Parsed session object or null if not found/invalid.
 */
export function getSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/**
 * Stores session data as JSON in sessionStorage.
 * @param {object} data - Session data to persist.
 */
export function setSession(data) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(data))
}

/**
 * Removes the session from sessionStorage and redirects to /admin.html.
 */
export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY)
  window.location.href = '/admin.html'
}

/**
 * Returns true if the given session object has role === "admin".
 * @param {any} session
 * @returns {boolean}
 */
export function isAdmin(session) {
  return session !== null &&
    session !== undefined &&
    typeof session === 'object' &&
    session.role === 'admin'
}

/**
 * Redirects to login if there is an active session with invalid role.
 * Does nothing if there is no session (login form handles that case).
 */
export function guardAdmin() {
  const session = getSession()
  // Only redirect if there IS a session but it's not a valid admin session
  // (e.g. tampered token, wrong role). No session = show login form normally.
  if (session !== null && !isAdmin(session)) {
    clearSession()
  }
}
