import React, { useState, useEffect } from "react";

type Props = {
  postId: string;
  upvotes?: number;
  downvotes?: number;
  userVote?: number; // 1, -1, 0
  onChange?: (data: {
    upvotes: number;
    downvotes: number;
    user_vote: number;
  }) => void;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export default function VoteButtons({
  postId,
  upvotes = 0,
  downvotes = 0,
  userVote = 0,
  onChange,
}: Props) {
  const token =
    typeof window !== "undefined" ? sessionStorage.getItem("token") : null;
  const [localUp, setLocalUp] = useState<number>(upvotes);
  const [localDown, setLocalDown] = useState<number>(downvotes);
  const [localUserVote, setLocalUserVote] = useState<number>(userVote);
  const [busy, setBusy] = useState(false);

  // keep local state in sync if parent props change
  useEffect(() => {
    setLocalUp(upvotes);
    setLocalDown(downvotes);
    setLocalUserVote(userVote);
  }, [upvotes, downvotes, userVote]);

  const doVote = async (vote: number) => {
    if (!token) {
      window.alert("Please log in to vote");
      return;
    }
    if (busy) return;
    setBusy(true);

    // optimistic update
    let newUp = localUp;
    let newDown = localDown;
    let newUser = localUserVote;

    let payloadVote = vote;
    if (localUserVote === vote) {
      payloadVote = 0;
      newUser = 0;
      if (vote === 1) newUp = Math.max(0, newUp - 1);
      else newDown = Math.max(0, newDown - 1);
    } else {
      if (vote === 1) {
        newUp = newUp + 1;
        if (localUserVote === -1) newDown = Math.max(0, newDown - 1);
      } else {
        newDown = newDown + 1;
        if (localUserVote === 1) newUp = Math.max(0, newUp - 1);
      }
      newUser = vote;
    }

    setLocalUp(newUp);
    setLocalDown(newDown);
    setLocalUserVote(newUser);

    try {
      const resp = await fetch(`${API_BASE}/api/posts/${postId}/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ vote: payloadVote }),
      });

      if (!resp.ok) {
        const t = await resp.text();
        throw new Error(t || `Vote failed (${resp.status})`);
      }

      const json = await resp.json();
      setLocalUp(json.upvotes);
      setLocalDown(json.downvotes);
      setLocalUserVote(json.user_vote);

      onChange?.({
        upvotes: json.upvotes,
        downvotes: json.downvotes,
        user_vote: json.user_vote,
      });
    } catch (err: any) {
      console.error("Vote error", err);
      window.alert("Could not submit vote: " + (err?.message ?? ""));
      // conservative rollback: refetch or revert to previous props — here we revert to prop values
      setLocalUp(upvotes);
      setLocalDown(downvotes);
      setLocalUserVote(userVote);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => doVote(1)}
        disabled={busy}
        aria-pressed={localUserVote === 1}
        aria-label="Upvote"
        className={`inline-flex items-center gap-2 px-2 py-1 rounded-md text-sm transition ${
          localUserVote === 1
            ? "bg-amber-50 text-amber-700"
            : "bg-slate-100 text-slate-700"
        } ${busy ? "opacity-60 pointer-events-none" : ""}`}
        title="Upvote"
      >
        <span aria-hidden>▲</span>
        <span className="text-sm">{localUp}</span>
      </button>

      <button
        onClick={() => doVote(-1)}
        disabled={busy}
        aria-pressed={localUserVote === -1}
        aria-label="Downvote"
        className={`inline-flex items-center gap-2 px-2 py-1 rounded-md text-sm transition ${
          localUserVote === -1
            ? "bg-amber-100 text-slate-800"
            : "bg-slate-100 text-slate-700"
        } ${busy ? "opacity-60 pointer-events-none" : ""}`}
        title="Downvote"
      >
        <span aria-hidden>▼</span>
        <span className="text-sm">{localDown}</span>
      </button>
    </div>
  );
}
