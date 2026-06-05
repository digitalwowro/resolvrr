# Cache Clearing

Use the project-local cache script instead of hand-removing framework caches.

```bash
npm run cache:clear
```

Optional variables:

- `APP_ROOT`: app root; defaults to the current working directory.
- `NEXT_DEV_SERVICE`: user-level systemd service to stop/restart around cache
  clearing; defaults to `resolvrr-dev.service`. Set to `none` to skip service
  handling.
- `APP_DEV_URL`: local dev URL to print after cache clearing, for example
  `http://0.0.0.0:3005`.
