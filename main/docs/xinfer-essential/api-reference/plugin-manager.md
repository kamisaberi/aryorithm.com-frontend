# Class `xinfer::PluginManager`

Defined in header `<xinfer/plugin_manager.hpp>`  
Namespace: `xinfer`

`PluginManager` manages dynamic hardware backend plugins, handles runtime `dlopen` loading with symbol encapsulation, and verifies ABI contracts.

---

## 1. Class Synopsis

```cpp
namespace xinfer {

class XINFER_API PluginManager {
public:
    static PluginManager& instance() noexcept;

    void set_search_path(const std::filesystem::path& path);
    void register_plugin_directory(const std::filesystem::path& dir);

    [[nodiscard]] std::shared_ptr<IInferencePlugin> load_plugin(BackendType backend);
    [[nodiscard]] std::shared_ptr<IInferencePlugin> load_plugin_from_file(
        const std::filesystem::path& shared_lib_path
    );

    [[nodiscard]] std::vector<BackendType> get_available_backends() const;
    [[nodiscard]] bool is_backend_available(BackendType backend) const noexcept;
    
    void unload_all() noexcept;

private:
    PluginManager();
    ~PluginManager();
    class Impl;
    std::unique_ptr<Impl> pimpl_;
};

} // namespace xinfer
```

---

## 2. Architectural Usage

`PluginManager` is implemented as a thread-safe singleton. When `InferenceEngine::initialize()` executes, it queries `PluginManager::instance().load_plugin(config.backend)` to bind hardware drivers.

