// cv-access cookie hantering har tagits bort
// Middleware använder nu profiles.access_granted_at för access control
// Denna fil behålls för kompatibilitet men funktionerna är inaktiva

export async function ensureAccessCookie() {
  // Inaktiv - middleware hanterar access via databas
  return;
}

export async function setAccessCookieAction() {
  // Inaktiv - middleware hanterar access via databas
  return;
}
