import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Image as ImageIcon, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { UserAvatar } from "./UserAvatar";
import { createPost } from "@/lib/feed.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ACCEPTED = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

type Me = {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  avatar_url?: string | null;
};

export function PostComposer({ me }: { me: Me | undefined }) {
  const [open, setOpen] = useState(false);
  if (!me) {
    return (
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="h-10 animate-pulse rounded-full bg-muted" />
      </div>
    );
  }
  const fullName = `${me.first_name} ${me.last_name}`.trim() || me.username;

  return (
    <>
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <UserAvatar url={me.avatar_url} name={fullName} />
          <button
            onClick={() => setOpen(true)}
            className="flex-1 rounded-full border bg-muted px-4 py-2.5 text-left text-sm text-muted-foreground hover:bg-muted/70"
          >
            Start a post, {me.first_name || me.username}…
          </button>
        </div>
        <div className="mt-3 flex justify-around border-t pt-2">
          <Button variant="ghost" size="sm" onClick={() => setOpen(true)} className="gap-2">
            <ImageIcon className="h-4 w-4 text-primary" /> Photo
          </Button>
        </div>
      </div>
      <ComposerDialog open={open} onOpenChange={setOpen} me={me} />
    </>
  );
}

function ComposerDialog({ open, onOpenChange, me }: { open: boolean; onOpenChange: (v: boolean) => void; me: Me }) {
  const qc = useQueryClient();
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fullName = `${me.first_name} ${me.last_name}`.trim() || me.username;

  const reset = () => {
    setContent("");
    setImageUrl(null);
  };

  const create = useMutation({
    mutationFn: () => createPost({ data: { content, image_url: imageUrl } }),
    onSuccess: () => {
      toast.success("Post published");
      reset();
      onOpenChange(false);
      qc.invalidateQueries({ queryKey: ["feed"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to post"),
  });

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      toast.error("Only JPG, PNG, or WEBP images are allowed");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Image must be 5MB or smaller");
      e.target.value = "";
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${me.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("post-media").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("post-media").getPublicUrl(path);
      setImageUrl(data.publicUrl);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && create.isPending) return;
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Create a post</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-3">
          <UserAvatar url={me.avatar_url} name={fullName} />
          <div>
            <div className="text-sm font-semibold">{fullName}</div>
            <div className="text-xs text-muted-foreground">Posting publicly</div>
          </div>
        </div>
        <Textarea
          autoFocus
          placeholder={`What do you want to talk about, ${me.first_name || me.username}?`}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[160px] resize-none border-0 text-base focus-visible:ring-0"
          maxLength={3000}
        />
        {imageUrl && (
          <div className="relative">
            <img src={imageUrl} alt="" className="max-h-80 w-full rounded-lg object-cover" />
            <button
              type="button"
              onClick={() => setImageUrl(null)}
              className="absolute right-2 top-2 rounded-full bg-background/90 p-1.5 shadow"
              aria-label="Remove image"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={onPick}
        />
        <DialogFooter className="flex !justify-between sm:flex-row">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={uploading || create.isPending}
            className="gap-2"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4 text-primary" />}
            {uploading ? "Uploading…" : "Add photo"}
          </Button>
          <Button
            onClick={() => create.mutate()}
            disabled={!content.trim() || create.isPending || uploading}
          >
            {create.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Posting…
              </>
            ) : (
              "Post"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
