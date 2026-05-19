# Dev Service Operations

The development target is a user-level systemd service named
`resolvrr-dev.service`.

## Service File

Use `docs/deploy/systemd/resolvrr-dev.service.example` as the service template.
The expected unit path is:

`~/.config/systemd/user/resolvrr-dev.service`

## Commands

- Reload user units: `systemctl --user daemon-reload`
- Enable service: `systemctl --user enable resolvrr-dev.service`
- Start service: `systemctl --user start resolvrr-dev.service`
- Restart service: `systemctl --user restart resolvrr-dev.service`
- View logs: `journalctl --user -u resolvrr-dev.service -f`

If the service must survive logout or reboot, user lingering must be enabled by
the server administrator.
