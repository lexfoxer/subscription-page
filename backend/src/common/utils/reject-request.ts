import { Response } from 'express';

/**
 * How the page refuses a request it does not want to serve.
 *
 * Upstream Remnawave always drops the TCP connection without a response, so that the
 * subscription domain looks dead to scanners. Behind a reverse proxy that turns into
 * 502s: nginx counts every dropped connection as an upstream failure and, with the default
 * `max_fails=1 fail_timeout=10s`, stops sending *any* traffic to the backend for 10 seconds.
 * Mobile browsers trigger it on every visit (favicon.ico, apple-touch-icon*.png hit the
 * `/<shortUuid>` route and are unknown subscriptions).
 *
 * Default: answer with a plain HTTP status. STEALTH_MODE=true restores the upstream drop.
 */
export function rejectRequest(
    res: Response,
    stealthMode: boolean,
    status: number,
    message: string,
): void {
    if (stealthMode || res.headersSent) {
        res.socket?.destroy();
        return;
    }

    res.status(status).set('Cache-Control', 'no-store').type('text/plain').send(message);
}
