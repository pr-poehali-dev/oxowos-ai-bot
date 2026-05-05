import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";

const CHAT_URL = "https://functions.poehali.dev/0ae1aadb-4ce9-4abe-973b-8a9da31eded3";
const AUTH_URL = "https://functions.poehali.dev/b30914fa-eb47-43d8-9986-3a5ae106c9b0";
const LOGO = "https://cdn.poehali.dev/projects/6f213961-92d4-4d70-85ce-d25376d24eb0/bucket/bfa2d0eb-f59c-4f83-ab19-8fc4781dcb25.jpg";

type Message = { id: string; role: "user" | "ai"; text: string; time: string };
type Chat = { id: string; title: string; messages: Message[]; createdAt: string };
type Tab = "chat" | "history" | "profile";
type AuthStep = "email" | "code" | "done";
type User = { id: number; email: string; name: string };

function nowTime() {
  return new Date().toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
}
function nowDate() {
  return new Date().toLocaleDateString("ru", { day: "numeric", month: "long" });
}
function genId() {
  return Math.random().toString(36).slice(2, 10);
}

const WELCOME_MSG: Message = {
  id: "welcome",
  role: "ai",
  text: "Привет! Я OxiwisAI — твой умный помощник. Задай любой вопрос, и я постараюсь помочь 🚀",
  time: nowTime(),
};

// ---- Auth Screen ----
function AuthScreen({ onAuth }: { onAuth: (user: User) => void }) {
  const [step, setStep] = useState<AuthStep>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function sendCode() {
    if (!email.trim() || !email.includes("@")) { setError("Введи корректный email"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(AUTH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send_code", email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setStep("code");
    } catch {
      setError("Ошибка соединения, попробуй ещё раз");
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode() {
    if (code.length !== 6) { setError("Введи 6-значный код"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(AUTH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify_code", email: email.trim().toLowerCase(), code, name }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      onAuth(data.user);
    } catch {
      setError("Ошибка соединения, попробуй ещё раз");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-auth-gradient px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img src={LOGO} alt="OxiwisAI" className="w-16 h-16 rounded-2xl mb-4 shadow-logo" />
          <h1 className="text-2xl font-black text-white">OxiwisAI</h1>
          <p className="text-sm text-white/40 mt-1">Умный помощник нового поколения</p>
        </div>

        <div className="auth-card rounded-3xl p-7">
          {step === "email" && (
            <>
              <h2 className="text-lg font-bold text-white mb-1">Войди или зарегистрируйся</h2>
              <p className="text-sm text-white/40 mb-6">Введи email — пришлём код подтверждения</p>
              <label className="block text-xs text-white/50 mb-1.5 font-medium">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendCode()}
                placeholder="you@example.com"
                className="auth-input w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 outline-none mb-4"
              />
              {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
              <button
                onClick={sendCode}
                disabled={loading}
                className="auth-btn w-full py-3 rounded-xl text-white font-semibold text-sm transition-all disabled:opacity-50"
              >
                {loading ? "Отправляем..." : "Получить код →"}
              </button>
            </>
          )}

          {step === "code" && (
            <>
              <button onClick={() => setStep("email")} className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 mb-5 transition-colors">
                <Icon name="ArrowLeft" size={13} /> Назад
              </button>
              <h2 className="text-lg font-bold text-white mb-1">Введи код</h2>
              <p className="text-sm text-white/40 mb-6">Мы отправили 6-значный код на <span className="text-white/70">{email}</span></p>
              <label className="block text-xs text-white/50 mb-1.5 font-medium">Как тебя зовут? (необязательно)</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Твоё имя"
                className="auth-input w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 outline-none mb-3"
              />
              <label className="block text-xs text-white/50 mb-1.5 font-medium">Код из письма</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                onKeyDown={(e) => e.key === "Enter" && verifyCode()}
                placeholder="000000"
                maxLength={6}
                className="auth-input w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 outline-none mb-4 text-center tracking-[8px] text-lg font-bold"
              />
              {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
              <button
                onClick={verifyCode}
                disabled={loading}
                className="auth-btn w-full py-3 rounded-xl text-white font-semibold text-sm transition-all disabled:opacity-50"
              >
                {loading ? "Проверяем..." : "Войти →"}
              </button>
              <button onClick={sendCode} className="w-full text-center text-xs text-white/30 hover:text-white/60 mt-3 transition-colors">
                Отправить код снова
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Main App ----
export default function Index() {
  const [user, setUser] = useState<User | null>(null);
  const [tab, setTab] = useState<Tab>("chat");
  const [chats, setChats] = useState<Chat[]>([
    { id: "default", title: "Новый чат", messages: [WELCOME_MSG], createdAt: nowDate() },
  ]);
  const [activeChatId, setActiveChatId] = useState("default");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeChat = chats.find((c) => c.id === activeChatId)!;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages, loading]);

  if (!user) {
    return <AuthScreen onAuth={(u) => setUser(u)} />;
  }

  function newChat() {
    const id = genId();
    const chat: Chat = {
      id,
      title: "Новый чат",
      messages: [{ ...WELCOME_MSG, id: genId(), time: nowTime() }],
      createdAt: nowDate(),
    };
    setChats((prev) => [chat, ...prev]);
    setActiveChatId(id);
    setSidebarOpen(false);
    setTab("chat");
  }

  function deleteChat(id: string) {
    setChats((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (next.length === 0) {
        const nc: Chat = { id: genId(), title: "Новый чат", messages: [{ ...WELCOME_MSG, id: genId(), time: nowTime() }], createdAt: nowDate() };
        setActiveChatId(nc.id);
        return [nc];
      }
      if (id === activeChatId) setActiveChatId(next[0].id);
      return next;
    });
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");

    const userMsg: Message = { id: genId(), role: "user", text, time: nowTime() };
    setChats((prev) =>
      prev.map((c) => {
        if (c.id !== activeChatId) return c;
        const isFirstReal = c.messages.filter((m) => m.role === "user").length === 0;
        return { ...c, title: isFirstReal ? text.slice(0, 36) : c.title, messages: [...c.messages, userMsg] };
      })
    );

    setLoading(true);
    try {
      const history = activeChat.messages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.text }));

      const res = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...history, { role: "user", content: text }] }),
      });
      const data = await res.json();
      const aiText = data.reply || "Не удалось получить ответ. Попробуй ещё раз.";
      const aiMsg: Message = { id: genId(), role: "ai", text: aiText, time: nowTime() };
      setChats((prev) => prev.map((c) => c.id === activeChatId ? { ...c, messages: [...c.messages, aiMsg] } : c));
    } catch {
      const errMsg: Message = { id: genId(), role: "ai", text: "Ошибка подключения. Проверь интернет и попробуй снова.", time: nowTime() };
      setChats((prev) => prev.map((c) => c.id === activeChatId ? { ...c, messages: [...c.messages, errMsg] } : c));
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  const userInitial = (user.name || user.email)[0].toUpperCase();

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden app-bg">
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="flex h-full w-full relative z-10">
        {/* Sidebar */}
        <aside
          className={`
            fixed md:relative z-30 md:z-auto
            h-full w-72 flex flex-col
            sidebar-bg border-r border-black/10
            transition-transform duration-300 ease-in-out
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          `}
        >
          {/* Logo */}
          <div className="p-5 border-b border-black/10">
            <div className="flex items-center gap-3">
              <img src={LOGO} alt="OxiwisAI" className="w-9 h-9 rounded-xl object-cover" />
              <div>
                <div className="font-bold text-gray-900 text-base leading-tight">OxiwisAI</div>
                <div className="text-xs text-gray-400">Умный помощник</div>
              </div>
            </div>
          </div>

          {/* New chat */}
          <div className="p-3">
            <button
              onClick={newChat}
              className="new-chat-btn w-full flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-white text-sm font-semibold"
            >
              <Icon name="Plus" size={16} />
              Новый чат
            </button>
          </div>

          {/* Nav */}
          <nav className="px-3 pb-2">
            {[
              { id: "chat", icon: "MessageSquare", label: "Чат" },
              { id: "history", icon: "Clock", label: "История" },
              { id: "profile", icon: "User", label: "Кабинет" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => { setTab(item.id as Tab); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium mb-1 transition-all
                  ${tab === item.id
                    ? "bg-gray-900 text-white"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                  }`}
              >
                <Icon name={item.icon} size={17} />
                {item.label}
              </button>
            ))}
          </nav>

          {/* Chat list */}
          <div className="flex-1 overflow-y-auto px-3 py-1">
            <div className="text-xs text-gray-400 px-2 mb-2 font-semibold uppercase tracking-wider">Чаты</div>
            {chats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => { setActiveChatId(chat.id); setTab("chat"); setSidebarOpen(false); }}
                className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl mb-1 cursor-pointer transition-all
                  ${chat.id === activeChatId ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"}`}
              >
                <Icon name="MessageCircle" size={15} className="shrink-0 opacity-60" />
                <span className="text-sm truncate flex-1">{chat.title}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-100 text-gray-300 hover:text-red-500 transition-all"
                >
                  <Icon name="Trash2" size={13} />
                </button>
              </div>
            ))}
          </div>

          {/* Bottom user */}
          <div className="p-3 border-t border-black/10">
            <div className="flex items-center gap-3 px-2">
              <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {userInitial}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-800 font-medium truncate">{user.name}</div>
                <div className="text-xs text-gray-400 truncate">{user.email}</div>
              </div>
              <button
                onClick={() => { setUser(null); }}
                className="text-gray-300 hover:text-gray-700 transition-colors"
                title="Выйти"
              >
                <Icon name="LogOut" size={15} />
              </button>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 flex flex-col min-w-0 h-full main-bg">
          {/* Top bar */}
          <div className="topbar-bg border-b border-black/8 px-4 py-3 flex items-center gap-3 shrink-0">
            <button
              className="md:hidden text-gray-500 hover:text-gray-900 transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Icon name="Menu" size={22} />
            </button>
            <div className="flex-1">
              <div className="font-semibold text-gray-900 text-sm truncate">
                {tab === "chat" && activeChat?.title}
                {tab === "history" && "История чатов"}
                {tab === "profile" && "Личный кабинет"}
              </div>
              {tab === "chat" && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs text-gray-400">OxiwisAI онлайн</span>
                </div>
              )}
            </div>
            {tab === "chat" && (
              <button
                onClick={newChat}
                className="hidden md:flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100"
              >
                <Icon name="Plus" size={14} />
                Новый
              </button>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {/* CHAT TAB */}
            {tab === "chat" && (
              <div className="h-full flex flex-col">
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                  {activeChat?.messages.map((msg, i) => (
                    <div
                      key={msg.id}
                      className="animate-fade-in flex gap-3"
                      style={{ animationDelay: `${i * 0.03}s`, animationFillMode: "both" }}
                    >
                      {msg.role === "ai" && (
                        <img src={LOGO} alt="AI" className="w-7 h-7 rounded-lg object-cover shrink-0 mt-0.5" />
                      )}
                      <div className={`max-w-[78%] ${msg.role === "user" ? "ml-auto" : ""}`}>
                        <div
                          className={`px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap
                            ${msg.role === "user"
                              ? "bg-gray-900 text-white rounded-[18px_18px_4px_18px]"
                              : "bg-white text-gray-800 border border-gray-100 rounded-[18px_18px_18px_4px] shadow-sm"
                            }`}
                        >
                          {msg.text}
                        </div>
                        <div className={`text-xs text-gray-400 mt-1 ${msg.role === "user" ? "text-right" : "text-left"}`}>
                          {msg.time}
                        </div>
                      </div>
                      {msg.role === "user" && (
                        <div className="w-7 h-7 rounded-lg bg-gray-900 flex items-center justify-center shrink-0 mt-0.5 text-white text-xs font-bold">
                          {userInitial}
                        </div>
                      )}
                    </div>
                  ))}

                  {loading && (
                    <div className="animate-fade-in flex gap-3">
                      <img src={LOGO} alt="AI" className="w-7 h-7 rounded-lg object-cover shrink-0" />
                      <div className="bg-white border border-gray-100 shadow-sm px-4 py-3 rounded-[18px_18px_18px_4px]">
                        <div className="flex items-center gap-1.5">
                          <span className="typing-dot w-2 h-2 rounded-full bg-gray-400 inline-block" />
                          <span className="typing-dot w-2 h-2 rounded-full bg-gray-400 inline-block" />
                          <span className="typing-dot w-2 h-2 rounded-full bg-gray-400 inline-block" />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="px-4 py-3 topbar-bg border-t border-black/8">
                  <div className="chat-input-border rounded-2xl bg-white flex items-end gap-2 px-4 py-2 shadow-sm">
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKey}
                      placeholder="Напиши сообщение..."
                      rows={1}
                      className="flex-1 bg-transparent text-gray-800 placeholder-gray-300 text-sm resize-none outline-none py-1.5 max-h-32"
                      style={{ minHeight: "36px" }}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!input.trim() || loading}
                      className="send-btn w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mb-0.5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      <Icon name="Send" size={15} className="text-white" />
                    </button>
                  </div>
                  <div className="text-xs text-gray-300 text-center mt-2">Enter — отправить · Shift+Enter — новая строка</div>
                </div>
              </div>
            )}

            {/* HISTORY TAB */}
            {tab === "history" && (
              <div className="h-full overflow-y-auto p-4">
                <div className="max-w-2xl mx-auto">
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-1">История диалогов</h2>
                    <p className="text-sm text-gray-400">Все твои разговоры с OxiwisAI</p>
                  </div>
                  {chats.length === 0 ? (
                    <div className="text-center py-16 text-gray-300">
                      <Icon name="MessageSquare" size={40} className="mx-auto mb-3 opacity-30" />
                      <p>Нет сохранённых чатов</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {chats.map((chat, i) => (
                        <div
                          key={chat.id}
                          className="animate-slide-up"
                          style={{ animationDelay: `${i * 0.05}s`, animationFillMode: "both" }}
                        >
                          <div
                            onClick={() => { setActiveChatId(chat.id); setTab("chat"); }}
                            className="bg-white border border-gray-100 rounded-2xl p-4 cursor-pointer hover:border-gray-200 hover:shadow-md transition-all group"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center shrink-0">
                                  <Icon name="MessageCircle" size={18} className="text-white" />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold text-gray-900 truncate">{chat.title}</div>
                                  <div className="text-xs text-gray-400">{chat.createdAt} · {chat.messages.length} сообщений</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setActiveChatId(chat.id); setTab("chat"); }}
                                  className="text-xs text-gray-500 hover:text-gray-900 opacity-0 group-hover:opacity-100 transition-all px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100"
                                >
                                  Открыть
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }}
                                  className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all"
                                >
                                  <Icon name="Trash2" size={14} />
                                </button>
                              </div>
                            </div>
                            {chat.messages.length > 1 && (
                              <div className="mt-3 text-xs text-gray-400 truncate">
                                {chat.messages[chat.messages.length - 1].text.slice(0, 80)}…
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PROFILE TAB */}
            {tab === "profile" && (
              <div className="h-full overflow-y-auto p-4">
                <div className="max-w-2xl mx-auto">
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-1">Личный кабинет</h2>
                    <p className="text-sm text-gray-400">Настройки и статистика</p>
                  </div>

                  <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-4 animate-slide-up shadow-sm">
                    <div className="flex items-center gap-5">
                      <div className="relative">
                        <div className="w-16 h-16 rounded-2xl bg-gray-900 flex items-center justify-center text-white text-2xl font-black">
                          {userInitial}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-400 border-2 border-white" />
                      </div>
                      <div>
                        <div className="text-lg font-bold text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-400">{user.email}</div>
                        <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Активен
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[
                      { label: "Чатов", value: chats.length, icon: "MessageSquare" },
                      { label: "Сообщений", value: chats.reduce((s, c) => s + c.messages.length, 0), icon: "Zap" },
                      { label: "Дней", value: 1, icon: "Calendar" },
                    ].map((stat, i) => (
                      <div
                        key={stat.label}
                        className="bg-white border border-gray-100 rounded-2xl p-4 text-center animate-slide-up shadow-sm"
                        style={{ animationDelay: `${i * 0.08}s`, animationFillMode: "both" }}
                      >
                        <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center mx-auto mb-2">
                          <Icon name={stat.icon} size={15} className="text-white" />
                        </div>
                        <div className="text-2xl font-black text-gray-900">{stat.value}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-1 animate-slide-up shadow-sm" style={{ animationDelay: "0.2s", animationFillMode: "both" }}>
                    <div className="text-xs text-gray-400 px-2 mb-3 font-semibold uppercase tracking-wider">Действия</div>
                    {[
                      { icon: "Plus", label: "Создать новый чат", action: newChat },
                      { icon: "Clock", label: "Открыть историю", action: () => setTab("history") },
                      { icon: "LogOut", label: "Выйти из аккаунта", action: () => setUser(null) },
                    ].map((item) => (
                      <button
                        key={item.label}
                        onClick={item.action}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 text-gray-600 hover:text-gray-900 transition-all text-sm"
                      >
                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                          <Icon name={item.icon} size={15} />
                        </div>
                        {item.label}
                        <Icon name="ChevronRight" size={15} className="ml-auto text-gray-300" />
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 text-center text-xs text-gray-300">
                    OxiwisAI · Версия 2.0
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
