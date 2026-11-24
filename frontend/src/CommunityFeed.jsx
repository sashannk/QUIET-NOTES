import { useMemo, useState } from "react";
import "./community.css";

export default function CommunityFeed({ notes = [], loading = false, query = "", onRefresh, onSaveCopy }) {
  const [activeTag, setActiveTag] = useState(null);
  const [open, setOpen] = useState(null);
  const [copied, setCopied] = useState(null);
  const [error, setError] = useState("");

  const tags = useMemo(() => {
    const counts = {};
    notes.forEach((note) => (note.tags || []).forEach((tag) => { counts[tag] = (counts[tag] || 0) + 1; }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 12);
  }, [notes]);

  const list = useMemo(() => {
    const searchText = query.trim().toLowerCase();
    return notes.filter((note) =>
      (!activeTag || (note.tags || []).includes(activeTag)) &&
      (!searchText || [note.title, note.content, note.author?.name, ...(note.tags || [])].join(" ").toLowerCase().includes(searchText))
    );
  }, [notes, query, activeTag]);

  function initials(name = "?") {
    return name.trim().split(/\s+/).map((word) => word[0]).slice(0, 2).join("").toUpperCase();
  }

  async function saveCopy(note) {
    if (!onSaveCopy) return;
    setError("");
    try {
      await onSaveCopy({ title: note.title, content: note.content, tags: note.tags || [], color: note.color || "none" });
      setCopied(note._id);
      window.setTimeout(() => setCopied(null), 2000);
    } catch (saveError) {
      setError(saveError.message);
    }
  }

  return (
    <section className="qn-board">
      <div className="qn-greeting">
        <span className="qn-mono">COMMUNITY</span>
        <h1>Notes people chose to <em>share.</em></h1>
        <p className="qn-hint">Only notes marked “Shared” by their author appear here. Everything else stays private.</p>
      </div>

      <div className="qn-toolbar">
        <div className="qn-tagbar">
          <button className={`qn-chip filter ${!activeTag ? "on" : ""}`} onClick={() => setActiveTag(null)}>All</button>
          {tags.map(([tag, count]) => <button key={tag} className={`qn-chip filter ${activeTag === tag ? "on" : ""}`} onClick={() => setActiveTag(activeTag === tag ? null : tag)}>#{tag}<small>{count}</small></button>)}
        </div>
        <button className="qn-ghost" onClick={onRefresh} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</button>
      </div>

      {error && <p className="qn-error" role="status">{error}</p>}
      {!loading && list.length === 0 && <div className="qn-empty"><div className="qn-empty-mark">q.</div><h2>Nothing shared <em>yet.</em></h2><p>When someone marks a note as Shared, it shows up here.</p></div>}

      <div className="qn-grid">
        {list.map((note) => <article key={note._id} className={`qn-card qn-c-${note.color || "none"}`} onClick={() => setOpen(note)}>
          <div className="qn-author"><span className="qn-avatar">{initials(note.author?.name)}</span><span>{note.author?.name || "Anonymous"}</span></div>
          <h3>{note.title || "Untitled"}</h3>
          <p>{note.content}</p>
          <footer><div className="qn-card-tags">{(note.tags || []).slice(0, 3).map((tag) => <span key={tag} className="qn-chip sm">#{tag}</span>)}</div><time className="qn-mono">{note.updatedAt ? new Date(note.updatedAt).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : ""}</time></footer>
        </article>)}
      </div>

      {open && <div className="qn-overlay" onMouseDown={(event) => event.target === event.currentTarget && setOpen(null)}>
        <div className={`qn-modal qn-c-${open.color || "none"}`} role="dialog" aria-modal="true" aria-label={open.title || "Shared note"}>
          <div className="qn-modal-top"><div className="qn-author"><span className="qn-avatar">{initials(open.author?.name)}</span>{open.author?.name || "Anonymous"}</div><div className="qn-modal-actions">
            {onSaveCopy && <button className="qn-primary" onClick={() => saveCopy(open)}>{copied === open._id ? "Saved to your notes ✓" : "Save a copy"}</button>}
            <button className="qn-ghost" onClick={() => setOpen(null)}>Close ×</button>
          </div></div>
          <h2 className="qn-read-title">{open.title || "Untitled"}</h2>
          <div className="qn-read-body">{open.content}</div>
          <div className="qn-card-tags qn-modal-tags">{(open.tags || []).map((tag) => <span key={tag} className="qn-chip sm">#{tag}</span>)}</div>
        </div>
      </div>}
    </section>
  );
}
