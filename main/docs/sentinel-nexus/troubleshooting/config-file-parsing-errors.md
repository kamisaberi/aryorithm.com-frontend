# Resolving YAML Parser Inline Comment Stripping Bugs

A critical parsing bug can occur when editing `/etc/sentinel-nexus/nexus.yaml`: if values contain inline comments, naive string readers may append the comment text to URLs, ports, or API endpoints.

---

## 1. Symptom

```text
[ERROR] SaaSConnector: Failed to resolve endpoint 'https://app.aryorithm.com # Central SaaS Cloud'
[ERROR] Uvicorn/FastAPI: 400 Bad Request: Invalid HTTP request received (Path contains spaces)
```

---

## 2. Root Cause & In-Engine Remediation

When parsing configuration lines such as:

```yaml
cloud_endpoint: "https://app.aryorithm.com" # Central SaaS Cloud
```

A standard parser without comment stripping treats `"https://app.aryorithm.com" # Central SaaS Cloud` as a single string literal.

### The C++ Code Fix in `ConfigManager.cpp`

`ConfigManager.cpp` strips comments before trimming quotation marks and whitespace:

```cpp
std::string sanitize_yaml_value(std::string raw_val) {
    // 1. Locate inline comment marker '#'
    size_t comment_pos = raw_val.find('#');
    if (comment_pos != std::string::npos) {
        raw_val = raw_val.substr(0, comment_pos);
    }

    // 2. Trim whitespace
    raw_val.erase(0, raw_val.find_first_not_of(" \t\r\n"));
    raw_val.erase(raw_val.find_last_not_of(" \t\r\n") + 1);

    // 3. Strip quotation marks
    if (raw_val.size() >= 2 && raw_val.front() == '"' && raw_val.back() == '"') {
        raw_val = raw_val.substr(1, raw_val.size() - 2);
    }
    return raw_val;
}
```

Always run `sentinel-nexus --validate-config` to verify that values parse cleanly before starting services.

