import os
import httpx

# --- Kestra Configuration (Match the Postman Target) ---
KESTRA_URL = os.getenv("KESTRA_URL", "http://localhost:8080")
KESTRA_NAMESPACE = "pohtol.hacks"  # Fixed to match Postman URL
KESTRA_FLOW_ID = "issue-recognition"  # Fixed to match Postman URL

# --- Credentials from Postman Request ---
KESTRA_USERNAME = os.getenv("KESTRA_USERNAME", "vraj1763@gmail.com")
KESTRA_PASSWORD = os.getenv("KESTRA_PASSWORD", "Vraj2003@")


async def trigger_kestra(post_id: str, timeout: int = 10):
    """
    Trigger a Kestra flow asynchronously using Basic Auth, matching the Postman configuration.
    Safe: does not raise errors to the caller, only logs.
    """
    # 1. CONSTRUCT THE TARGET URL:
    # Uses the direct execution endpoint from the Postman request.
    target_url = (
        f"{KESTRA_URL}/api/v1/main/executions/{KESTRA_NAMESPACE}/{KESTRA_FLOW_ID}"
    )

    # 2. CONSTRUCT THE PAYLOAD (inputs for the flow):
    # Kestra's execution API uses the inputs object for flow execution.
    payload = {
        "inputs": {
            "post_id": post_id,
        }
    }

    headers = {"Content-Type": "application/json"}
    
    # 3. CONSTRUCT BASIC AUTH TUPLE:
    auth_credentials = (KESTRA_USERNAME, KESTRA_PASSWORD)

    try:
        # 4. ADD 'auth' TO HTTPX CLIENT
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(
                target_url,
                json=payload,
                headers=headers,
                auth=auth_credentials  # <<< ADDED BASIC AUTHENTICATION
            )
            resp.raise_for_status()
            data = resp.json()
            print(f"[Kestra] Execution started: {data.get('id')}")
            return data

    except Exception as e:
        print(f"[WARNING] Kestra trigger failed for post {post_id}: {e}")
        return None