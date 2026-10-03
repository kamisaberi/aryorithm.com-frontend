# xinfer::PluginManager

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


Discovery, ABI validation, loading, and teardown of .so plugins.

## load_plugin()

Validates ABI, instantiates the interface handle, arms execution.

## Isolation

RTLD_LOCAL namespaces keep third-party symbols out of the global table.

```cpp
auto &pm = xinfer::PluginManager::instance();
pm.load_plugin("/usr/local/lib/xinfer/plugins/libyolo_nms.so");
```

---

*Part of the xinfer-essential documentation set. See mkdocs.yml for navigation.*
