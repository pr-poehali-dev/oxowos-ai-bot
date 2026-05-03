import json
import os
import urllib.request
import urllib.error

TG_API = "https://api.telegram.org/bot"
GROK_API = "https://api.x.ai/v1/chat/completions"
MODEL = "grok-3"

SYSTEM_PROMPT = (
    "Ты OxiwisAI — умный, дружелюбный и мощный ИИ-ассистент. "
    "Отвечай развёрнуто, по делу, на русском языке. "
    "Можешь использовать эмодзи для выразительности. "
    "Если задают вопрос по коду — давай готовый рабочий код. "
    "Если вопрос по математике или логике — объясняй пошагово."
)

# Хранилище истории диалогов (в памяти, на время жизни контейнера)
_history: dict[int, list[dict]] = {}


def tg_request(method: str, payload: dict) -> dict:
    token = os.environ["TELEGRAM_BOT_TOKEN"]
    url = f"{TG_API}{token}/{method}"
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read())


def grok_request(messages: list[dict]) -> str:
    api_key = os.environ["GROK_API_KEY"]
    payload = {
        "model": MODEL,
        "messages": [{"role": "system", "content": SYSTEM_PROMPT}] + messages,
        "max_tokens": 1500,
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        GROK_API,
        data=data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=25) as resp:
            result = json.loads(resp.read())
            return result["choices"][0]["message"]["content"]
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        return f"❌ Ошибка API: {e.code} — {body[:200]}"


def handler(event: dict, context) -> dict:
    """Webhook для Telegram бота OxiwisAI. Принимает обновления и отвечает через Grok."""
    cors = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors, "body": ""}

    if event.get("httpMethod") != "POST":
        return {"statusCode": 200, "headers": cors, "body": json.dumps({"ok": True, "status": "OxiwisAI bot is running"})}

    try:
        update = json.loads(event.get("body") or "{}")
    except Exception:
        return {"statusCode": 200, "headers": cors, "body": json.dumps({"ok": True})}

    message = update.get("message") or update.get("edited_message")
    if not message:
        return {"statusCode": 200, "headers": cors, "body": json.dumps({"ok": True})}

    chat_id: int = message["chat"]["id"]
    text: str = message.get("text", "").strip()

    if not text:
        return {"statusCode": 200, "headers": cors, "body": json.dumps({"ok": True})}

    # Команды
    if text in ("/start", "/старт"):
        tg_request("sendMessage", {
            "chat_id": chat_id,
            "text": (
                "👋 Привет! Я *OxiwisAI* — умный помощник на базе Grok 3.\n\n"
                "Задай любой вопрос — отвечу развёрнуто и по делу.\n\n"
                "🔄 /new — начать новый диалог\n"
                "❓ /help — помощь"
            ),
            "parse_mode": "Markdown",
        })
        _history[chat_id] = []
        return {"statusCode": 200, "headers": cors, "body": json.dumps({"ok": True})}

    if text in ("/new", "/новый"):
        _history[chat_id] = []
        tg_request("sendMessage", {
            "chat_id": chat_id,
            "text": "🔄 Диалог сброшен. Начинаем с чистого листа!",
        })
        return {"statusCode": 200, "headers": cors, "body": json.dumps({"ok": True})}

    if text in ("/help", "/помощь"):
        tg_request("sendMessage", {
            "chat_id": chat_id,
            "text": (
                "📚 *OxiwisAI — помощь*\n\n"
                "Просто напиши любой вопрос и я отвечу.\n\n"
                "Команды:\n"
                "/new — сбросить историю диалога\n"
                "/start — приветствие\n\n"
                "Я помню контекст нашего разговора и отвечаю на основе модели Grok 3 🚀"
            ),
            "parse_mode": "Markdown",
        })
        return {"statusCode": 200, "headers": cors, "body": json.dumps({"ok": True})}

    # Показываем индикатор набора
    tg_request("sendChatAction", {"chat_id": chat_id, "action": "typing"})

    # Добавляем сообщение пользователя в историю
    if chat_id not in _history:
        _history[chat_id] = []
    _history[chat_id].append({"role": "user", "content": text})

    # Ограничиваем историю последними 20 сообщениями
    if len(_history[chat_id]) > 20:
        _history[chat_id] = _history[chat_id][-20:]

    # Запрашиваем ответ от Grok
    reply = grok_request(_history[chat_id])

    # Сохраняем ответ в историю
    _history[chat_id].append({"role": "assistant", "content": reply})

    # Отправляем ответ (разбиваем если длинный)
    if len(reply) > 4000:
        chunks = [reply[i:i+4000] for i in range(0, len(reply), 4000)]
        for chunk in chunks:
            tg_request("sendMessage", {"chat_id": chat_id, "text": chunk})
    else:
        tg_request("sendMessage", {"chat_id": chat_id, "text": reply})

    return {"statusCode": 200, "headers": cors, "body": json.dumps({"ok": True})}
