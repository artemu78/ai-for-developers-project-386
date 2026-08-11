import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { handler } from './app.mjs'

const port = Number(process.env.PORT ?? 3000)
const host = process.env.HOST ?? '127.0.0.1'
const publicDirectory = resolve(fileURLToPath(new URL('../dist', import.meta.url)))
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
}

async function serveFrontend(pathname, response) {
  const requestedPath = pathname === '/' ? '/index.html' : pathname
  const filePath = resolve(publicDirectory, `.${requestedPath}`)

  if (!filePath.startsWith(`${publicDirectory}/`)) {
    response.writeHead(400)
    response.end('Bad request')
    return
  }

  try {
    const body = await readFile(filePath)
    response.writeHead(200, { 'content-type': contentTypes[extname(filePath)] ?? 'application/octet-stream' })
    response.end(body)
  } catch {
    const body = await readFile(resolve(publicDirectory, 'index.html'))
    response.writeHead(200, { 'content-type': contentTypes['.html'] })
    response.end(body)
  }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? `${host}:${port}`}`)
  if (!url.pathname.startsWith('/api')) {
    await serveFrontend(url.pathname, response)
    return
  }

  const chunks = []
  for await (const chunk of request) chunks.push(chunk)

  const result = await handler({
    rawPath: url.pathname.replace(/^\/api/, '') || '/',
    requestContext: { http: { method: request.method } },
    queryStringParameters: Object.fromEntries(url.searchParams),
    body: chunks.length > 0 ? Buffer.concat(chunks).toString('utf8') : undefined,
  })

  response.writeHead(result.statusCode, result.headers)
  response.end(result.body)
})

server.listen(port, host, () => {
  console.log(`Call calendar API is listening on http://${host}:${port}`)
})

function shutdown() {
  server.close(() => process.exit(0))
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
