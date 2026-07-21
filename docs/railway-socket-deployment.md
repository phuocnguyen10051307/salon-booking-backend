# Railway Socket.IO deployment

## Service settings

- Generate a public HTTPS domain for the backend service.
- Use `npm start` as the start command.
- Set `BUILD_MODE=production`.
- Do not define a fixed `PORT`; Railway injects `PORT` at runtime.
- `HOST` may be omitted because the server defaults to `0.0.0.0`.
- Configure the healthcheck path as `/health`.

The Flutter release build must use the same public origin for REST and
Socket.IO. REST adds `/v1`; the socket origin must not contain a path:

```text
API_BASE_URL=https://RAILWAY_DOMAIN/v1
SOCKET_BASE_URL=https://RAILWAY_DOMAIN
```

## Public handshake test

```sh
curl -i "https://RAILWAY_DOMAIN/socket.io/?EIO=4&transport=polling"
```

- A body beginning with `0{...}` means the Engine.IO handshake is reachable.
- `404 Not Found` means the domain, service, process entrypoint, or socket path
  is wrong.
- `400 Bad Request` means the Engine.IO parameters or requested transport are
  invalid.
- `401` or `403` means a proxy, CORS rule, or authentication layer blocked the
  handshake.
- `502` or "application failed to respond" means the process crashed, did not
  listen on Railway's `PORT`, bound to the wrong interface, or is unhealthy.
- "Unsupported protocol version" means the `EIO` protocol version is not
  compatible with the deployed server.

After the polling probe succeeds, test a real authenticated connection from an
Android release APK and correlate its `[ChatSocket]` timestamp with Railway's
`[Socket.IO]` logs.
