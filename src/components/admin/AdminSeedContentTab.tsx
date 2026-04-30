import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";

const POST_CAPTIONS = [
  "Selamat pagi semuanya 🌅 #goodvibes",
  "Hari ini cerah banget ☀️ #sunny",
  "Lagi ngopi dulu sambil scroll ☕ #coffee",
  "Just dropped something cool 🔥 #new",
  "Mood: chill 🎧 #music",
  "Foto random hari ini 📸 #photography",
  "Update kecil dari aku #life",
  "Bikin meme baru 🤣 #funny",
  "Eksplorasi tempat baru 🗺️ #travel",
  "Workout selesai 💪 #fitness",
  "Refleksi hari ini 🌿 #mindful",
  "Lagi belajar hal baru 📚 #learning",
  "Cuaca enak banget buat jalan-jalan 🌤️",
  "Random thought of the day 💭",
  "Sedikit cerita dari sudut kota 🏙️",
];

const MEME_CAPTIONS = [
  "Pas Senin pagi 😭",
  "Diet vs es teh manis",
  "Wifi mati di tengah meeting",
  "Code jalan tapi gak tau kenapa",
  "Gue vs deadline",
  "Kalo notif WA mantan muncul",
  "Update windows pas mau presentasi",
  "Bug yang katanya 'tinggal sedikit lagi'",
  "Hari Minggu vs Senin",
  "Pas dompet tipis tapi diskon datang",
];

const STORY_CAPTIONS = ["Now playing 🎵", "Vibes ✨", "Mood today", "On the way", "Coffee time"];

// Simple inline SVG → data URL placeholder generator (so we don't need real uploads)
const generatePlaceholderDataUrl = (text: string, color: string) => {
  const safe = text.replace(/[<>&"]/g, "");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${color}"/>
        <stop offset="100%" stop-color="#ffffff"/>
      </linearGradient>
    </defs>
    <rect width="800" height="800" fill="url(#g)"/>
    <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="42" fill="#1e293b" text-anchor="middle" dominant-baseline="middle">${safe}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const PALETTE = ["#bae6fd", "#a5f3fc", "#bbf7d0", "#fef08a", "#fecaca", "#ddd6fe", "#fbcfe8"];

export const AdminSeedContentTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [counts, setCounts] = useState({ posts: 0, memes: 0, stories: 0 });

  const POSTS_TARGET = 15;
  const MEMES_TARGET = 10;
  const STORIES_TARGET = 5;
  const TOTAL = POSTS_TARGET + MEMES_TARGET + STORIES_TARGET;

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const handleSeed = async () => {
    if (!user) {
      toast({ title: "Not signed in", variant: "destructive" });
      return;
    }
    setRunning(true);
    setProgress(0);
    setCounts({ posts: 0, memes: 0, stories: 0 });

    let done = 0;
    const bump = () => {
      done += 1;
      setProgress(Math.round((done / TOTAL) * 100));
    };

    try {
      // 15 Posts
      setStatusText("Membuat 15 postingan...");
      for (let i = 0; i < POSTS_TARGET; i++) {
        const caption = POST_CAPTIONS[i % POST_CAPTIONS.length] + ` (#${i + 1})`;
        const { data: post, error } = await supabase
          .from("posts")
          .insert({ user_id: user.id, caption, likes_count: 0, comments_count: 0 })
          .select("id")
          .single();
        if (error) throw error;

        const mediaUrl = generatePlaceholderDataUrl(`Post ${i + 1}`, PALETTE[i % PALETTE.length]);
        await supabase.from("post_media").insert({
          post_id: post!.id,
          media_url: mediaUrl,
          media_type: "image",
          order_index: 0,
        });

        setCounts((c) => ({ ...c, posts: c.posts + 1 }));
        bump();
        await sleep(120);
      }

      // 10 Memes
      setStatusText("Membuat 10 meme...");
      for (let i = 0; i < MEMES_TARGET; i++) {
        const caption = MEME_CAPTIONS[i % MEME_CAPTIONS.length];
        const mediaUrl = generatePlaceholderDataUrl(`Meme ${i + 1}`, PALETTE[(i + 2) % PALETTE.length]);
        const { error } = await supabase.from("memes").insert({
          user_id: user.id,
          caption,
          media_url: mediaUrl,
          media_type: "image",
          likes_count: 0,
          comments_count: 0,
        } as any);
        if (error) throw error;
        setCounts((c) => ({ ...c, memes: c.memes + 1 }));
        bump();
        await sleep(120);
      }

      // 5 Stories
      setStatusText("Membuat 5 story...");
      for (let i = 0; i < STORIES_TARGET; i++) {
        const mediaUrl = generatePlaceholderDataUrl(STORY_CAPTIONS[i % STORY_CAPTIONS.length], PALETTE[(i + 4) % PALETTE.length]);
        const { error } = await supabase.from("stories").insert({
          user_id: user.id,
          media_url: mediaUrl,
          media_type: "image",
        } as any);
        if (error) throw error;
        setCounts((c) => ({ ...c, stories: c.stories + 1 }));
        bump();
        await sleep(120);
      }

      setStatusText("Selesai ✅");
      toast({ title: "Konten dummy berhasil dibuat", description: `15 posts, 10 memes, 5 stories.` });
    } catch (e: any) {
      console.error(e);
      toast({ title: "Gagal seed", description: e.message, variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" /> Seed Content (Admin)
        </CardTitle>
        <CardDescription>
          Tombol cepat untuk meramaikan halaman: membuat 15 postingan, 10 meme, dan 5 story secara bertahap menggunakan akun admin yang sedang login.
          Gambar diisi placeholder otomatis.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-lg border p-3">
            <p className="text-2xl font-bold">{counts.posts}/15</p>
            <p className="text-xs text-muted-foreground">Posts</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-2xl font-bold">{counts.memes}/10</p>
            <p className="text-xs text-muted-foreground">Memes</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-2xl font-bold">{counts.stories}/5</p>
            <p className="text-xs text-muted-foreground">Stories</p>
          </div>
        </div>

        {running && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-xs text-muted-foreground">{statusText} ({progress}%)</p>
          </div>
        )}

        <Button onClick={handleSeed} disabled={running}>
          {running ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sedang membuat...</> : <><Sparkles className="h-4 w-4 mr-2" /> Generate 15 Posts + 10 Memes + 5 Stories</>}
        </Button>
      </CardContent>
    </Card>
  );
};
