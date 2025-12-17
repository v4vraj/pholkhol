import httpx
import os

KESTRA_URL = os.getenv("KESTRA_URL", "http://localhost:8080")
KESTRA_NAMESPACE = "pohtol.hacks"
KESTRA_FLOW_ID = "issue-recognition"

KESTRA_USERNAME = os.getenv("KESTRA_USERNAME", "vraj1763@gmail.com")
KESTRA_PASSWORD = os.getenv("KESTRA_PASSWORD", "Vraj2003@")


def trigger_kestra(post_id: str, timeout: int = 10):
    print("🔥 KESTRA TRIGGER FUNCTION CALLED")

    url = f"{KESTRA_URL}/api/v1/main/executions/{KESTRA_NAMESPACE}/{KESTRA_FLOW_ID}"

    # ✅ Force multipart/form-data
    files = {
        "post_id": (None, post_id)
    }

    auth = (KESTRA_USERNAME, KESTRA_PASSWORD)

    with httpx.Client(timeout=timeout) as client:
        resp = client.post(
            url,
            files=files,   # ✅ THIS is the key
            auth=auth
        )
        print("STATUS:", resp.status_code)
        print("RESPONSE:", resp.text)
        resp.raise_for_status()
        print("[Kestra] Execution started:", resp.json())
