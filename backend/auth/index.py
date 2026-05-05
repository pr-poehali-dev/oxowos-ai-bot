import json
import os
import random
import smtplib
import string
from datetime import datetime, timedelta, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p64448353_oxowos_ai_bot")
SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587
SMTP_USER = "oxiwisai@gmail.com"  # будет заменён пользователем если нужно


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def send_code_email(to_email: str, code: str):
    smtp_password = os.environ["SMTP_PASSWORD"]
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"Ваш код входа в OxiwisAI: {code}"
    msg["From"] = SMTP_USER
    msg["To"] = to_email

    html = f"""
    <div style="font-family:sans-serif;max-width:420px;margin:0 auto;background:#0a0a14;color:#fff;padding:32px;border-radius:16px">
      <div style="text-align:center;margin-bottom:24px">
        <img src="https://cdn.poehali.dev/projects/6f213961-92d4-4d70-85ce-d25376d24eb0/bucket/bfa2d0eb-f59c-4f83-ab19-8fc4781dcb25.jpg"
             width="64" height="64" style="border-radius:12px" />
        <h2 style="margin:12px 0 4px;color:#fff">OxiwisAI</h2>
        <p style="color:rgba(255,255,255,0.4);font-size:13px;margin:0">Код подтверждения</p>
      </div>
      <div style="background:rgba(255,255,255,0.07);border-radius:12px;padding:24px;text-align:center">
        <p style="color:rgba(255,255,255,0.6);font-size:14px;margin:0 0 16px">Твой код для входа:</p>
        <div style="font-size:36px;font-weight:900;letter-spacing:8px;color:#fff">{code}</div>
        <p style="color:rgba(255,255,255,0.3);font-size:12px;margin:16px 0 0">Действует 10 минут</p>
      </div>
      <p style="color:rgba(255,255,255,0.2);font-size:11px;text-align:center;margin-top:24px">
        Если ты не запрашивал код — просто проигнорируй это письмо.
      </p>
    </div>
    """
    msg.attach(MIMEText(html, "html"))

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.starttls()
        server.login(SMTP_USER, smtp_password)
        server.sendmail(SMTP_USER, to_email, msg.as_string())


def handler(event: dict, context) -> dict:
    """Авторизация по email: отправка кода и его верификация"""
    cors = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json",
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors, "body": ""}

    body = json.loads(event.get("body") or "{}")
    action = body.get("action")

    # --- Отправить код ---
    if action == "send_code":
        email = (body.get("email") or "").strip().lower()
        if not email or "@" not in email:
            return {"statusCode": 400, "headers": cors, "body": json.dumps({"error": "Некорректный email"})}

        code = "".join(random.choices(string.digits, k=6))
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"INSERT INTO {SCHEMA}.email_codes (email, code, expires_at) VALUES (%s, %s, %s)",
            (email, code, expires_at),
        )
        conn.commit()
        cur.close()
        conn.close()

        send_code_email(email, code)
        return {"statusCode": 200, "headers": cors, "body": json.dumps({"ok": True})}

    # --- Верифицировать код ---
    if action == "verify_code":
        email = (body.get("email") or "").strip().lower()
        code = (body.get("code") or "").strip()
        name = (body.get("name") or "").strip()

        conn = get_conn()
        cur = conn.cursor()
        now = datetime.now(timezone.utc)
        cur.execute(
            f"SELECT id FROM {SCHEMA}.email_codes WHERE email=%s AND code=%s AND used=FALSE AND expires_at>%s ORDER BY id DESC LIMIT 1",
            (email, code, now),
        )
        row = cur.fetchone()
        if not row:
            cur.close()
            conn.close()
            return {"statusCode": 400, "headers": cors, "body": json.dumps({"error": "Неверный или просроченный код"})}

        cur.execute(f"UPDATE {SCHEMA}.email_codes SET used=TRUE WHERE id=%s", (row[0],))

        cur.execute(
            f"INSERT INTO {SCHEMA}.users (email, name) VALUES (%s, %s) ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name RETURNING id, email, name",
            (email, name or email.split("@")[0]),
        )
        user = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()

        return {
            "statusCode": 200,
            "headers": cors,
            "body": json.dumps({"ok": True, "user": {"id": user[0], "email": user[1], "name": user[2]}}),
        }

    return {"statusCode": 400, "headers": cors, "body": json.dumps({"error": "Неизвестное действие"})}
