"use client";

import { CallControls, SpeakerLayout } from "@stream-io/video-react-sdk";
import { LogoWordmark } from "@/components/ui/logo";

type CallActiveProps = {
  title: string;
  onLeave: () => void;
};

export function CallActive({ title, onLeave }: CallActiveProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center justify-between gap-3 px-4 py-3">
        <LogoWordmark tone="sidebar" />
        <p className="truncate text-sm font-medium text-white/80">{title}</p>
      </header>
      <div className="min-h-0 flex-1">
        <SpeakerLayout />
      </div>
      <div className="flex justify-center px-4 py-4">
        <CallControls onLeave={onLeave} />
      </div>
    </div>
  );
}
