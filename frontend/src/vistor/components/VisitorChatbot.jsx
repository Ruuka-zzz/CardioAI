import { useState } from "react";
import { api } from "../../shared/api/client";
import Button from "../../shared/components/Button";

/**
 * Public chatbot. No auth, no patient data.
 *
 * When the backend marks a reply `redirected`, its intent gate caught the
 * question before retrieval — the reply is a routing message, not an answer
 * from the knowledge base. That difference is shown, not smoothed over: a
 * visitor must be able to tell "here's what the CDC says" apart from "please
 * call emergency services".
 */
export default function VisitorChatbot() {
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async (event) => {
    event.preventDefault();

    const text = question.trim();
    if (!text) {
      setError("Type a question first.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const reply = await api.ask(text);
      setTurns((prev) => [...prev, { question: text, reply }]);
      setQuestion("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <p className="eyebrow">Heart health questions</p>
      <h2>Ask anything general</h2>
      <p className="lede">
        General information only, drawn from the CDC, the American Heart
        Association, the WHO and MedlinePlus. This assistant can't look at your
        symptoms or tell you whether you have a condition.
      </p>

      {turns.length > 0 && (
        <ol className="stack" style={{ marginBottom: "1.5rem" }}>
          {turns.map(({ question: asked, reply }, i) => (
            <li key={i}>
              <p style={{ fontWeight: 500, marginBottom: "0.5rem" }}>{asked}</p>

              {reply.redirected ? (
                <p className="alert" role="alert" style={{ marginBottom: "0.5rem" }}>
                  {reply.answer}
                </p>
              ) : (
                <p style={{ marginBottom: "0.5rem" }}>{reply.answer}</p>
              )}

              {(reply.sources ?? []).length > 0 && (
                <p className="disclaimer" style={{ marginBottom: 0 }}>
                  Sources:{" "}
                  {reply.sources.map((url, j) => (
                    <span key={url}>
                      {j > 0 && ", "}
                      <a href={url} target="_blank" rel="noreferrer">
                        {hostOf(url)}
                      </a>
                    </span>
                  ))}
                </p>
              )}
            </li>
          ))}
        </ol>
      )}

      <form onSubmit={send} noValidate>
        <div className="field">
          <label className="field__label" htmlFor="chat-question">
            Your question
          </label>
          <input
            id="chat-question"
            className="field__control"
            value={question}
            onChange={(e) => {
              setQuestion(e.target.value);
              setError("");
            }}
            placeholder="What raises the risk of heart disease?"
            aria-invalid={error ? "true" : undefined}
          />
          {error && (
            <span className="field__error" role="alert">
              {error}
            </span>
          )}
        </div>

        <Button type="submit" busy={busy} busyLabel="Looking it up…">
          Ask
        </Button>
      </form>
    </div>
  );
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}