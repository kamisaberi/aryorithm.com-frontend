# Troubleshooting Real-Time SSE Stream Disconnects (Port 9444)

The Server-Sent Events (SSE) telemetry pipeline pushes updates at up to $100\text{ Hz}$ to the Web Command Center. If intermediary reverse proxies (such as Nginx, HAProxy, or Envoy) or browser timeouts interrupt the stream, the UI topology will freeze.

---

## 1. Symptom & Visual Indicator

On the Web Command Center (port 9443):
* The top status card turns amber: `SSE CONNECTION DROPPED (RECONNECTING...)`.
* Node topology graphs freeze and fail to render live packet pulses.

---

## 2. Resolving Proxy Buffering Delays

If `sentinel-nexus` is fronted by an enterprise reverse proxy, the proxy may attempt to buffer the event stream rather than flushing chunks immediately.

### Nginx Configuration Fix:
Add these proxy parameters to `/etc/nginx/conf.d/nexus.conf`:

```nginx
location /stream {
    proxy_pass http://127.0.0.1:9444/stream;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    
    # Disable proxy response buffering for real-time streaming
    proxy_buffering off;
    proxy_cache off;
    chunked_transfer_encoding off;
    
    # Extend read timeout to prevent idle disconnects
    proxy_read_timeout 86400s;
    proxy_send_timeout 86400s;
}
```

Reload Nginx:

```bash
sudo nginx -s reload
```

---

## 3. Keepalive Heartbeat Verification

`sentinel-nexus` emits an empty comment frame (`: keepalive\n\n`) every $15.0\text{ seconds}$ to prevent firewall state tables from closing idle TCP connections. 

Verify the raw stream output from the command line:

```bash
curl -N -v http://localhost:9444/stream
```

