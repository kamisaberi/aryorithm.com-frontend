"""Generate an Ed25519 master keypair for offline license signing.

Usage:  PYTHONPATH=. .venv/bin/python tools/licensing/generate_keys.py [--write]

- Prints ARYORITHM_MASTER_PRIVATE_KEY_B64 / ARYORITHM_MASTER_PUBLIC_KEY_B64
  for your .env or secrets vault.
- With --write, also stores the raw 32-byte private seed at
  tools/licensing/master_private.key (git-ignored dev fallback).

Keep the private key in a vault (never in git). The public key may be
committed — appliances verify .lic envelopes with it.
"""

import base64
import os
import sys

sys.path.insert(0, ".")

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ed25519

KEY_PATH = os.environ.get("LICENSE_KEY_FILE", "tools/licensing/master_private.key")


def main() -> None:
    private_key = ed25519.Ed25519PrivateKey.generate()
    priv_raw = private_key.private_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PrivateFormat.Raw,
        encryption_algorithm=serialization.NoEncryption(),
    )
    pub_raw = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PublicFormat.Raw,
    )
    print(f"ARYORITHM_MASTER_PRIVATE_KEY_B64={base64.b64encode(priv_raw).decode()}")
    print(f"ARYORITHM_MASTER_PUBLIC_KEY_B64={base64.b64encode(pub_raw).decode()}")
    if "--write" in sys.argv:
        os.makedirs(os.path.dirname(KEY_PATH) or ".", exist_ok=True)
        with open(KEY_PATH, "wb") as f:
            f.write(priv_raw)
        try:
            os.chmod(KEY_PATH, 0o600)
        except OSError:
            pass
        print(f"Wrote raw 32-byte seed to {KEY_PATH} (mode 0600, git-ignored)")


if __name__ == "__main__":
    main()
