# xinfer::InferenceEngine

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


Engine lifecycle: create, load_model, infer, and hot-swap.

## Creation

Factory selects the backend; misconfigured silicon returns a descriptive error, never a crash.

## Hot-swap

load_model on a live engine stages the graph and swaps atomically between inferences.

```cpp
auto engine = xinfer::InferenceEngine::create(
    xinfer::BackendType::INTEL_OPENVINO);
engine->load_model("model.onnx", {.device_target = "NPU"});
auto out = engine->infer(input);
```

---

*Part of the xinfer-essential documentation set. See mkdocs.yml for navigation.*
