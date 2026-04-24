import { useEffect, useState, useCallback, useRef, useMemo } from "react";

const FONT_OPTIONS = [
  { label: "Georgia",         value: "Georgia, serif" },
  { label: "Merriweather",    value: "'Merriweather', serif" },
  { label: "Palatino",        value: "'Palatino Linotype', Palatino, serif" },
  { label: "Source Serif",    value: "'Source Serif 4', serif" },
  { label: "Lato",            value: "'Lato', sans-serif" },
  { label: "Open Sans",       value: "'Open Sans', sans-serif" },
];
import { useParams, Link, useLocation } from "wouter";
import { useEditor, EditorContent } from "@tiptap/react";
import { Node, mergeAttributes } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { Navbar } from "../../components/Navbar";
import { ThemeToggle } from "../../components/ThemeToggle";
import { authClient } from "../../lib/auth";


/**
 * Custom Tiptap node: PageBreak
 * Renders as a visible "— Page Break —" bar in the editor.
 * Serialises to <div class="page-break"> in HTML, which the PDF
 * renderer treats as a forced page boundary.
 */
const PageBreak = Node.create({
  name: "pageBreak",
  group: "block",
  atom: true, // not editable inside
  parseHTML() {
    return [{ tag: 'div[class="page-break"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        class: "page-break",
        style: "page-break-after:always; display:flex; align-items:center; gap:8px; margin:1.5em 0; color:#e85d26; font-size:11px; font-family:sans-serif; user-select:none; pointer-events:none;",
      }),
      ["span", { style: "flex:1; height:1px; background:#e85d26; opacity:0.4; display:block;" }],
      ["span", { style: "white-space:nowrap; opacity:0.7;" }, "— Page Break —"],
      ["span", { style: "flex:1; height:1px; background:#e85d26; opacity:0.4; display:block;" }],
    ];
  },
  addKeyboardShortcuts() {
    return {
      // Ctrl/Cmd + Enter inserts a page break
      "Mod-Enter": () => this.editor.commands.insertContent({ type: this.name }),
    };
  },
});

/**
 * Draws dashed page-break lines over the editor at every N pixels.
 * Recalculates when the editor content grows/shrinks via ResizeObserver.
 */
function PageRulers({ editorId, pageHeightPx }: {
  editorId: string;
  pageHeightPx: number;
}) {
  const [totalHeight, setTotalHeight] = useState(pageHeightPx);

  useEffect(() => {
    const el = document.getElementById(editorId);
    if (!el) return;
    const ro = new ResizeObserver(() => setTotalHeight(el.offsetHeight));
    ro.observe(el);
    setTotalHeight(el.offsetHeight);
    return () => ro.disconnect();
  }, [editorId]);

  const breaks = useMemo(() => {
    const arr: number[] = [];
    let y = pageHeightPx;
    while (y < totalHeight) { arr.push(y); y += pageHeightPx; }
    return arr;
  }, [totalHeight, pageHeightPx]);

  return (
    <>
      {breaks.map((y, i) => (
        <div
          key={y}
          style={{
            position: "absolute",
            top: y,
            left: 0,
            right: 0,
            height: 0,
            borderTop: "2px dashed #e85d26",
            zIndex: 10,
            pointerEvents: "none",
          }}
        >
          <span style={{
            position: "absolute",
            right: 0,
            top: -18,
            fontSize: 10,
            color: "#e85d26",
            fontFamily: "sans-serif",
            background: "white",
            padding: "0 4px",
            lineHeight: "16px",
          }}>
            Page {i + 2}
          </span>
        </div>
      ))}
    </>
  );
}

export default function EditBookPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session, isPending } = authClient.useSession();
  const [, navigate] = useLocation();
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bookStatus, setBookStatus] = useState("");
  const [fontFamily, setFontFamily] = useState("Georgia, serif");
  const [coverUrl, setCoverUrl] = useState("");
  const coverDataUrlRef = useRef<string>(""); // base64 data URL — always embedded into saved HTML
  const [regenCover, setRegenCover] = useState(false);
  const [showCoverPanel, setShowCoverPanel] = useState(false);

  const [marginIn, setMarginIn] = useState(1);
  const [marginTBIn, setMarginTBIn] = useState(1);



  useEffect(() => {
    if (!isPending && !session) navigate("/sign-in");
  }, [session, isPending]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      PageBreak,
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "focus:outline-none min-h-[600px]",
      },
    },
  });

  // Load content
  useEffect(() => {
    if (!id || !session || !editor) return;
    fetch(`/api/edit/${id}`)
      .then(r => r.json())
      .then((data: { html: string; title: string; coverUrl?: string; status?: string }) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(data.html, "text/html");
        // Extract base64 cover from stored HTML if present
        const coverImg = doc.querySelector(".cover img") as HTMLImageElement | null;
        if (coverImg?.src?.startsWith("data:")) {
          coverDataUrlRef.current = coverImg.src;
        }
        // Remove cover div before loading into editor
        doc.querySelector(".cover")?.remove();
        editor.commands.setContent(doc.body.innerHTML);
        setTitle(data.title);
        if (data.status) setBookStatus(data.status);
        if (data.coverUrl) {
          setCoverUrl(data.coverUrl);
          // If we didn't get a base64 from stored HTML (old book or external URL), fetch+convert now
          if (!coverDataUrlRef.current) {
            fetchAndStoreCoverBase64(data.coverUrl);
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id, session, editor]);

  // Fetch a cover URL and store it as base64 in the ref
  const fetchAndStoreCoverBase64 = async (url: string) => {
    try {
      const r = await fetch(url);
      const blob = await r.blob();
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      coverDataUrlRef.current = base64;
    } catch { /* keep existing */ }
  };

  const handleRegenCover = async () => {
    if (!id || regenCover) return;
    setRegenCover(true);
    try {
      const res = await fetch(`/api/edit/${id}/regenerate-cover`, { method: "POST" });
      const data = await res.json() as { coverUrl?: string };
      if (data.coverUrl) {
        setCoverUrl(data.coverUrl);
        await fetchAndStoreCoverBase64(data.coverUrl);
      }
    } catch {
      // silent fail
    } finally {
      setRegenCover(false);
    }
  };

  const handleUploadCover = async (file: File) => {
    if (!id) return;
    const form = new FormData();
    form.append("cover", file);
    try {
      const res = await fetch(`/api/edit/${id}/upload-cover`, { method: "POST", body: form });
      const data = await res.json() as { coverUrl?: string };
      if (data.coverUrl) {
        setCoverUrl(data.coverUrl);
        // Use the file directly for base64 — no need to re-fetch
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        coverDataUrlRef.current = base64;
      }
    } catch {
      // silent fail
    }
  };

  const handleSave = useCallback(async () => {
    if (!editor) return;
    setSaving(true);

    // Always embed the base64 cover so it survives saves without re-fetching
    const coverSrc = coverDataUrlRef.current || coverUrl;
    const coverHtml = coverSrc
      ? `\n  <div class="cover">\n    <img src="${coverSrc}" alt="Cover" />\n  </div>`
      : "";

    const googleFontsUrl = fontFamily !== "Georgia, serif" && !fontFamily.includes("Palatino")
      ? `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,400;0,700;1,400&family=Lato:wght@400;700&family=Open+Sans:wght@400;700&family=Source+Serif+4:ital,wght@0,400;0,700;1,400&display=swap">`
      : "";

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  ${googleFontsUrl}
  <style>
    body { font-family: ${fontFamily}; font-size: 16px; line-height: 1.7; color: #1a1a1a; max-width: 700px; margin: 0 auto; padding: 40px 24px; }
    h1 { font-size: 2em; color: #0e0e0e; margin-top: 2em; }
    h2 { font-size: 1.5em; color: #1a1a1a; margin-top: 1.8em; border-bottom: 2px solid #e85d26; padding-bottom: 8px; }
    h3 { font-size: 1.2em; color: #333; }
    p { margin: 0.8em 0; }
    strong { font-weight: bold; }
    li { margin: 0.4em 0; }
    .cover { page-break-after: always; text-align: center; margin-bottom: 2em; }
    .cover img { max-width: 100%; height: auto; }
  </style>
</head>
<body>${coverHtml}
${editor.getHTML()}
</body>
</html>`;

    await fetch(`/api/edit/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ html, title }),
    });

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [editor, id, title]);

  // Auto-save every 30s
  useEffect(() => {
    const interval = setInterval(handleSave, 30000);
    return () => clearInterval(interval);
  }, [handleSave]);

  if (loading || !editor) {
    return (
      <div className="min-h-screen bg-[#0e0e0e]">
        <Navbar />
        <div className="pt-16 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-[#e85d26] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-[#a09890] text-sm">Loading editor...</p>
          </div>
        </div>
      </div>
    );
  }

  const ToolbarButton = ({ onClick, active, children, title }: {
    onClick: () => void;
    active?: boolean;
    children: React.ReactNode;
    title?: string;
  }) => (
    <button
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      title={title}
      className={`w-8 h-8 flex items-center justify-center text-sm transition-colors ${
        active ? "bg-[#e85d26] text-white" : "text-[#a09890] hover:text-white hover:bg-[#2a2a2a]"
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="h-screen flex flex-col bg-[#0e0e0e] overflow-hidden">
      <Navbar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="shrink-0 bg-[#0e0e0e] border-b border-[#2a2a2a] px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/dashboard/books" className="text-[#a09890] hover:text-white transition-colors shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="bg-transparent border-b border-transparent hover:border-[#2a2a2a] focus:border-[#e85d26] text-white font-semibold text-sm focus:outline-none px-1 py-0.5 w-full min-w-0 transition-colors"
              placeholder="Book title..."
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {saved && (
              <span className="text-green-400 text-xs flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
                Saved
              </span>
            )}
            {/* Cover button */}
            <button
              onClick={() => setShowCoverPanel(p => !p)}
              title="Cover"
              className={`w-8 h-8 flex items-center justify-center transition-colors ${showCoverPanel ? "text-[#e85d26]" : "text-[#a09890] hover:text-white"}`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>

            {/* Download Word */}
            <a
              href={`/api/edit/${id}/download?format=word`}
              download
              title="Download as Word (.doc)"
              className="w-8 h-8 flex items-center justify-center text-[#a09890] hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </a>

            <ThemeToggle />
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#e85d26] hover:bg-[#c94d1e] disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 transition-colors"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <Link
              href={`/dashboard/publish/${id}`}
              className="border border-[#e85d26] text-[#e85d26] hover:bg-[#e85d26] hover:text-white text-sm font-semibold px-4 py-2 transition-colors"
            >
              Publish →
            </Link>
          </div>
        </div>

        {/* Toolbar */}
        <div className="shrink-0 bg-[#161616] border-b border-[#2a2a2a] px-4 sm:px-6 lg:px-8 py-2 flex flex-wrap items-center gap-1">
          {/* Headings */}
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="Heading 1">H1</ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Heading 2">H2</ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Heading 3">H3</ToolbarButton>
          
          <div className="w-px h-5 bg-[#2a2a2a] mx-1" />
          
          {/* Format */}
          <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold">
            <strong>B</strong>
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic">
            <em>I</em>
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline">
            <span className="underline">U</span>
          </ToolbarButton>
          
          <div className="w-px h-5 bg-[#2a2a2a] mx-1" />

          {/* Lists */}
          <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet list">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Numbered list">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          </ToolbarButton>

          <div className="w-px h-5 bg-[#2a2a2a] mx-1" />

          {/* Undo/Redo */}
          <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Undo">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Redo">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" /></svg>
          </ToolbarButton>

          <div className="w-px h-5 bg-[#2a2a2a] mx-1" />

          {/* Page Break */}
          <ToolbarButton
            onClick={() => editor.chain().focus().insertContent({ type: "pageBreak" }).run()}
            title="Insert page break (Ctrl+Enter)"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
            </svg>
          </ToolbarButton>

          <div className="ml-auto flex items-center gap-4">
            {/* Font picker */}
            <select
              value={fontFamily}
              onChange={e => setFontFamily(e.target.value)}
              title="Body font"
              className="bg-[#1a1a1a] border border-[#2a2a2a] text-[#a09890] text-[11px] px-2 py-1 focus:outline-none focus:border-[#e85d26] cursor-pointer hover:border-[#e85d26]/50 transition-colors"
              style={{ fontFamily }}
            >
              {FONT_OPTIONS.map(f => (
                <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>
              ))}
            </select>

            <div className="w-px h-5 bg-[#2a2a2a]" />

            {/* Left/Right margin */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[#a09890] uppercase tracking-wider whitespace-nowrap">L/R</span>
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.25}
                value={marginIn}
                onChange={e => setMarginIn(parseFloat(e.target.value))}
                className="w-16 accent-[#e85d26] cursor-pointer"
                title={`Left/Right: ${marginIn}"`}
              />
              <span className="text-[11px] text-[#e85d26] font-mono w-7 text-right">{marginIn}"</span>
            </div>
            {/* Top/Bottom margin */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[#a09890] uppercase tracking-wider whitespace-nowrap">T/B</span>
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.25}
                value={marginTBIn}
                onChange={e => setMarginTBIn(parseFloat(e.target.value))}
                className="w-16 accent-[#e85d26] cursor-pointer"
                title={`Top/Bottom: ${marginTBIn}"`}
              />
              <span className="text-[11px] text-[#e85d26] font-mono w-7 text-right">{marginTBIn}"</span>
            </div>
            <span className="text-xs text-[#a09890]">
              {editor.storage.characterCount?.characters?.() ?? ""} chars
            </span>
          </div>
        </div>

        {/* Cover panel */}
        {showCoverPanel && (
          <div className="shrink-0 bg-[#161616] border-b border-[#2a2a2a] px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-6">
            <div className="w-16 h-24 bg-[#1e1e1e] border border-[#2a2a2a] overflow-hidden shrink-0">
              {coverUrl ? (
                <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#2a2a2a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>
            <div>
              <p className="text-xs text-[#a09890] mb-2">Update your book cover.</p>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleRegenCover}
                  disabled={regenCover}
                  className="flex items-center gap-2 bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#e85d26] disabled:opacity-50 text-[#f5f0eb] text-sm px-4 py-2 transition-colors"
                >
                  {regenCover ? (
                    <div className="w-3.5 h-3.5 border-2 border-[#e85d26] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                  {regenCover ? "Regenerating..." : "Regenerate"}
                </button>

                {/* Upload custom cover */}
                <label className="flex items-center gap-2 bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#e85d26] text-[#f5f0eb] text-sm px-4 py-2 transition-colors cursor-pointer">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Upload
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadCover(file);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
              <p className="text-[10px] text-[#a09890] mt-1.5">PNG, JPG or WebP · max 10MB</p>
            </div>
          </div>
        )}

        {/* Live-book warning banner */}
        {bookStatus === "published" && (
          <div className="bg-yellow-500/10 border-b border-yellow-500/30 px-4 py-2 flex items-center gap-2 shrink-0">
            <svg className="w-4 h-4 text-yellow-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <p className="text-yellow-300 text-xs">This book is <strong>live</strong> — saves go live immediately and affect all future customer downloads.</p>
          </div>
        )}

        {/* Editor area */}
        <div className="flex-1 overflow-y-auto bg-[#0a0a0a]">
          {/* Google Fonts */}
          <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,400;0,700;1,400&family=Lato:wght@400;700&family=Open+Sans:wght@400;700&family=Source+Serif+4:ital,wght@0,400;0,700;1,400&display=swap" />

          <style>{`
            .ProseMirror:focus { outline: none; }
            .ProseMirror p.is-empty::before { content: attr(data-placeholder); color: #aaa; pointer-events: none; }

            /* ── Page simulation — matches PDF exactly ──
               6×9 in at 96dpi = 576×864px
               Margins: 1in (96px) all around
            */
            .book-page {
              width: 576px;
              min-height: 864px;
              background: #fff;
              box-sizing: border-box;
              position: relative;
              box-shadow: 0 4px 32px rgba(0,0,0,0.6);
              font-family: ${fontFamily};
              font-size: 13px;
              line-height: 1.75;
              color: #1a1a1a;
            }

            /* All ProseMirror elements use book colours on white */
            .book-page .ProseMirror { color: #1a1a1a; }
            .book-page .ProseMirror h1 { font-size: 1.6em; font-weight: 700; color: #0e0e0e; margin: 1.4em 0 0.5em; line-height: 1.2; }
            .book-page .ProseMirror h2 { font-size: 1.25em; font-weight: 700; color: #1a1a1a; margin: 1.3em 0 0.4em; border-bottom: 2px solid #e85d26; padding-bottom: 5px; }
            .book-page .ProseMirror h3 { font-size: 1.05em; font-weight: 700; color: #333; margin: 1.1em 0 0.35em; }
            .book-page .ProseMirror p  { color: #1a1a1a; margin: 0 0 0.8em; font-size: 13px; line-height: 1.75; }
            .book-page .ProseMirror ul,
            .book-page .ProseMirror ol { color: #1a1a1a; padding-left: 1.4em; margin: 0.5em 0 0.8em; }
            .book-page .ProseMirror li { margin: 0.2em 0; font-size: 13px; }
            .book-page .ProseMirror strong { color: #000; font-weight: 700; }
            .book-page .ProseMirror em { font-style: italic; }
            .book-page .ProseMirror hr { border: none; border-top: 1px solid #ccc; margin: 1.5em 0; }
            .book-page .ProseMirror blockquote { border-left: 3px solid #ccc; padding-left: 1em; margin: 1em 0; color: #555; font-style: italic; }

            /* Page break node */
            .book-page .ProseMirror div.page-break {
              margin: 1.5em 0;
              pointer-events: none;
              user-select: none;
            }
          `}</style>

          <div className="py-10 px-4">

            {/* Page 1: Cover */}
            {coverUrl && (
              <div className="relative mx-auto mb-8" style={{ width: 576 }}>
                <div className="bg-white shadow-[0_4px_24px_rgba(0,0,0,0.5)]" style={{ width: 576, height: 864, overflow: "hidden" }}>
                  <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
                </div>
                <span className="absolute bottom-[-22px] right-0 text-[10px] text-[#555] font-sans">Page 1 · Cover</span>
              </div>
            )}

            {/* Content pages — editor lives inside one scrollable white page,
                dashed lines mark where each page break will fall in the PDF */}
            <div className="relative mx-auto" style={{ width: 576 }}>
              <PageRulers editorId="book-editor-content" pageHeightPx={864} />

              <div
                id="book-editor-content"
                className="book-page"
                style={{ minHeight: 864, height: "auto", padding: `${marginTBIn * 96}px ${marginIn * 96}px` }}
              >
                <EditorContent editor={editor} />
              </div>
            </div>

            <p className="text-[#555] text-[10px] text-center mt-10 font-sans">
              Auto-saves every 30s · Dashed lines show PDF page breaks · 6 × 9 in
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
