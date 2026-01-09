import React, { useState } from "react";
import { api } from "../../api/http";
import "./Chatbot.css";

export default function Chatbot({
  isOpen,
  onClose,
  coin,
  sentiment,
  timeframe,
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  /* -----------------------------
     Send user message
  ----------------------------- */
  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userText = input;

    setMessages((prev) => [...prev, { role: "user", text: userText }]);
    setInput("");
    setLoading(true);

    try {
      const context = {
        coin,
        timeframe,
        overall_score: sentiment?.overall?.score ?? 0,
        overall_label: sentiment?.overall?.label ?? "Neutral",
        by_source: sentiment?.by_source ?? {},
      };

      const res = await api.post("/api/chatbot", {
        message: userText,
        context,
      });

      setMessages((prev) => [
        ...prev,
        { role: "bot", text: res.data.reply },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: "Sorry, I couldn’t process that right now.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  /* -----------------------------
     Preset suggestion handler
  ----------------------------- */
  const sendPreset = (text) => {
    setInput(text);
    setTimeout(sendMessage, 0);
  };

  /* -----------------------------
     Do not render if closed
  ----------------------------- */
  if (!isOpen) return null;

  return (
    <div className="chatbot-container">
      {/* Header */}
      <div className="chatbot-header">
        <div>
          <div className="chatbot-title">CryptoGrok</div>
          <div className="chatbot-subtitle">AI Market Assistant</div>
        </div>
        <button className="chatbot-close" onClick={onClose}>
          ✕
        </button>
      </div>

      {/* Suggestions (only when empty) */}
      {messages.length === 0 && !loading && (
        <div className="chat-suggestions">
          <button
            className="chat-suggestion"
            onClick={() => sendPreset("Explain today’s market")}
          >
            Explain today’s market
          </button>

          <button
            className="chat-suggestion"
            onClick={() =>
              sendPreset(`What is the ${coin} sentiment today?`)
            }
          >
            {coin} sentiment today
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={`chat-bubble ${m.role}`}>
            {m.text.split("\n").map((line, idx) => (
              <p key={idx}>{line}</p>
            ))}
          </div>
        ))}

        {loading && (
          <div className="chat-bubble bot thinking">
            CryptoGrok is thinking…
          </div>
        )}
      </div>

      {/* Input */}
      <div className="chat-input">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask about ${coin} sentiment…`}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button onClick={sendMessage} disabled={loading}>
          Send
        </button>
      </div>
    </div>
  );
}
