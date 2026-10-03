# Hello World

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


Five-minute first inference run: minimal C++20 example.

## Run it

Point the engine at the bundled test model, bind one 32-float vector, print the threat score. Expected output below.

## Next steps

Continue with verifying-installation, then the NetFlow tutorial.

```cpp
#include <xinfer/xinfer.hpp>
int main() {
  auto engine = xinfer::InferenceEngine::create(
      xinfer::BackendType::CPU_FALLBACK);
  engine->load_model("models/smoke_test.onnx", {});
  xinfer::Tensor in({1, 32}, xinfer::DataType::FLOAT32);
  std::cout << engine->infer(in).data<float>()[0] << "\n";
}
```

---

*Part of the xinfer-essential documentation set. See mkdocs.yml for navigation.*
