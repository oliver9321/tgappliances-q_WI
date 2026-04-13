// Thin wrapper used only by admin.html login page
import { setSession } from './auth.js'
const API_URL = import.meta.env.VITE_API_URL;
export { getSession, isAdmin } from './auth.js'

export async function login(username, password) {

  const res = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  console.log(res);

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || `Error ${res.status}`)
  }

  const data = await res.json()
  setSession(data)
  return data;

}
