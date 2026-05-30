import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Image as ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "./UserAvatar";
import { createPost } from "@/lib/feed.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function PostComposer({ me }: { me: { avatar_url?: string | null; first_name: string; last_name: string; username: string; id: string } | undefined }) {
  const qc = useQueryClient();
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const create = useMutation({
    mutationFn: () => createPost({ data: { content, image_url: imageUrl } }),
    onSuccess: () => {
      setContent("");
      setImageUrl(null);
      toast.success("Posted");
      qc.invalidateQueries({ queryKey: ["feed"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !me) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${me.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("post-media").upload(path, file);
    if (error) {
      toast.error(error.message);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("post-media").getPublicUrl(path);
    setImageUrl(data.publicUrl);
    setUploading(false);
  };

  if (!me) return null;
  const fullName = `${me.first_name} ${me.last_name}`.trim() || me.username;

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex gap-3">
        <UserAvatar url={me.avatar_url} name={fullName} />
        <Textarea
          placeholder={`What's on your mind, ${me.first_name || me.username}?`}
          className="min-h-[60px] resize-none border-0 bg-muted text-base focus-visible:ring-0"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </div>
      {imageUrl && (
        <div className="relative mt-3">
          <img src={imageUrl} alt="" className="max-h-72 w-full rounded-lg object-cover" />
          <button onClick={() => setImageUrl(null)} className="absolute right-2 top-2 rounded-full bg-background/80 p-1">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      <div className="mt-3 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          <ImageIcon className="mr-2 h-4 w-4 text-primary" />
          {uploading ? "Uploading…" : "Photo"}
        </Button>
        <input ref={inputRef} type="file" accept="image/*" hidden onChange={onPick} />
        <Button onClick={() => create.mutate()} disabled={!content.trim() || create.isPending}>
          {create.isPending ? "Posting…" : "Post"}
        </Button>
      </div>
    </div>
  );
}
