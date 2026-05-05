import json
import os
import urllib.request


def tg_send(token: str, chat_id: int, text: str):
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    data = json.dumps({"chat_id": chat_id, "text": text}).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    urllib.request.urlopen(req, timeout=10)


def handler(event: dict, context) -> dict:
    """Telegram бот — отвечает 'Привет!' на команду /start"""
    cors = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json",
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors, "body": ""}

    if event.get("httpMethod") != "POST":
        return {"statusCode": 200, "headers": cors, "body": json.dumps({"ok": True})}

    update = json.loads(event.get("body") or "{}")
    message = update.get("message")
    if not message:
        return {"statusCode": 200, "headers": cors, "body": json.dumps({"ok": True})}

    chat_id = message["chat"]["id"]
    text = message.get("text", "").strip()

    if text == "/start":
        tg_send(os.environ["TELEGRAM_BOT_TOKEN"], chat_id, "Привет!")

    return {"statusCode": 200, "headers": cors, "body": json.dumps({"ok": True})}
