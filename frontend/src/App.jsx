import { useCallback, useEffect, useRef, useState } from "react";
import CommunityFeed from "./CommunityFeed.jsx";
import NotesBoard from "./NotesBoard.jsx";

async function readApiResponse(response) {
  const body = await response.text();
  if (!body) throw new Error(`The server returned an empty response (HTTP ${response.status}).`);
  try {
    return JSON.parse(body);
  } catch {
    throw new Error(`The server returned an unexpected response (HTTP ${response.status}).`);
  }
}

async function api(path, options = {}) {
  const token = localStorage.getItem("token");
  const response = await fetch(path, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });
  const result = await readApiResponse(response);
  if (!response.ok) throw new Error(result.msg || "Something went wrong");
  return result;
}

export default function App() {
  const [mode, setMode] = useState("register");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loggedInName, setLoggedInName] = useState(localStorage.getItem("userName") || "");

  const [notes, setNotes] = useState([]);
  const [communityNotes, setCommunityNotes] = useState([]);
  const [communityLoading, setCommunityLoading] = useState(false);
  const [view, setView] = useState("active");
  const [noteMessage, setNoteMessage] = useState("");
  const [search, setSearch] = useState("");
  const [loadingNotes, setLoadingNotes] = useState(false);
  const searchRef = useRef(null);

  const loadNotes = useCallback(async (targetView = view) => {
    setLoadingNotes(true);
    try {
      setNotes(await api(`/notes?view=${targetView}`));
    } finally {
      setLoadingNotes(false);
    }
  }, [view]);

  const refreshCommunity = useCallback(async () => {
    if (!localStorage.getItem("token")) return;
    setCommunityLoading(true);
    try {
      setCommunityNotes(await api("/community"));
    } finally {
      setCommunityLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!localStorage.getItem("token") || !loggedInName || view === "community") return;
    setNotes([]);
    loadNotes(view).catch((error) => {
      localStorage.removeItem("token");
      localStorage.removeItem("userName");
      setLoggedInName("");
      setIsError(true);
      setMessage(error.message);
    });
  }, [loadNotes, loggedInName, view]);

  useEffect(() => {
    if (loggedInName && view === "community") {
      refreshCommunity().catch((error) => setNoteMessage(error.message));
    }
  }, [loggedInName, refreshCommunity, view]);

  useEffect(() => {
    function handleKeys(event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (loggedInName) searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeys);
    return () => window.removeEventListener("keydown", handleKeys);
  }, [loggedInName]);

  useEffect(() => {
    if (!noteMessage) return undefined;
    const timer = window.setTimeout(() => setNoteMessage(""), 4000);
    return () => window.clearTimeout(timer);
  }, [noteMessage]);

  function changeMode(nextMode) {
    setMode(nextMode);
    setMessage("");
    setIsError(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setIsError(false);
    try {
      const response = await fetch(`/user/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const result = await readApiResponse(response);
      if (!response.ok) throw new Error(result.msg || "Something went wrong");
      if (mode === "login") {
        localStorage.setItem("token", result.token);
        localStorage.setItem("userName", result.name);
        setLoggedInName(result.name);
      } else {
        setForm({ name: "", email: "", password: "" });
        setMessage(`${result.msg}. You can now log in.`);
      }
    } catch (error) {
      setIsError(true);
      setMessage(error.message === "Failed to fetch"
        ? "Could not reach the server. Make sure the backend is running and connected to Atlas."
        : error.message);
    } finally {
      setLoading(false);
    }
  }

  const createNote = useCallback(async (data) => {
    try {
      const result = await api("/notes", { method: "POST", body: JSON.stringify(data) });
      setNotes((current) => [result, ...current.filter((note) => note._id !== result._id)]);
      return result;
    } catch (error) {
      setNoteMessage(error.message);
      return null;
    }
  }, []);

  const updateNote = useCallback(async (id, data) => {
    try {
      const result = await api(`/notes/${id}`, { method: "PUT", body: JSON.stringify(data) });
      setNotes((current) => current.map((note) => note._id === id ? result : note));
      return result;
    } catch (error) {
      setNoteMessage(error.message);
      return null;
    }
  }, []);

  const patchNote = useCallback(async (id, changes) => {
    try {
      const result = await api(`/notes/${id}`, { method: "PATCH", body: JSON.stringify(changes) });
      const leavesView = "isArchived" in changes || "isTrashed" in changes;
      setNotes((current) => leavesView
        ? current.filter((note) => note._id !== id)
        : current.map((note) => note._id === id ? result : note));
      if ("isArchived" in changes) setNoteMessage(changes.isArchived ? "Archived note." : "Moved back to notes.");
      if ("isShared" in changes) setNoteMessage(changes.isShared ? "Note shared with the community." : "Note is private again.");
      return result;
    } catch (error) {
      setNoteMessage(error.message);
      return null;
    }
  }, []);

  const trashNote = useCallback(async (id) => {
    try {
      await api(`/notes/${id}`, { method: "DELETE" });
      setNotes((current) => current.filter((note) => note._id !== id));
      setNoteMessage("Moved to trash. You can restore it from Trash.");
      return true;
    } catch (error) {
      setNoteMessage(error.message);
      return false;
    }
  }, []);

  const restoreNote = useCallback(async (id) => {
    try {
      const result = await api(`/notes/${id}/restore`, { method: "POST" });
      setNotes((current) => {
        const remaining = current.filter((note) => note._id !== id);
        const belongsHere = view === "archived" ? result.isArchived : view === "active" ? !result.isArchived : false;
        return belongsHere ? [result, ...remaining] : remaining;
      });
      setNoteMessage("Note restored. Open Notes or Archive to view it.");
      return true;
    } catch (error) {
      setNoteMessage(error.message);
      return false;
    }
  }, [view]);

  async function saveCommunityCopy(copy) {
    const result = await api("/notes", { method: "POST", body: JSON.stringify(copy) });
    setNotes((current) => [result, ...current]);
    setView("active");
    return result;
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("userName");
    setLoggedInName("");
    setNotes([]);
    setView("active");
  }

  if (!loggedInName) {
    return (
      <main className="page-shell auth-shell">
        <header className="topbar"><a className="brand" href="#home"><span className="brand-mark">q.</span><span>quiet notes</span></a><span className="top-note">A little space for your thoughts</span></header>
        <section className="hero" id="home">
          <div className="hero-copy">
            <p className="eyebrow"><span className="eyebrow-dot" /> YOUR SPACE, YOUR PACE</p>
            <h1>Make room<br />for <em>what matters.</em></h1>
            <p className="intro">A calm place to collect your thoughts.<br />Pick up right where you left off.</p>
            <div className="hero-ornaments"><span className="scribble" aria-hidden="true">✳</span><p className="side-caption">small thoughts<br />make a big picture</p></div>
          </div>
          <div className="auth-card">
            <div className="card-topline"><span>GET STARTED</span><span>01 — 02</span></div>
            <h2>{mode === "register" ? <>Create your<br /><em>quiet corner.</em></> : <>Good to see<br /><em>you again.</em></>}</h2>
            <p className="card-description">{mode === "register" ? "Start with the basics. Your notes are waiting." : "Sign in to return to your space."}</p>
            <div className="tabs" role="tablist" aria-label="Account action">
              <button className={mode === "register" ? "active" : ""} onClick={() => changeMode("register")} role="tab" aria-selected={mode === "register"}>Sign up</button>
              <button className={mode === "login" ? "active" : ""} onClick={() => changeMode("login")} role="tab" aria-selected={mode === "login"}>Log in</button>
            </div>
            <form onSubmit={handleSubmit}>
              {mode === "register" && <label>Your name<input autoComplete="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="What should we call you?" required /></label>}
              <label>Email address<input type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@example.com" required /></label>
              <label>Password<span className="password-control"><input type={showPassword ? "text" : "password"} autoComplete={mode === "register" ? "new-password" : "current-password"} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="At least 6 characters" minLength="6" required /><button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? "Hide" : "Show"}</button></span></label>
              <button className="submit-button" type="submit" disabled={loading}>{loading ? "Please wait…" : mode === "register" ? "Create account" : "Log in"}<span>↗</span></button>
            </form>
            {message && <p className={`message ${isError ? "error" : "success"}`} role="status">{message}</p>}
            <p className="privacy-note"><span>✳</span> Your password is encrypted before it’s saved.</p>
          </div>
        </section>
        <footer className="footer"><span>© 2026 QUIET NOTES</span><span>MADE FOR YOUR EVERYDAY</span></footer>
      </main>
    );
  }

  return (
    <main className="page-shell notes-shell">
      <header className="topbar notes-topbar">
        <a className="brand" href="#home"><span className="brand-mark">q.</span><span>quiet notes</span></a>
        <div className="toolbar-search"><span>⌕</span><input ref={searchRef} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search notes" aria-label="Search notes" /><kbd>Ctrl / ⌘ K</kbd></div>
        <div className="user-tools"><span className="top-note">{loggedInName}</span><button className="logout-button" onClick={logout}>Log out</button></div>
      </header>
      <section className="notes-page">
        <nav className="view-tabs" aria-label="Note folders">
          {[ ["active", "Notes"], ["archived", "Archive"], ["trash", "Trash"], ["community", "Community"] ].map(([key, label]) => <button key={key} className={view === key ? "selected" : ""} onClick={() => setView(key)}>{label}</button>)}
        </nav>
        {view === "community" ? <CommunityFeed notes={communityNotes} loading={communityLoading} query={search} onRefresh={refreshCommunity} onSaveCopy={saveCommunityCopy} /> : <NotesBoard notes={notes} view={view} query={search} loading={loadingNotes} message={noteMessage} onCreate={createNote} onUpdate={updateNote} onPatch={patchNote} onTrash={trashNote} onRestore={restoreNote} />}
      </section>
      <footer className="footer"><span>© 2026 QUIET NOTES</span><span>YOUR NOTES, YOURS ALONE</span></footer>
    </main>
  );
}
