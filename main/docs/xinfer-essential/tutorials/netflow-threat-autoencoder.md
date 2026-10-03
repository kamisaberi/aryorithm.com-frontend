# NetFlow Threat Autoencoder

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


1D tabular vector scoring in under 12 microseconds, end to end.

## Pipeline

Ring event → 32-dim assembly → int8 autoencoder → reconstruction error → threshold verdict.

## Verdict

Errors above the calibrated radius drop via the kernel map; the rest pass.

```cpp
// Score one flow, print the verdict.
xinfer::Tensor in({1, 32}, xinfer::DataType::FLOAT32, vec);
float err = engine->infer(in).data<float>()[0];
bool drop = err > 0.85f;  // calibrated radius
```

---

*Part of the xinfer-essential documentation set. See mkdocs.yml for navigation.*
