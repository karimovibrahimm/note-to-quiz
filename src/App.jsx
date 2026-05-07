import { useState } from "react";
import "./App.css";
import { GoogleGenAI } from "@google/genai";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const ai = new GoogleGenAI({
  apiKey: GEMINI_API_KEY,
});

function App() {
  const [notes, setNotes] = useState("");
  const [quiz, setQuiz] = useState([]);
  const [revealedAnswers, setRevealedAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toggleReveal = (index) => {
    setRevealedAnswers((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const parseQuiz = (text) => {
    try {
      return JSON.parse(text);
    } catch {
      const first = text.indexOf("[");
      const last = text.lastIndexOf("]");

      if (first !== -1 && last !== -1) {
        try {
          return JSON.parse(text.slice(first, last + 1));
        } catch {
          return null;
        }
      }

      return null;
    }
  };

  const handleGenerateQuiz = async () => {
    setError("");
    setQuiz([]);

    if (!notes.trim()) {
      setError("Paste your notes first.");
      return;
    }

    if (!GEMINI_API_KEY) {
      setError("Missing VITE_GEMINI_API_KEY in .env");
      return;
    }

    setLoading(true);

    try {
      const prompt = `
You are an expert tutor.

Read the student notes below and generate exactly 5 multiple-choice questions.

Rules:
- 4 answer choices each
- choices must be arrays
- correctIndex must be 0–3
- return ONLY valid JSON

Format:
[
  {
    "question": "...",
    "choices": ["...", "...", "...", "..."],
    "correctIndex": 0
  }
]

Student notes:
${notes.trim()}
`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      const content = response.text || "";
      const parsedQuiz = parseQuiz(content);

      if (!parsedQuiz || !Array.isArray(parsedQuiz)) {
        throw new Error("Failed to parse quiz JSON.");
      }

      setQuiz(parsedQuiz.slice(0, 5));
      setRevealedAnswers({});
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Note to Quiz</p>
          <h1>Paste your notes and generate a 5-question quiz.</h1>
        </div>
      </header>

      <section className="panel">
        <label htmlFor="notes" className="label">
          Student notes
        </label>

        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Paste your notes here..."
          rows={12}
        />

        <div className="controls">
          <button onClick={handleGenerateQuiz} disabled={loading}>
            {loading ? "Generating..." : "Generate Quiz"}
          </button>
        </div>

        {error && <div className="alert">{error}</div>}
      </section>

      {quiz.length > 0 && (
        <section className="results">
          <h2>Generated Quiz</h2>

          <div className="question-list">
            {quiz.map((item, index) => (
              <article key={index} className="question-card">
                <h3>
                  {index + 1}. {item.question}
                </h3>

                <button
                  type="button"
                  className="reveal-answer-button"
                  onClick={() => toggleReveal(index)}
                >
                  {revealedAnswers[index] ? "Hide answer" : "Show answer"}
                </button>

                <ol type="A">
                  {item.choices.map((choice, choiceIndex) => (
                    <li
                      key={choiceIndex}
                      className={
                        revealedAnswers[index] && item.correctIndex === choiceIndex
                          ? "choice correct"
                          : "choice"
                      }
                    >
                      {choice}
                    </li>
                  ))}
                </ol>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default App;