import { useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Navbar } from "../../components/Navbar";
import { authClient } from "../../lib/auth";

const CATEGORIES = ["Business", "Health", "Education", "Finance", "Fitness", "Marketing", "Technology", "Self-Help", "Other"];

export default function UploadBookPage() {
  const { data: session } = authClient.useSession();
  const [, navigate] = useLocation();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Business");
  const [file, setFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    const allowed = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowed.includes(f.type)) { setError("Must be PDF or Word (.doc/.docx)"); return; }
    if (f.size > 50 * 1024 * 1024) { setError("File too large (max 50MB)"); return; }
    setError("");
    setFile(f);
  };

  const handleCover = (f: File) => {
    setCoverFile(f);
    setCoverPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async () => {
    if (!file) { setError("Please select a file"); return; }
    if (!title.trim()) { setError("Title is required"); return; }
    setLoading(true);
    setError("");

    try {
      const form = new FormData();
      form.append("book", file);
      form.append("title", title.trim());
      form.append("description", description.trim());
      form.append("category", category);

      const res = await fetch("/api/books/upload", { method: "POST", body: form });
      const data = await res.json() as { bookId?: string; message?: string };

      if (!res.ok) { setError(data.message ?? "Upload failed"); setLoading(false); return; }

      const bookId = data.bookId!;

      // Upload cover if provided
      if (coverFile) {
        const coverForm = new FormData();
        coverForm.append("cover", coverFile);
        await fetch(`/api/edit/${bookId}/upload-cover`, { method: "POST", body: coverForm });
      }

      navigate(`/dashboard/publish/${bookId}`);
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0e0e0e]">
      <Navbar />
      <div className="pt-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-[#a09890] mb-8">
            <Link href="/dashboard" className="hover:text-white">Dashboard</Link>
            <span>/</span>
            <Link href="/dashboard/books" className="hover:text-white">My Books</Link>
            <span>/</span>
            <span className="text-white">Upload Book</span>
          </div>

          <h1 className="font-display text-5xl text-white tracking-wide mb-2">
            UPLOAD <span className="text-[#e85d26]">BOOK</span>
          </h1>
          <p className="text-[#a09890] text-sm mb-10">Upload an existing PDF or Word doc and sell it on the store.</p>

          <div className="space-y-6">

            {/* File drop zone */}
            <div>
              <label className="block text-sm font-medium text-[#a09890] mb-2">Book File <span className="text-[#e85d26]">*</span></label>
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                className="border-2 border-dashed border-[#2a2a2a] hover:border-[#e85d26] transition-colors cursor-pointer p-10 text-center"
              >
                {file ? (
                  <div className="space-y-1">
                    <p className="text-white font-semibold">{file.name}</p>
                    <p className="text-[#a09890] text-sm">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                    <button
                      onClick={e => { e.stopPropagation(); setFile(null); }}
                      className="text-xs text-red-400/60 hover:text-red-400 mt-2"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <>
                    <svg className="w-10 h-10 text-[#2a2a2a] mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-[#a09890] text-sm">Drop your file here or click to browse</p>
                    <p className="text-[#a09890] text-xs mt-1">PDF or Word (.doc / .docx) · max 50MB</p>
                  </>
                )}
              </div>
              <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-[#a09890] mb-2">Title <span className="text-[#e85d26]">*</span></label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. The 7-Figure Freelancer Blueprint"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-4 py-3 text-sm focus:outline-none focus:border-[#e85d26]"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-[#a09890] mb-2">Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="A short description that appears on the store listing..."
                rows={3}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-4 py-3 text-sm focus:outline-none focus:border-[#e85d26] resize-none"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-[#a09890] mb-2">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-4 py-3 text-sm focus:outline-none focus:border-[#e85d26] appearance-none"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Cover image (optional) */}
            <div>
              <label className="block text-sm font-medium text-[#a09890] mb-2">Cover Image <span className="text-[#2a2a2a] font-normal">(optional)</span></label>
              <div className="flex items-start gap-4">
                <div
                  onClick={() => coverRef.current?.click()}
                  className="w-20 h-28 bg-[#1a1a1a] border border-dashed border-[#2a2a2a] hover:border-[#e85d26] flex items-center justify-center cursor-pointer transition-colors overflow-hidden shrink-0"
                >
                  {coverPreview ? (
                    <img src={coverPreview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <svg className="w-6 h-6 text-[#2a2a2a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                    </svg>
                  )}
                </div>
                <div className="pt-1">
                  <p className="text-[#a09890] text-xs leading-relaxed">Click to upload a cover image.<br />PNG, JPG or WebP · max 10MB</p>
                  {coverPreview && (
                    <button onClick={() => { setCoverFile(null); setCoverPreview(null); }} className="text-xs text-red-400/60 hover:text-red-400 mt-2 block">Remove</button>
                  )}
                </div>
              </div>
              <input ref={coverRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleCover(f); e.target.value = ""; }} />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3">
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading || !file || !title.trim()}
              className="w-full bg-[#e85d26] hover:bg-[#c94d1e] disabled:opacity-50 text-white font-semibold py-4 transition-colors"
            >
              {loading ? "Uploading..." : "Upload & Continue to Publish →"}
            </button>

          </div>
        </div>
      </div>
    </div>
  );
}
