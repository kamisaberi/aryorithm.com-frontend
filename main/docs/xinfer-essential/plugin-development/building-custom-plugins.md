# Building Custom Plugins

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


Writing, compiling, and testing a custom pre/post-processor.

## Scaffold

Copy plugins/template/, implement process(), add a litmus test vector.

## Build & install

Compile with -fvisibility=hidden -shared, drop the .so into the plugin directory.

```bash
$ cp -r plugins/template plugins/my_decoder
$ cmake --build build --target my_decoder
$ sudo cp build/my_decoder.so /usr/local/lib/xinfer/plugins/
$ xinfer-selftest --plugin my_decoder
```

---

*Part of the xinfer-essential documentation set. See mkdocs.yml for navigation.*
