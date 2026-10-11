Here is a production-grade Python automation script to download all 12 cybersecurity models. 

It uses `snapshot_download` from `huggingface_hub` to **filter specifically for `.safetensors`, `.onnx`, config, and tokenizer files** (skipping duplicate legacy `.bin` files to save bandwidth and disk space). It also handles gated models (like Meta's Llama Guard / Prompt Guard) gracefully using an optional Hugging Face API token.

---

### 1. Prerequisites & Setup

Install the required high-speed download dependencies:

```bash
pip install huggingface_hub[cli] hf-transfer tqdm
```

*(Optional: Set your Hugging Face token if you have access to the Meta Llama models)*:
```bash
export HF_TOKEN="hf_your_personal_access_token_here"
```

---

### 2. Download Automation Script (`download_security_models.py`)

Save the following code as `download_security_models.py`:

```python
#!/usr/bin/env python3
"""
Aryorithm / Cyber-Physical AI Model Harvester
Downloads pre-trained cybersecurity models (Safetensors / ONNX)
from Hugging Face for on-premises / private cloud staging.
"""

import os
import sys
import time
import argparse
from pathlib import Path
from typing import List, Dict, Any
from huggingface_hub import snapshot_download
from huggingface_hub.utils import GatedRepoError, RepositoryNotFoundError

# Force Rust-based high-speed parallel download engine
os.environ["HF_HUB_ENABLE_HF_TRANSFER"] = "1"

# Registry of target models
SECURITY_MODELS: List[Dict[str, Any]] = [
    # --- 1. AI Safety & Prompt Injection Guards ---
    {
        "repo_id": "protectai/deberta-v3-base-prompt-injection-v2",
        "category": "ai_guardrails",
        "dir_name": "protectai-prompt-injection-v2",
        "is_gated": False,
        "patterns": ["*.onnx", "*.safetensors", "*.json", "tokenizer*", "vocab*", "spm*"]
    },
    {
        "repo_id": "Horizon-Labs/prompt-injection-guard-base",
        "category": "ai_guardrails",
        "dir_name": "horizon-prompt-guard-base",
        "is_gated": False,
        "patterns": ["*.onnx", "*.safetensors", "*.json", "tokenizer*", "vocab*"]
    },
    {
        "repo_id": "patronus-studio/wolf-defender-prompt-injection",
        "category": "ai_guardrails",
        "dir_name": "wolf-defender-prompt-injection",
        "is_gated": False,
        "patterns": ["*.onnx", "*.safetensors", "*.json", "tokenizer*", "vocab*"]
    },
    {
        "repo_id": "meta-llama/Prompt-Guard-86M",
        "category": "ai_guardrails",
        "dir_name": "meta-prompt-guard-86m",
        "is_gated": True,
        "patterns": ["*.safetensors", "*.json", "tokenizer*", "vocab*"]
    },
    {
        "repo_id": "meta-llama/Llama-Guard-3-8B",
        "category": "ai_guardrails",
        "dir_name": "meta-llama-guard-3-8b",
        "is_gated": True,
        "patterns": ["*.safetensors", "*.json", "tokenizer*", "vocab*"]
    },

    # --- 2. Threat Intel & Security NLP ---
    {
        "repo_id": "jackaduma/SecBERT",
        "category": "threat_intelligence",
        "dir_name": "jackaduma-secbert",
        "is_gated": False,
        "patterns": ["*.safetensors", "*.json", "vocab.txt", "tokenizer*"]
    },
    {
        "repo_id": "cisco-ai/SecureBERT2.0-base",
        "category": "threat_intelligence",
        "dir_name": "cisco-securebert-2.0-base",
        "is_gated": False,
        "patterns": ["*.safetensors", "*.json", "tokenizer*", "vocab*"]
    },

    # --- 3. Phishing & Malicious URL Detection ---
    {
        "repo_id": "cybersectony/phishing-email-detection-distilbert_v2.4.1",
        "category": "phishing_and_urls",
        "dir_name": "distilbert-phishing-email-v2",
        "is_gated": False,
        "patterns": ["*.safetensors", "*.json", "vocab.txt", "tokenizer*"]
    },
    {
        "repo_id": "darshan8950/phishing_url_detection_BERT",
        "category": "phishing_and_urls",
        "dir_name": "bert-phishing-url-detection",
        "is_gated": False,
        "patterns": ["*.safetensors", "*.json", "vocab.txt", "tokenizer*"]
    },
    {
        "repo_id": "Horizon-Labs/phishing-scam-detector-base",
        "category": "phishing_and_urls",
        "dir_name": "horizon-phishing-scam-base",
        "is_gated": False,
        "patterns": ["*.onnx", "*.safetensors", "*.json", "tokenizer*", "vocab*"]
    },

    # --- 4. Vulnerability & Secret Leakage Scanning ---
    {
        "repo_id": "mahdin70/codebert-devign-code-vulnerability-detector",
        "category": "code_and_secrets",
        "dir_name": "codebert-devign-vulnerability-detector",
        "is_gated": False,
        "patterns": ["*.safetensors", "*.json", "vocab.json", "merges.txt", "tokenizer*"]
    },
    {
        "repo_id": "hypn05/secrets-sentinel",
        "category": "code_and_secrets",
        "dir_name": "secrets-sentinel-deberta",
        "is_gated": False,
        "patterns": ["*.onnx", "*.safetensors", "*.json", "tokenizer*", "vocab*"]
    }
]

def format_size(bytes_num: int) -> str:
    """Formats bytes into human readable string."""
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if bytes_num < 1024.0:
            return f"{bytes_num:.2f} {unit}"
        bytes_num /= 1024.0
    return f"{bytes_num:.2f} PB"

def get_dir_size(path: Path) -> int:
    """Calculates total disk usage of directory."""
    return sum(f.stat().st_size for f in path.glob('**/*') if f.is_file())

def main():
    parser = argparse.ArgumentParser(description="Download pre-trained cybersecurity models.")
    parser.add_argument(
        "--output-dir", 
        type=str, 
        default="./cybersecurity_models_vault", 
        help="Base directory to save downloaded models (default: ./cybersecurity_models_vault)"
    )
    parser.add_argument(
        "--token", 
        type=str, 
        default=os.getenv("HF_TOKEN", None), 
        help="Hugging Face personal access token (optional, needed for Meta models)"
    )
    args = parser.parse_args()

    base_dir = Path(args.output_dir).resolve()
    base_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 80)
    print(f"[*] CYBERSECURITY MODEL HARVESTER INITIALIZED")
    print(f"[*] Target Local Storage : {base_dir}")
    print(f"[*] HF-Transfer Engine   : Enabled (High-Speed Parallel)")
    print(f"[*] Authentication Token : {'Provided' if args.token else 'None (Gated repos will be skipped)'}")
    print("=" * 80)

    stats = {"success": 0, "failed": 0, "skipped_gated": 0}
    start_total_time = time.perf_counter()

    for idx, model in enumerate(SECURITY_MODELS, start=1):
        repo_id = model["repo_id"]
        category = model["category"]
        dir_name = model["dir_name"]
        is_gated = model["is_gated"]
        patterns = model["patterns"]

        dest_folder = base_dir / category / dir_name
        dest_folder.mkdir(parents=True, exist_ok=True)

        print(f"\n[{idx}/{len(SECURITY_MODELS)}] Staging: {repo_id}")
        print(f"  -> Category   : {category}")
        print(f"  -> Destination: {dest_folder}")
        print(f"  -> File Filter: {', '.join(patterns[:3])}...")

        if is_gated and not args.token:
            print("  [-] SKIPPED: This model requires access approval. Pass --token or export HF_TOKEN.")
            stats["skipped_gated"] += 1
            continue

        start_time = time.perf_counter()
        try:
            snapshot_download(
                repo_id=repo_id,
                local_dir=str(dest_folder),
                allow_patterns=patterns,
                token=args.token,
                local_dir_use_symlinks=False,  # Download actual binary files directly
                resume_download=True
            )
            elapsed = time.perf_counter() - start_time
            size_str = format_size(get_dir_size(dest_folder))
            print(f"  [+] SUCCESS: Downloaded in {elapsed:.1f}s | Disk Size: {size_str}")
            stats["success"] += 1

        except GatedRepoError:
            print(f"  [-] ACCESS DENIED: Account does not have accepted license terms on HF for {repo_id}.")
            stats["skipped_gated"] += 1
        except RepositoryNotFoundError:
            print(f"  [-] NOT FOUND: Repository {repo_id} was not found or is currently private.")
            stats["failed"] += 1
        except Exception as e:
            print(f"  [-] ERROR: Download failed: {e}")
            stats["failed"] += 1

    total_time = time.perf_counter() - start_total_time
    total_disk_used = format_size(get_dir_size(base_dir))

    print("\n" + "=" * 80)
    print("[*] HARVEST SUMMARY REPORT")
    print(f"  • Successfully Downloaded : {stats['success']} models")
    print(f"  • Skipped (Gated/No Auth)  : {stats['skipped_gated']} models")
    print(f"  • Failed                   : {stats['failed']} models")
    print(f"  • Total Vault Disk Usage   : {total_disk_used}")
    print(f"  • Total Time Elapsed       : {total_time:.1f} seconds")
    print(f"  • Destination Path         : {base_dir}")
    print("=" * 80)

if __name__ == "__main__":
    main()
```

---

### 3. Running the Script

#### Standard Download (All public models):
```bash
python3 download_security_models.py --output-dir /opt/models/security_vault
```

#### Download Everything (Including Meta's Llama Guard / Prompt Guard):
```bash
python3 download_security_models.py \
    --output-dir /opt/models/security_vault \
    --token "hf_YourSecretTokenGoesHere"
```

---

### 4. Resulting Local Directory Structure

The script organizes the models by category for clean integration with cloud storage (S3, MinIO, or container volume mounts):

```text
/opt/models/security_vault/
├── ai_guardrails/
│   ├── protectai-prompt-injection-v2/     # model.onnx & model.safetensors
│   ├── horizon-prompt-guard-base/         # model.onnx & model.safetensors
│   ├── wolf-defender-prompt-injection/    # model.onnx & model.safetensors
│   ├── meta-prompt-guard-86m/             # model.safetensors
│   └── meta-llama-guard-3-8b/             # model-*.safetensors
├── threat_intelligence/
│   ├── jackaduma-secbert/                 # model.safetensors & vocab.txt
│   └── cisco-securebert-2.0-base/         # model.safetensors
├── phishing_and_urls/
│   ├── distilbert-phishing-email-v2/      # model.safetensors
│   ├── bert-phishing-url-detection/       # model.safetensors
│   └── horizon-phishing-scam-base/        # model.onnx & model.safetensors
└── code_and_secrets/
    ├── codebert-devign-vulnerability-detector/ # model.safetensors
    └── secrets-sentinel-deberta/          # model.onnx & model.safetensors
```