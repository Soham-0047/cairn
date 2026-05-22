"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { ImagePlus, Loader2, Upload, X } from "lucide-react";
import { getGuestToken, getGuestMeta } from "@/lib/guest";
import { proxyFetch } from "@/lib/clientFetch";

type Screenshot = { label: string; dataUrl: string };

export default function NewProjectPage() {
  const router = useRouter();
  const { status } = useSession();
  const [repoUrl, setRepoUrl] = useState("");
  const [title, setTitle] = useState("");
  const [skills, setSkills] = useState("");
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasGuest, setHasGuest] = useState(false);
  const [guestAllowsScreenshots, setGuestAllowsScreenshots] = useState(true);

  useEffect(() => {
    const t = getGuestToken();
    setHasGuest(!!t);
    const m = getGuestMeta();
    setGuestAllowsScreenshots(m?.limits?.allowScreenshots ?? true);
  }, []);

  if (status === "unauthenticated" && !hasGuest) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-zinc-900">Sign in to submit</h1>
        <button onClick={() => signIn("github")} className="btn-primary mt-6">
          Sign in with GitHub
        </button>
      </div>
    );
  }

  const isGuest = !!hasGuest && status !== "authenticated";
  const screenshotsDisabled = isGuest && !guestAllowsScreenshots;

  async function onPickFiles(files: FileList | null) {
    if (!files) return;
    setError(null);
    const newOnes: Screenshot[] = [];
    for (const f of Array.from(files).slice(0, 4 - screenshots.length)) {
      if (!f.type.startsWith("image/")) continue;
      if (f.size > 5 * 1024 * 1024) {
        setError(`${f.name} is too large — max 5 MB`);
        continue;
      }
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(f);
      });
      newOnes.push({ label: f.name, dataUrl });
    }
    setScreenshots([...screenshots, ...newOnes]);
  }

  async function submit() {
    setError(null);
    if (!repoUrl.includes("github.com")) {
      setError("Please paste a github.com repo URL.");
      return;
    }
    if (title.trim().length < 2) {
      setError("Give your project a title.");
      return;
    }
    const skillList = skills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (skillList.length === 0) {
      setError("List at least one skill this project demonstrates.");
      return;
    }

    setLoading(true);
    try {
      const res = await proxyFetch("/evaluations", {
        method: "POST",
        body: JSON.stringify({
          repoUrl,
          projectTitle: title,
          claimedSkills: skillList,
          screenshots: screenshotsDisabled ? [] : screenshots,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Evaluation failed");
      router.push(`/projects/${data._id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Submit a project</h1>
      <p className="mt-2 text-zinc-600">
        We&rsquo;ll pull your GitHub repo, read the code, and (if you add screenshots) review the UI visually. Gemma 4
        does the work; you get a verified credential if it passes.
      </p>

      <div className="mt-8 space-y-5">
        <div>
          <label className="text-sm font-medium text-zinc-700">GitHub repo URL</label>
          <input
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/you/your-project"
            className="input mt-2"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-zinc-700">Project title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. RAG chatbot for course notes"
            className="input mt-2"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-zinc-700">Skills demonstrated</label>
          <input
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            placeholder="python, langchain, retrieval, fastapi"
            className="input mt-2"
          />
          <p className="mt-1 text-xs text-zinc-500">Comma-separated. We&rsquo;ll check whether the code actually demonstrates these.</p>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-zinc-700">
              Screenshots <span className="text-xs font-normal text-zinc-500">(optional — unlocks visual review)</span>
            </label>
            <span className="text-xs text-zinc-500">{screenshots.length}/4</span>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Upload up to 4 images of your running app. Gemma 4 12B (vision) will compare them to your code claims.
          </p>
          {screenshotsDisabled ? (
            <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              Visual review is disabled for guests. Sign in with GitHub to upload screenshots.
            </div>
          ) : (
          <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-600 hover:border-zinc-400 hover:bg-zinc-50">
            <ImagePlus className="h-5 w-5" />
            Click to add screenshots
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              className="hidden"
              onChange={(e) => onPickFiles(e.target.files)}
            />
          </label>
          )}
          {screenshots.length > 0 ? (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {screenshots.map((s, i) => (
                <div key={i} className="relative">
                  <img src={s.dataUrl} alt={s.label} className="h-24 w-full rounded-lg border border-zinc-200 object-cover" />
                  <button
                    onClick={() => setScreenshots(screenshots.filter((_, j) => j !== i))}
                    className="absolute -right-1 -top-1 rounded-full bg-zinc-900 p-0.5 text-white shadow"
                    aria-label="Remove screenshot"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>
      ) : null}

      <button onClick={submit} disabled={loading} className="btn-primary mt-6 w-full sm:w-auto">
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Evaluating… (this takes 30-60s)
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" /> Submit for verification
          </>
        )}
      </button>
      <p className="mt-3 text-xs text-zinc-500">
        We use Gemma 4 27B for code review and Gemma 4 12B vision-capable for screenshot review. Each call is logged so you can see which model evaluated what.
      </p>
    </div>
  );
}
