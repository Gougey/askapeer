// Server-side base URL for the API. Never exposed to the client — the web app is a
// thin BFF: server actions and route handlers call the API and manage the session.
export const API_ORIGIN = process.env.API_ORIGIN ?? 'http://localhost:4000';
