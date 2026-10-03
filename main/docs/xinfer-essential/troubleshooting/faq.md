# Technical FAQ

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


Short answers to recurring integration questions.

## Which backend do I pick?

Whichever silicon is soldered down. The graph is identical; only the transport differs.

## Python bindings?

Deliberately absent. The hot path has no interpreter by design; drive it from C++ or the CLI.

## Windows/macOS?

Linux primary; macOS covers CoreML dev loops. Windows is unsupported.

---

*Part of the xinfer-essential documentation set. See mkdocs.yml for navigation.*
