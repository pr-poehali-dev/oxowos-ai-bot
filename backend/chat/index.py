import json
import os
import urllib.request
import urllib.error
# v2


def handler(event: dict, context) -> dict:
    """Обработка сообщений чата — проксирует запрос к Grok AI и возвращает ответ"""

    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json",
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors_headers, "body": ""}

    body = json.loads(event.get("body") or "{}")
    messages = body.get("messages", [])

    if not messages:
        return {
            "statusCode": 400,
            "headers": cors_headers,
            "body": json.dumps({"error": "messages required"}),
        }

    api_key = os.environ["GROK_API_KEY"]

    payload = json.dumps({
        "model": "grok-3",
        "messages": [
            {
                "role": "system",
                "content": (
                    "Ты OxiwisAI — мощный и дружелюбный ИИ-ассистент. "
                    "Отвечай развёрнуто, по делу, на русском языке. "
                    "Можешь использовать эмодзи для выразительности. "
                    "Ты умный, чуткий и всегда готов помочь."
                ),
            },
            *messages,
        ],
        "temperature": 0.7,
    }).encode("utf-8")

    req = urllib.request.Request(
        "https://api.x.ai/v1/chat/completions",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            reply = data["choices"][0]["message"]["content"]
            return {
                "statusCode": 200,
                "headers": cors_headers,
                "body": json.dumps({"reply": reply}),
            }
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        return {
            "statusCode": 502,
            "headers": cors_headers,
            "body": json.dumps({"error": "Grok API error", "details": error_body}),
        }