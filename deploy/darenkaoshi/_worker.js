const ROUTE_HOSTS = new Set(['cyberdoctor.me', 'www.cyberdoctor.me'])

function withProductionHeaders(response, pathname) {
  const headers = new Headers(response.headers)
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  headers.set('Permissions-Policy', 'browsing-topics=()')
  headers.set('X-Robots-Tag', 'noai, noimageai')

  if (pathname.startsWith('/assets/recreated/') || pathname.startsWith('/assets/audio/')) {
    headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  } else if (pathname.startsWith('/data/')) {
    headers.set('Cache-Control', 'public, max-age=0, must-revalidate')
  } else if (pathname === '/' || pathname === '/index.html' || pathname === '/doctor/' || pathname === '/darenkaoshi' || pathname === '/darenkaoshi/' || pathname === '/doctor/index.html') {
    headers.set('Cache-Control', 'public, max-age=0, must-revalidate')
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const isRouteHost = ROUTE_HOSTS.has(url.hostname)
    const isEntryPath = url.pathname === '/' || url.pathname === '/index.html'
    const isExamPath = url.pathname === '/darenkaoshi' || url.pathname === '/darenkaoshi/'

    if (isRouteHost && isEntryPath && (request.method === 'GET' || request.method === 'HEAD')) {
      const routeUrl = new URL('/doctor/', url)
      const response = await env.ASSETS.fetch(new Request(routeUrl, request))
      return withProductionHeaders(response, url.pathname)
    }

    if (isRouteHost && isExamPath && (request.method === 'GET' || request.method === 'HEAD')) {
      const examUrl = new URL('/', url)
      const response = await env.ASSETS.fetch(new Request(examUrl, request))
      return withProductionHeaders(response, url.pathname)
    }

    const response = await env.ASSETS.fetch(request)
    return withProductionHeaders(response, url.pathname)
  },
}
