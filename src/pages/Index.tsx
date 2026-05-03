import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";

type Message = {
  id: string;
  role: "user" | "ai";
  text: string;
  time: string;
};

type Chat = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
};

type Tab = "chat" | "history" | "profile";

const WELCOME_MSG: Message = {
  id: "welcome",
  role: "ai",
  text: "Привет! Я OxiwisAI — твой умный помощник. Задай любой вопрос, и я постараюсь помочь 🚀",
  time: new Date().toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" }),
};

function nowTime() {
  return new Date().toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
}

function nowDate() {
  return new Date().toLocaleDateString("ru", { day: "numeric", month: "long" });
}

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function Index() {
  const [tab, setTab] = useState<Tab>("chat");
  const [chats, setChats] = useState<Chat[]>([
    { id: "default", title: "Новый чат", messages: [WELCOME_MSG], createdAt: nowDate() },
  ]);
  const [activeChatId, setActiveChatId] = useState("default");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeChat = chats.find((c) => c.id === activeChatId)!;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages, loading]);

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
        const nc: Chat = {
          id: genId(),
          title: "Новый чат",
          messages: [{ ...WELCOME_MSG, id: genId(), time: nowTime() }],
          createdAt: nowDate(),
        };
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
        return {
          ...c,
          title: isFirstReal ? text.slice(0, 36) : c.title,
          messages: [...c.messages, userMsg],
        };
      })
    );

    setLoading(true);
    try {
      const history = activeChat.messages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.text }));

      const res = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer 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`,
        },
        body: JSON.stringify({
          model: "grok-3-mini",
          messages: [
            {
              role: "system",
              content:
                "Ты OxiwisAI — умный и дружелюбный ИИ-ассистент. Отвечай кратко, по делу, на русском языке. Можешь использовать эмодзи для выразительности.",
            },
            ...history,
            { role: "user", content: text },
          ],
        }),
      });

      const data = await res.json();
      const aiText =
        data.choices?.[0]?.message?.content || "Не удалось получить ответ. Попробуй ещё раз.";

      const aiMsg: Message = { id: genId(), role: "ai", text: aiText, time: nowTime() };
      setChats((prev) =>
        prev.map((c) =>
          c.id === activeChatId ? { ...c, messages: [...c.messages, aiMsg] } : c
        )
      );
    } catch {
      const errMsg: Message = {
        id: genId(),
        role: "ai",
        text: "Ошибка подключения. Проверь интернет и попробуй снова.",
        time: nowTime(),
      };
      setChats((prev) =>
        prev.map((c) =>
          c.id === activeChatId ? { ...c, messages: [...c.messages, errMsg] } : c
        )
      );
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="bg-animated h-screen w-screen flex flex-col overflow-hidden" style={{ fontFamily: "'Golos Text', sans-serif" }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/60 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="flex h-full w-full relative z-10">
        {/* Sidebar */}
        <aside
          className={`
            fixed md:relative z-30 md:z-auto
            h-full w-72 flex flex-col
            glass-strong border-r border-white/8
            transition-transform duration-300 ease-in-out
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          `}
        >
          {/* Logo */}
          <div className="p-5 border-b border-white/8">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl btn-gradient flex items-center justify-center animate-pulse-glow relative">
                <span className="relative z-10 text-white font-black text-sm">OX</span>
              </div>
              <div>
                <div className="font-bold text-white text-base leading-tight gradient-text">OxiwisAI</div>
                <div className="text-xs text-white/40">Умный помощник</div>
              </div>
            </div>
          </div>

          {/* New chat */}
          <div className="p-3">
            <button
              onClick={newChat}
              className="btn-gradient w-full flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-white text-sm font-semibold"
            >
              <Icon name="Plus" size={16} />
              <span className="relative z-10">Новый чат</span>
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
                className={`nav-item w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium mb-1 transition-all
                  ${tab === item.id ? "active bg-purple-500/15 text-purple-300" : "text-white/50 hover:text-white/80 hover:bg-white/5"}`}
              >
                <Icon name={item.icon} size={17} />
                {item.label}
              </button>
            ))}
          </nav>

          {/* Chat list */}
          <div className="flex-1 overflow-y-auto px-3 py-1">
            <div className="text-xs text-white/30 px-2 mb-2 font-semibold uppercase tracking-wider">Чаты</div>
            {chats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => { setActiveChatId(chat.id); setTab("chat"); setSidebarOpen(false); }}
                className={`chat-item group flex items-center gap-2 px-3 py-2.5 rounded-xl mb-1 border border-transparent
                  ${chat.id === activeChatId ? "active" : ""}`}
              >
                <Icon name="MessageCircle" size={15} className="text-purple-400/70 shrink-0" />
                <span className="text-sm text-white/70 truncate flex-1">{chat.title}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-all"
                >
                  <Icon name="Trash2" size={13} />
                </button>
              </div>
            ))}
          </div>

          {/* Bottom */}
          <div className="p-3 border-t border-white/8">
            <div className="flex items-center gap-3 px-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                U
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white/80 font-medium truncate">Пользователь</div>
                <div className="text-xs text-white/35">Базовый план</div>
              </div>
              <button onClick={() => setTab("profile")} className="text-white/30 hover:text-white/70 transition-colors">
                <Icon name="Settings" size={16} />
              </button>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 flex flex-col min-w-0 h-full">
          {/* Top bar */}
          <div className="glass border-b border-white/8 px-4 py-3 flex items-center gap-3 shrink-0">
            <button
              className="md:hidden text-white/60 hover:text-white transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Icon name="Menu" size={22} />
            </button>
            <div className="flex-1">
              <div className="font-semibold text-white/90 text-sm truncate">
                {tab === "chat" && activeChat?.title}
                {tab === "history" && "История чатов"}
                {tab === "profile" && "Личный кабинет"}
              </div>
              {tab === "chat" && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs text-white/40">OxiwisAI онлайн</span>
                </div>
              )}
            </div>
            {tab === "chat" && (
              <button
                onClick={newChat}
                className="hidden md:flex items-center gap-1.5 text-xs text-white/50 hover:text-purple-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-purple-500/10"
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
                        <div className="w-7 h-7 rounded-lg btn-gradient flex items-center justify-center shrink-0 mt-0.5">
                          <span className="relative z-10 text-white font-black text-[10px]">OX</span>
                        </div>
                      )}
                      <div className={`max-w-[78%] ${msg.role === "user" ? "ml-auto" : ""}`}>
                        <div
                          className={`px-4 py-3 text-sm leading-relaxed text-white whitespace-pre-wrap
                            ${msg.role === "user" ? "msg-user" : "msg-ai"}`}
                        >
                          {msg.text}
                        </div>
                        <div className={`text-xs text-white/25 mt-1 ${msg.role === "user" ? "text-right" : "text-left"}`}>
                          {msg.time}
                        </div>
                      </div>
                      {msg.role === "user" && (
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center shrink-0 mt-0.5">
                          <Icon name="User" size={12} className="text-white" />
                        </div>
                      )}
                    </div>
                  ))}

                  {loading && (
                    <div className="animate-fade-in flex gap-3">
                      <div className="w-7 h-7 rounded-lg btn-gradient flex items-center justify-center shrink-0">
                        <span className="relative z-10 text-white font-black text-[10px]">OX</span>
                      </div>
                      <div className="msg-ai px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="typing-dot w-2 h-2 rounded-full bg-purple-400 inline-block" />
                          <span className="typing-dot w-2 h-2 rounded-full bg-purple-400 inline-block" />
                          <span className="typing-dot w-2 h-2 rounded-full bg-purple-400 inline-block" />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="px-4 py-3 glass border-t border-white/8">
                  <div className="neon-border rounded-2xl bg-white/4 flex items-end gap-2 px-4 py-2">
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKey}
                      placeholder="Напиши сообщение..."
                      rows={1}
                      className="flex-1 bg-transparent text-white/90 placeholder-white/25 text-sm resize-none outline-none py-1.5 max-h-32"
                      style={{ minHeight: "36px" }}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!input.trim() || loading}
                      className="btn-gradient w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mb-0.5 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      <Icon name="Send" size={15} className="relative z-10 text-white" />
                    </button>
                  </div>
                  <div className="text-xs text-white/20 text-center mt-2">Enter — отправить · Shift+Enter — новая строка</div>
                </div>
              </div>
            )}

            {/* HISTORY TAB */}
            {tab === "history" && (
              <div className="h-full overflow-y-auto p-4">
                <div className="max-w-2xl mx-auto">
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-white mb-1">История диалогов</h2>
                    <p className="text-sm text-white/40">Все твои разговоры с OxiwisAI</p>
                  </div>

                  {chats.length === 0 ? (
                    <div className="text-center py-16 text-white/30">
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
                            className="glass neon-border rounded-2xl p-4 cursor-pointer hover:bg-white/6 transition-all group"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-xl btn-gradient flex items-center justify-center shrink-0">
                                  <Icon name="MessageCircle" size={18} className="relative z-10 text-white" />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold text-white/90 truncate">{chat.title}</div>
                                  <div className="text-xs text-white/35 mt-0.5">{chat.createdAt} · {chat.messages.length} сообщений</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setActiveChatId(chat.id); setTab("chat"); }}
                                  className="text-xs text-purple-400 hover:text-purple-300 opacity-0 group-hover:opacity-100 transition-all px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20"
                                >
                                  Открыть
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }}
                                  className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-all"
                                >
                                  <Icon name="Trash2" size={14} />
                                </button>
                              </div>
                            </div>
                            {chat.messages.length > 1 && (
                              <div className="mt-3 text-xs text-white/30 truncate pl-13">
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
                    <h2 className="text-xl font-bold text-white mb-1">Личный кабинет</h2>
                    <p className="text-sm text-white/40">Настройки и статистика</p>
                  </div>

                  {/* Avatar card */}
                  <div className="glass neon-border rounded-2xl p-6 mb-4 animate-slide-up">
                    <div className="flex items-center gap-5">
                      <div className="relative">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-2xl font-black">
                          U
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-400 border-2 border-[#0a0a14]" />
                      </div>
                      <div>
                        <div className="text-lg font-bold text-white">Пользователь</div>
                        <div className="text-sm text-white/40">Базовый план · Активен</div>
                        <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-purple-500/15 text-purple-300 border border-purple-500/25">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                          Бесплатный
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[
                      { label: "Чатов", value: chats.length, icon: "MessageSquare" },
                      { label: "Сообщений", value: chats.reduce((s, c) => s + c.messages.length, 0), icon: "Zap" },
                      { label: "Дней", value: 1, icon: "Calendar" },
                    ].map((stat, i) => (
                      <div
                        key={stat.label}
                        className="glass neon-border rounded-2xl p-4 text-center animate-slide-up"
                        style={{ animationDelay: `${i * 0.08}s`, animationFillMode: "both" }}
                      >
                        <div className="w-8 h-8 rounded-lg btn-gradient flex items-center justify-center mx-auto mb-2">
                          <Icon name={stat.icon} size={15} className="relative z-10 text-white" />
                        </div>
                        <div className="text-2xl font-black gradient-text">{stat.value}</div>
                        <div className="text-xs text-white/40 mt-0.5">{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Settings */}
                  <div className="glass neon-border rounded-2xl p-4 space-y-1 animate-slide-up" style={{ animationDelay: "0.2s", animationFillMode: "both" }}>
                    <div className="text-xs text-white/30 px-2 mb-3 font-semibold uppercase tracking-wider">Действия</div>
                    {[
                      { icon: "Plus", label: "Создать новый чат", action: newChat },
                      { icon: "Clock", label: "Открыть историю", action: () => setTab("history") },
                    ].map((item) => (
                      <button
                        key={item.label}
                        onClick={item.action}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 text-white/70 hover:text-white transition-all text-sm"
                      >
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                          <Icon name={item.icon} size={15} />
                        </div>
                        {item.label}
                        <Icon name="ChevronRight" size={15} className="ml-auto text-white/20" />
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 text-center text-xs text-white/20">
                    OxiwisAI · Версия 1.0 · Powered by Grok
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