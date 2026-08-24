import os
from typing import Any

import httpx


class HermesClient:
    def __init__(self) -> None:
        self.base_url = os.getenv(
            "HERMES_BASE_URL",
            "http://127.0.0.1:8642",
        ).rstrip("/")
        self.api_key = os.getenv("HERMES_API_KEY", "")
        self.model = os.getenv("HERMES_MODEL", "hermes-agent")
        self.timeout = float(
            os.getenv("HERMES_TIMEOUT_SECONDS", "90")
        )

    async def health(self) -> bool:
        async with httpx.AsyncClient(
            timeout=min(self.timeout, 10)
        ) as client:
            response = await client.get(
                f"{self.base_url}/health"
            )
            return response.status_code == 200

    async def chat(
        self,
        *,
        messages: list[dict[str, str]],
        session_key: str,
    ) -> str:
        if not self.api_key:
            raise RuntimeError(
                "HERMES_API_KEY não configurada em backend/.env."
            )

        payload: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "stream": False,
        }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "X-Hermes-Session-Key": session_key[:256],
        }

        async with httpx.AsyncClient(
            timeout=self.timeout
        ) as client:
            response = await client.post(
                f"{self.base_url}/v1/chat/completions",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            data = response.json()

        try:
            return data["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as exc:
            raise RuntimeError(
                "Hermes respondeu em formato inesperado."
            ) from exc
