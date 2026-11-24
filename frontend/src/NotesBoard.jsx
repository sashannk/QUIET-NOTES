import { useEffect, useRef, useState } from "react";
import "./notes-board.css";

function splitTags(value) {
  return [...new Set(value.split(",").map((tag) => tag.trim()).filter(Boolean))];
}

export default function NotesBoard({ notes = [], view = "active", query = "", loading = false, message = "", onCreate, onUpdate, onPatch, onTrash, onRestore }) {
  const [draft, setDraft] = useState({ title: "", content: "", tags: "", color: "none" });
  const [editingId, setEditingId] = useState(null);
  const [saveState, setSaveState] = useState("idle");
  const [activeTag, setActiveTag] = useState("");
  const [focusMode, setFocusMode] = useState(false);
  const noteId = useRef(null);
  const session = useRef(0);
  const latestSave = useRef(0);
  const timer = useRef(null);
  const queue = useRef(Promise.resolve());

  useEffect(() => {
    function handleEscape(event) {
      if (event.key === "Escape") setFocusMode(false);
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  useEffect(() => {
    if (view !== "active" || !draft.title.trim()) {
      if (!draft.title.trim()) setSaveState("idle");
      return undefined;
    }

    const thisSession = session.current;
    const saveNumber = ++latestSave.current;
    const snapshot = { title: draft.title.trim(), content: draft.content, tags: splitTags(draft.tags), color: draft.color };
    setSaveState("pending");

    timer.current = window.setTimeout(() => {
      setSaveState("saving");
      queue.current = queue.current.catch(() => {}).then(async () => {
        const existingId = noteId.current;
        const result = existingId
          ? await onUpdate(existingId, snapshot)
          : await onCreate(snapshot);
        if (!result) throw new Error("Could not save this note");

        if (thisSession === session.current) {
          noteId.current = result._id;
          setEditingId(result._id);
          if (saveNumber === latestSave.current) setSaveState("saved");
        }
      }).catch(() => {
        if (thisSession === session.current && saveNumber === latestSave.current) setSaveState("error");
      });
    }, 700);

    return () => window.clearTimeout(timer.current);
  }, [draft, onCreate, onUpdate, view]);

  function newNote() {
    session.current += 1;
    latestSave.current += 1;
    noteId.current = null;
    setEditingId(null);
    setDraft({ title: "", content: "", tags: "", color: "none" });
    setSaveState("idle");
    setFocusMode(false);
  }

  function editNote(note) {
    session.current += 1;
    latestSave.current += 1;
    noteId.current = note._id;
    setEditingId(note._id);
    setDraft({ title: note.title, content: note.content || "", tags: (note.tags || []).join(", "), color: note.color || "none" });
    setSaveState("saved");
    setFocusMode(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function moveToTrash(note) {
    const moved = await onTrash(note._id);
    if (moved && noteId.current === note._id) newNote();
  }

  const saveLabel = saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : saveState === "pending" ? "Unsaved changes" : saveState === "error" ? "Save failed" : "Autosave on";
  const tags = [...new Set(notes.flatMap((note) => note.tags || []))].sort((a, b) => a.localeCompare(b));
  const searchText = query.trim().toLowerCase();
  const visibleNotes = notes.filter((note) => {
    const matchesText = !searchText || `${note.title} ${note.content} ${(note.tags || []).join(" ")}`.toLowerCase().includes(searchText);
    return matchesText && (!activeTag || (note.tags || []).includes(activeTag));
  });

  return (
    <div className={`notes-board ${focusMode ? "notes-board-focus" : ""}`}>
      {focusMode ? <div className="nb-focus-bar"><span>FOCUS MODE</span><span className={`save-indicator ${saveState}`}><i />{saveLabel}</span><button className="quiet-button" onClick={() => setFocusMode(false)}>Exit focus · Esc</button></div> : <>
        <div className="nb-heading">
          <div><p className="eyebrow"><span className="eyebrow-dot" /> YOUR PRIVATE SPACE</p><h1>{view === "active" ? <>Your thoughts,<br /><em>kept close.</em></> : view === "archived" ? <>Quietly<br /><em>saved away.</em></> : <>A little<br /><em>breathing room.</em></>}</h1></div>
          <span className="nb-count">{notes.length} {notes.length === 1 ? "NOTE" : "NOTES"}</span>
        </div>
        {view === "active" && <nav className="nb-tools"><button className="quiet-button" onClick={newNote}>＋ New note</button></nav>}
      </>}

      {view === "active" && <form className="note-editor nb-editor" onSubmit={(event) => event.preventDefault()}>
        {!focusMode && <div className="editor-heading"><span>{editingId ? "EDIT NOTE" : "A NEW NOTE"}</span><span className={`save-indicator ${saveState}`}><i />{saveLabel}</span></div>}
        <input className="note-title-input" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Give this note a title" aria-label="Note title" />
        <textarea value={draft.content} onChange={(event) => setDraft({ ...draft, content: event.target.value })} placeholder="Write whatever is on your mind…" rows="6" aria-label="Note text" />
        {!focusMode && <>
          <label className="tag-entry">Tags<input value={draft.tags} onChange={(event) => setDraft({ ...draft, tags: event.target.value })} placeholder="Ideas, personal, work — separate with commas" /></label>
          <div className="editor-actions"><span className="autosave-help">{saveState === "idle" ? "Add a title to start autosaving" : "Changes save automatically"}</span><button className="quiet-button" type="button" onClick={() => setFocusMode(true)}>Focus mode ⤢</button></div>
        </>}
        {message && <p className="message error" role="status">{message}</p>}
      </form>}

      {!focusMode && <>
        <div className="notes-list-heading"><h2>{view === "active" ? "Your notes" : view === "archived" ? "Archive" : "Trash"}</h2><span>{view === "trash" ? "RESTORE NOTES ANYTIME" : "PRIVATE TO YOUR ACCOUNT"}</span></div>
        {tags.length > 0 && <div className="tag-filters"><button className={!activeTag ? "selected" : ""} onClick={() => setActiveTag("")}>All tags</button>{tags.map((tag) => <button key={tag} className={activeTag === tag ? "selected" : ""} onClick={() => setActiveTag(activeTag === tag ? "" : tag)}>#{tag}</button>)}</div>}
        {loading ? <div className="empty-notes">Loading your notes…</div> : visibleNotes.length ? <div className="note-grid">
          {visibleNotes.map((note) => <article className={`note-card ${note.isPinned ? "pinned" : ""} nb-c-${note.color || "none"}`} key={note._id}>
            <div className="note-card-top"><span>{note.isPinned ? "PINNED · " : "NOTE · "}{new Date(note.updatedAt).toLocaleDateString()}</span><span className="note-flower">✳</span></div>
            <h3>{note.title}</h3>
            <p className="note-content">{note.content || "No extra details."}</p>
            {!!note.tags?.length && <div className="note-tags">{note.tags.map((tag) => <button key={tag} onClick={() => setActiveTag(tag)}>#{tag}</button>)}</div>}
            {note.isShared && <span className="nb-shared">SHARED WITH COMMUNITY</span>}
            <div className="note-actions">
              {view === "trash" ? <button onClick={() => onRestore(note._id)}>Restore</button> : <>
                <button onClick={() => editNote(note)}>Edit</button>
                <button onClick={() => onPatch(note._id, { isPinned: !note.isPinned })}>{note.isPinned ? "Unpin" : "Pin"}</button>
                {view === "active" && <button onClick={() => onPatch(note._id, { isShared: !note.isShared })}>{note.isShared ? "Unshare" : "Share"}</button>}
                <button onClick={() => onPatch(note._id, { isArchived: !note.isArchived })}>{note.isArchived ? "Unarchive" : "Archive"}</button>
                <button onClick={() => moveToTrash(note)}>Trash</button>
              </>}
            </div>
          </article>)}
        </div> : <div className="empty-notes"><span>✳</span><p>{searchText || activeTag ? "No notes match this search or tag." : view === "trash" ? "Trash is empty." : view === "archived" ? "No archived notes yet." : "Nothing here just yet. Your first note can start above."}</p></div>}
      </>}
    </div>
  );
}
