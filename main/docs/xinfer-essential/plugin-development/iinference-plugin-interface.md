# IInferencePlugin Interface

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


Implementing the C++20 ABI contract for custom pre/post-processors.

## Contract

Subclass IInferencePlugin, implement name(), version(), and process(). ABI version is checked at load.

## Statelessness

process() must be re-entrant; keep per-call state on the stack or in the tensor.

```cpp
class MyDecoder final : public xinfer::IInferencePlugin {
 public:
  std::string_view name() const noexcept override { return "my_decoder"; }
  uint32_t abi_version() const noexcept override { return XINFER_PLUGIN_ABI; }
  xinfer::Status process(xinfer::Tensor &t) override;
};
```

---

*Part of the xinfer-essential documentation set. See mkdocs.yml for navigation.*
