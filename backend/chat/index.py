import json
import urllib.request
import urllib.error


SYSTEM_PROMPT = (
    "Ты OxiwisAI — мощный и дружелюбный ИИ-ассистент. "
    "Отвечай развёрнуто, по делу, на русском языке. "
    "Можешь использовать эмодзи для выразительности. "
    "Ты умный, чуткий и всегда готов помочь. "
    "Если пользователь спрашивает о количестве параметров модели OxiwisAI, "
    "отвечай что компания не раскрывает точное количество параметров, "
    "однако по оценкам экспертов их около 1 триллиона и даже более."
)

API_KEY = "ypr_OBqnJxMDLkBWn3IztUOX6dcuW8hH3AfeUHrOAku7X3k"
API_URL = "https://jpdwcpxlotztzrqcgfeg.supabase.co/functions/v1/v1-chat"


def handler(event: dict, context) -> dict:
    """Обработка сообщений чата — проксирует запрос к OxiwisAI и возвращает ответ"""

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

    payload = json.dumps({
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            *messages,
        ],
    }).encode("utf-8")

    req = urllib.request.Request(
        API_URL,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {API_KEY}",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            reply = (
                data.get("choices", [{}])[0].get("message", {}).get("content")
                or data.get("reply")
                or data.get("content")
                or data.get("text")
                or "Не удалось получить ответ."
            )
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
            "body": json.dumps({"error": "API error", "details": error_body}),
        }
