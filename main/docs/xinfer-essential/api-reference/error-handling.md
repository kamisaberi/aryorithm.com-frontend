# Error Handling

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


xinfer::InferenceException and error return codes.

## Two channels

Fatal misuse throws InferenceException; recoverable backend states return Status codes.

## No exceptions on hot path

infer() is noexcept; failures surface as Status, never unwinds.

```cpp
try {
  engine->load_model(path, cfg);   // throws on misuse
} catch (const xinfer::InferenceException &e) {
  log(e.code(), e.what());
}
auto st = engine->infer(t);       // noexcept Status
if (!st.ok()) fallback(st);
```

---

*Part of the xinfer-essential documentation set. See mkdocs.yml for navigation.*
