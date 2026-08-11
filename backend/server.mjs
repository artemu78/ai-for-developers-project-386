import { createServer } from 'node:http'
import { handler } from './app.mjs'

const port = Number(process.env.PORT ?? 3000)
const host = process.env.HOST ?? '127.0.0.1'

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? `${host}:${port}`}`)
  const chunks = []
  for await (const chunk of request) chunks.push(chunk)

  const result = await handler({
    rawPath: url.pathname,
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
