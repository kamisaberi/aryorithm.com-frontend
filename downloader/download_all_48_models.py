#!/usr/bin/env python3
"""
Aryorithm / Master 48-Model Cybersecurity Harvester
Automates downloading 48 pre-trained cybersecurity models (Safetensors & ONNX)
from Hugging Face into a structured vault for private cloud staging.
"""

import os
import sys
import time
import argparse
from pathlib import Path
from typing import List, Dict, Any
from huggingface_hub import snapshot_download
from huggingface_hub.utils import GatedRepoError, RepositoryNotFoundError

os.environ["HF_HUB_ENABLE_HF_TRANSFER"] = "1"

MASTER_REGISTRY: List[Dict[str, Any]] = [
    # =========================================================================
    # 1. AI Safety, Guardrails & Prompt Injection Defense (16 Models)
    # =========================================================================
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
        "repo_id": "onnx-community/content-safety-guard-small-ONNX",
        "category": "ai_guardrails",
        "dir_name": "horizon-content-safety-small-onnx",
        "is_gated": False,
        "patterns": ["*.onnx", "*.json", "tokenizer*"]
    },
    {
        "repo_id": "vllm-sr/Vela-1.0-Encoder-307M-Shield",
        "category": "ai_guardrails",
        "dir_name": "vela-307m-shield-onnx",
        "is_gated": False,
        "patterns": ["*.onnx", "*.safetensors", "*.json", "tokenizer*", "heads/*"]
    },
    {
        "repo_id": "qualifire/prompt-injection-sentinel",
        "category": "ai_guardrails",
        "dir_name": "qualifire-prompt-injection-sentinel",
        "is_gated": False,
        "patterns": ["*.safetensors", "*.json", "tokenizer*", "vocab*"]
    },
    {
        "repo_id": "patronus-studio/wolf-defender-prompt-injection",
        "category": "ai_guardrails",
        "dir_name": "wolf-defender-prompt-injection",
        "is_gated": False,
        "patterns": ["*.onnx", "*.safetensors", "*.json", "tokenizer*", "vocab*"]
    },
    {
        "repo_id": "patronus-studio/wolf-defender-prompt-injection-small",
        "category": "ai_guardrails",
        "dir_name": "wolf-defender-small-onnx",
        "is_gated": False,
        "patterns": ["*.onnx", "*.safetensors", "*.json", "tokenizer*", "vocab*"]
    },
    {
        "repo_id": "patronus-studio/orca-sonar",
        "category": "ai_guardrails",
        "dir_name": "orca-sonar-dlp",
        "is_gated": False,
        "patterns": ["*.onnx", "*.safetensors", "*.json", "tokenizer*", "vocab*"]
    },
    {
        "repo_id": "0dinai/jailbreak-embeddings-large-onnx-int8",
        "category": "ai_guardrails",
        "dir_name": "0din-jailbreak-embeddings-onnx",
        "is_gated": False,
        "patterns": ["*.onnx", "*.json", "tokenizer*"]
    },
    {
        "repo_id": "testsavantai/prompt-injection-defender-tiny-v0-onnx",
        "category": "ai_guardrails",
        "dir_name": "testsavantai-defender-tiny-onnx",
        "is_gated": False,
        "patterns": ["*.onnx", "*.json", "tokenizer*", "vocab*"]
    },
    {
        "repo_id": "testsavantai/prompt-injection-defender-small-v0-onnx",
        "category": "ai_guardrails",
        "dir_name": "testsavantai-defender-small-onnx",
        "is_gated": False,
        "patterns": ["*.onnx", "*.json", "tokenizer*", "vocab*"]
    },
    {
        "repo_id": "testsavantai/prompt-injection-defender-base-v2-onnx",
        "category": "ai_guardrails",
        "dir_name": "testsavantai-defender-base-onnx",
        "is_gated": False,
        "patterns": ["*.onnx", "*.json", "tokenizer*", "vocab*"]
    },
    {
        "repo_id": "fmops/distilbert-prompt-injection",
        "category": "ai_guardrails",
        "dir_name": "fmops-distilbert-prompt-injection",
        "is_gated": False,
        "patterns": ["*.onnx", "*.safetensors", "*.json", "vocab.txt", "tokenizer*"]
    },
    {
        "repo_id": "Qualcomm/Llama-Guard-3-1B-ONNX",
        "category": "ai_guardrails",
        "dir_name": "qualcomm-llama-guard-3-1b-onnx",
        "is_gated": False,
        "patterns": ["*.onnx", "*.json", "tokenizer*"]
    },
    {
        "repo_id": "ibm-granite/granite-guardian-3.0-8b",
        "category": "ai_guardrails",
        "dir_name": "ibm-granite-guardian-3.0-8b",
        "is_gated": False,
        "patterns": ["*.safetensors", "*.json", "tokenizer*"]
    },
    {
        "repo_id": "meta-llama/Prompt-Guard-86M",
        "category": "ai_guardrails",
        "dir_name": "meta-prompt-guard-86m",
        "is_gated": True,
        "patterns": ["*.safetensors", "*.json", "tokenizer*", "vocab*"]
    },
    {
        "repo_id": "meta-llama/Llama-Guard-3-1B",
        "category": "ai_guardrails",
        "dir_name": "meta-llama-guard-3-1b",
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

    # =========================================================================
    # 2. Threat Intelligence, CTI & Security NLP (12 Models)
    # =========================================================================
    {
        "repo_id": "jackaduma/SecBERT",
        "category": "threat_intelligence",
        "dir_name": "jackaduma-secbert",
        "is_gated": False,
        "patterns": ["*.safetensors", "*.json", "vocab.txt", "tokenizer*"]
    },
    {
        "repo_id": "jackaduma/SecRoBERTa",
        "category": "threat_intelligence",
        "dir_name": "jackaduma-secroberta",
        "is_gated": False,
        "patterns": ["*.safetensors", "*.json", "vocab.txt", "tokenizer*"]
    },
    {
        "repo_id": "attack-vector/SecureModernBERT-NER",
        "category": "threat_intelligence",
        "dir_name": "attack-vector-securemodernbert-ner",
        "is_gated": False,
        "patterns": ["*.safetensors", "*.json", "tokenizer*", "vocab*"]
    },
    {
        "repo_id": "CyberPeace-Institute/SecureBERT-NER",
        "category": "threat_intelligence",
        "dir_name": "cyberpeace-securebert-ner",
        "is_gated": False,
        "patterns": ["*.safetensors", "*.json", "tokenizer*", "vocab*"]
    },
    {
        "repo_id": "cisco-ai/SecureBERT2.0-base",
        "category": "threat_intelligence",
        "dir_name": "cisco-securebert-2.0-base",
        "is_gated": False,
        "patterns": ["*.safetensors", "*.json", "tokenizer*", "vocab*"]
    },
    {
        "repo_id": "cisco-ai/SecureBERT2.0-NER",
        "category": "threat_intelligence",
        "dir_name": "cisco-securebert-2.0-ner",
        "is_gated": False,
        "patterns": ["*.safetensors", "*.json", "tokenizer*", "vocab*"]
    },
    {
        "repo_id": "cisco-ai/SecureBERT2.0-biencoder",
        "category": "threat_intelligence",
        "dir_name": "cisco-securebert-2.0-biencoder",
        "is_gated": False,
        "patterns": ["*.safetensors", "*.json", "tokenizer*", "vocab*"]
    },
    {
        "repo_id": "cisco-ai/SecureBERT2.0-cross_encoder",
        "category": "threat_intelligence",
        "dir_name": "cisco-securebert-2.0-cross-encoder",
        "is_gated": False,
        "patterns": ["*.safetensors", "*.json", "tokenizer*", "vocab*"]
    },
    {
        "repo_id": "nanda-rani/TTPXHunter",
        "category": "threat_intelligence",
        "dir_name": "nanda-rani-ttpxhunter",
        "is_gated": False,
        "patterns": ["*.safetensors", "*.json", "tokenizer*", "vocab*"]
    },
    {
        "repo_id": "sindsub/cybersec-mpnet-finetuned",
        "category": "threat_intelligence",
        "dir_name": "sindsub-cybersec-mpnet-mitre",
        "is_gated": False,
        "patterns": ["*.safetensors", "*.json", "tokenizer*", "vocab*"]
    },
    {
        "repo_id": "selfconstruct3d/mpnet-classification-finetuned-cyber-groups",
        "category": "threat_intelligence",
        "dir_name": "mpnet-cyber-groups-attribution",
        "is_gated": False,
        "patterns": ["*.safetensors", "*.json", "tokenizer*", "vocab*"]
    },
    {
        "repo_id": "HiddenKise/Kaviel-threat-text-classifier",
        "category": "threat_intelligence",
        "dir_name": "kaviel-threat-classifier",
        "is_gated": False,
        "patterns": ["*.safetensors", "*.json", "tokenizer*", "vocab*"]
    },
    {
        "repo_id": "Canstralian/CyberAttackDetection",
        "category": "threat_intelligence",
        "dir_name": "canstralian-cyber-attack-detection",
        "is_gated": False,
        "patterns": ["*.safetensors", "*.json", "tokenizer*", "vocab*"]
    },

    # =========================================================================
    # 3. Web & Network Application Security (Phishing, URLs, DGA, SQLi) (8 Models)
    # =========================================================================
    {
        "repo_id": "sdmlai/cyber-jev",
        "category": "web_and_network",
        "dir_name": "sdmlai-cyber-jev-onnx",
        "is_gated": False,
        "patterns": ["*.onnx", "*.safetensors", "*.json", "tokenizer*"]
    },
    {
        "repo_id": "nuhmanpk/pawn-68m",
        "category": "web_and_network",
        "dir_name": "pawn-68m-edge-secops",
        "is_gated": False,
        "patterns": ["*.onnx", "*.safetensors", "*.json", "tokenizer*"]
    },
    {
        "repo_id": "cybersectony/phishing-email-detection-distilbert_v2.4.1",
        "category": "web_and_network",
        "dir_name": "distilbert-phishing-email-v2",
        "is_gated": False,
        "patterns": ["*.safetensors", "*.json", "vocab.txt", "tokenizer*"]
    },
    {
        "repo_id": "LHRS-UM-FERI/MENTHOS-spam",
        "category": "web_and_network",
        "dir_name": "menthos-spam-modernbert",
        "is_gated": False,
        "patterns": ["*.safetensors", "*.json", "tokenizer*"]
    },
    {
        "repo_id": "kmack/malicious-url-detection",
        "category": "web_and_network",
        "dir_name": "kmack-malicious-url-distilbert",
        "is_gated": False,
        "patterns": ["*.safetensors", "*.json", "vocab.txt", "tokenizer*"]
    },
    {
        "repo_id": "darshan8950/phishing_url_detection_BERT",
        "category": "web_and_network",
        "dir_name": "bert-phishing-url-detection",
        "is_gated": False,
        "patterns": ["*.safetensors", "*.json", "vocab.txt", "tokenizer*"]
    },
    {
        "repo_id": "r3ddkahili/final-complete-malicious-url-model",
        "category": "web_and_network",
        "dir_name": "r3ddkahili-multiclass-url-bert",
        "is_gated": False,
        "patterns": ["*.safetensors", "*.json", "vocab.txt", "tokenizer*"]
    },
    {
        "repo_id": "Horizon-Labs/phishing-scam-detector-base",
        "category": "web_and_network",
        "dir_name": "horizon-phishing-scam-base",
        "is_gated": False,
        "patterns": ["*.onnx", "*.safetensors", "*.json", "tokenizer*", "vocab*"]
    },
    {
        "repo_id": "cssupport/mobilebert-sql-injection-detect",
        "category": "web_and_network",
        "dir_name": "mobilebert-sqli-detector",
        "is_gated": False,
        "patterns": ["*.safetensors", "*.json", "vocab.txt", "tokenizer*"]
    },
    {
        "repo_id": "maheshj01/sql-injection-classifier",
        "category": "web_and_network",
        "dir_name": "maheshj01-sqli-gemma-classifier",
        "is_gated": False,
        "patterns": ["*.safetensors", "*.json", "tokenizer*", "vocab*"]
    },
    {
        "repo_id": "snsec-net/dga-detector-drift26dsn",
        "category": "web_and_network",
        "dir_name": "dga-detector-transformer",
        "is_gated": False,
        "patterns": ["*.safetensors", "*.json", "tokenizer*", "vocab*"]
    },

    # =========================================================================
    # 4. Code Security, Secrets & Vulnerabilities (CVE / CWE) (6 Models)
    # =========================================================================
    {
        "repo_id": "mahdin70/codebert-devign-code-vulnerability-detector",
        "category": "code_and_secrets",
        "dir_name": "codebert-devign-vulnerability-detector",
        "is_gated": False,
        "patterns": ["*.safetensors", "*.json", "vocab.json", "merges.txt", "tokenizer*"]
    },
    {
        "repo_id": "mahdin70/CodeBERT-VulnCWE",
        "category": "code_and_secrets",
        "dir_name": "codebert-vulncwe-multitask",
        "is_gated": False,
        "patterns": ["*.safetensors", "*.json", "vocab.json", "merges.txt", "tokenizer*"]
    },
    {
        "repo_id": "mahdin70/CodeBERT-PrimeVul-BigVul",
        "category": "code_and_secrets",
        "dir_name": "codebert-primevul-cwe-detector",
        "is_gated": False,
        "patterns": ["*.safetensors", "*.json", "vocab.json", "merges.txt", "tokenizer*"]
    },
    {
        "repo_id": "hypn05/secrets-sentinel",
        "category": "code_and_secrets",
        "dir_name": "secrets-sentinel-deberta",
        "is_gated": False,
        "patterns": ["*.onnx", "*.safetensors", "*.json", "tokenizer*", "vocab*"]
    },
    {
        "repo_id": "mrm8488/codebert-base-finetuned-detect-insecure-code",
        "category": "code_and_secrets",
        "dir_name": "codebert-insecure-code-detector",
        "is_gated": False,
        "patterns": ["*.safetensors", "*.json", "vocab.json", "merges.txt", "tokenizer*"]
    },
    {
        "repo_id": "CIRCL/vulnerability-severity-classification-roberta-base",
        "category": "code_and_secrets",
        "dir_name": "circl-cve-severity-roberta",
        "is_gated": False,
        "patterns": ["*.safetensors", "*.json", "vocab.json", "merges.txt", "tokenizer*"]
    }
]

def format_size(bytes_num: int) -> str:
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if bytes_num < 1024.0:
            return f"{bytes_num:.2f} {unit}"
        bytes_num /= 1024.0
    return f"{bytes_num:.2f} PB"

def get_dir_size(path: Path) -> int:
    return sum(f.stat().st_size for f in path.glob('**/*') if f.is_file())

def main():
    parser = argparse.ArgumentParser(description="Master 48-Model Cybersecurity Harvester.")
    parser.add_argument(
        "--output-dir", 
        type=str, 
        default="./cybersecurity_models_vault", 
        help="Base path to store downloaded models (default: ./cybersecurity_models_vault)"
    )
    parser.add_argument(
        "--category", 
        type=str, 
        default=None, 
        choices=["ai_guardrails", "threat_intelligence", "web_and_network", "code_and_secrets"],
        help="Filter downloads by specific category"
    )
    parser.add_argument(
        "--onnx-only",
        action="store_true",
        help="Filter downloads to models with native ONNX weights"
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

    targets = MASTER_REGISTRY
    if args.category:
        targets = [m for m in targets if m["category"] == args.category]
    if args.onnx_only:
        targets = [m for m in targets if any(".onnx" in p for p in m["patterns"])]

    print("=" * 80)
    print(f"[*] MASTER CYBERSECURITY MODEL HARVESTER (48 MODELS TOTAL)")
    print(f"[*] Target Directory     : {base_dir}")
    print(f"[*] Selected for Harvest : {len(targets)} models")
    print(f"[*] Category Filter      : {args.category or 'All Categories'}")
    print(f"[*] ONNX-Only Mode       : {'Enabled' if args.onnx_only else 'Disabled'}")
    print(f"[*] Access Token         : {'Provided' if args.token else 'None (Gated models will be skipped)'}")
    print("=" * 80)

    stats = {"success": 0, "failed": 0, "skipped_gated": 0}
    start_total_time = time.perf_counter()

    for idx, model in enumerate(targets, start=1):
        repo_id = model["repo_id"]
        category = model["category"]
        dir_name = model["dir_name"]
        is_gated = model["is_gated"]
        patterns = model["patterns"]

        dest_folder = base_dir / category / dir_name
        dest_folder.mkdir(parents=True, exist_ok=True)

        print(f"\n[{idx}/{len(targets)}] Staging: {repo_id}")
        print(f"  -> Category   : {category}")
        print(f"  -> Path       : {dest_folder}")

        if is_gated and not args.token:
            print("  [-] SKIPPED: Gated repository requires approval. Pass --token or export HF_TOKEN.")
            stats["skipped_gated"] += 1
            continue

        start_time = time.perf_counter()
        try:
            snapshot_download(
                repo_id=repo_id,
                local_dir=str(dest_folder),
                allow_patterns=patterns,
                token=args.token,
                local_dir_use_symlinks=False,
                resume_download=True
            )
            elapsed = time.perf_counter() - start_time
            size_str = format_size(get_dir_size(dest_folder))
            print(f"  [+] SUCCESS: Downloaded in {elapsed:.1f}s | Size on disk: {size_str}")
            stats["success"] += 1

        except GatedRepoError:
            print(f"  [-] ACCESS DENIED: Account lacks license approval on Hugging Face for {repo_id}.")
            stats["skipped_gated"] += 1
        except RepositoryNotFoundError:
            print(f"  [-] NOT FOUND: Repository {repo_id} does not exist or is private.")
            stats["failed"] += 1
        except Exception as e:
            print(f"  [-] ERROR: Failed downloading {repo_id}: {e}")
            stats["failed"] += 1

    total_time = time.perf_counter() - start_total_time
    total_disk_used = format_size(get_dir_size(base_dir))

    print("\n" + "=" * 80)
    print("[*] HARVEST SUMMARY REPORT")
    print(f"  • Successfully Downloaded : {stats['success']} models")
    print(f"  • Skipped (Gated/No Auth)  : {stats['skipped_gated']} models")
    print(f"  • Failed                   : {stats['failed']} models")
    print(f"  • Total Storage Utilized   : {total_disk_used}")
    print(f"  • Total Time Elapsed       : {total_time:.1f} seconds")
    print(f"  • Destination Path         : {base_dir}")
    print("=" * 80)

if __name__ == "__main__":
    main()