# Class `xinfer::Tensor`

Defined in header `<xinfer/tensor.hpp>`  
Namespace: `xinfer`

`Tensor` represents a multi-dimensional array of elements mapped to physical RAM, device memory, or a Linux kernel `DMA-BUF` file descriptor.

---

## 1. Class Synopsis

```cpp
namespace xinfer {

struct TensorDescriptor {
    std::string name{};
    std::vector<int64_t> dimensions{};
    Precision precision{Precision::FP32};
    MemoryType memory_type{MemoryType::HOST_PINNED};
    std::vector<size_t> strides{};
};

class XINFER_API Tensor {
public:
    // Factory Methods
    static std::shared_ptr<Tensor> create_owning(const TensorDescriptor& desc);
    static std::shared_ptr<Tensor> create_from_raw_host(
        const TensorDescriptor& desc, 
        void* ptr, 
        size_t size_bytes
    );
    static std::shared_ptr<Tensor> create_from_dmabuf(
        const TensorDescriptor& desc, 
        int dma_fd, 
        size_t size_bytes
    );
    static std::shared_ptr<Tensor> create_from_physical_address(
        const TensorDescriptor& desc, 
        void* virt_ptr, 
        uint64_t phys_addr, 
        size_t size_bytes
    );

    ~Tensor();

    // Data Accessors
    template <typename T>
    [[nodiscard]] T* data() noexcept;

    template <typename T>
    [[nodiscard]] const T* data() const noexcept;

    template <typename T>
    [[nodiscard]] std::span<T> as_span() noexcept;

    // Buffer Introspection
    [[nodiscard]] const TensorDescriptor& descriptor() const noexcept;
    [[nodiscard]] size_t size_bytes() const noexcept;
    [[nodiscard]] size_t element_count() const noexcept;
    [[nodiscard]] MemoryType get_memory_type() const noexcept;
    [[nodiscard]] int get_dma_fd() const noexcept;
    [[nodiscard]] void* get_raw_pointer() noexcept;

    // In-Place Operations
    void copy_from_host(const void* src, size_t bytes);
    void flush_cache();
    void invalidate_cache();

private:
    Tensor(const TensorDescriptor& desc, void* ptr, int dma_fd, bool owning);
};

} // namespace xinfer
```

---

## 2. Factory Methods

### `create_from_dmabuf`
```cpp
static std::shared_ptr<Tensor> create_from_dmabuf(
    const TensorDescriptor& desc, 
    int dma_fd, 
    size_t size_bytes
);
```
Constructs a non-owning tensor wrapping an open Linux `DMA-BUF` file descriptor. The tensor does not duplicate memory pages; it references the underlying physical frames directly.

---

### `create_owning`
```cpp
static std::shared_ptr<Tensor> create_owning(const TensorDescriptor& desc);
```
Allocates a 64-byte aligned, page-locked (`mlock`) memory buffer corresponding to the shape and precision declared in `desc`.

