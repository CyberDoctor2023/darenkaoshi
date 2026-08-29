const ROUTE_HOSTS = new Set(['cyberdoctor.me', 'www.cyberdoctor.me'])

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const isRouteHost = ROUTE_HOSTS.has(url.hostname)
    const isEntryPath = url.pathname === '/' || url.pathname === '/index.html'
    const isExamPath = url.pathname === '/darenkaoshi' || url.pathname === '/darenkaoshi/'

    if (isRouteHost && isEntryPath && (request.method === 'GET' || request.method === 'HEAD')) {
      const routeUrl = new URL('/doctor/index.html', url)
      return env.ASSETS.fetch(new Request(routeUrl, request))
    }

    if (isRouteHost && isExamPath && (request.method === 'GET' || request.method === 'HEAD')) {
      const examUrl = new URL('/index.html', url)
      return env.ASSETS.fetch(new Request(examUrl, request))
    }

    return env.ASSETS.fetch(request)
  },
}
