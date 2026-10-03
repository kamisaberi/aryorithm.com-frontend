# xinfer::ModelHub

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


Singleton resolver bridging local cache and signed HTTPS remotes.

## resolve()

Returns a verified local path, fetching and caching on miss.

## Pinning

Production generations pin by hash; unpinned resolves track channels.

```cpp
auto path = xinfer::ModelHub::instance().resolve(
    "models/v1.onnx", "https://hub.example.com/models/v1", expected_sha);
```

---

*Part of the xinfer-essential documentation set. See mkdocs.yml for navigation.*
