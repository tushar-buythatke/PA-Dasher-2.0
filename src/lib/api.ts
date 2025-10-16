type FetcherArgs = string | [string, RequestInit?]

export async function fetcher(args: FetcherArgs) {
  const [path, init] = Array.isArray(args) ? args : [args, undefined]
  const base = import.meta.env.VITE_BACKEND_URL || ""
  const url = `${base}${path}`
  const res = await fetch(url, {
    ...(init || {}),
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Request failed ${res.status}: ${text}`)
  }
  return res.json()
}
