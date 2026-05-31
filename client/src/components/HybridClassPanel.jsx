import React, { useState, useEffect, useRef } from "react";
import {
  Users,
  Hand,
  MessageSquare,
  Layout,
  VolumeX,
  ChevronUp,
  ChevronDown,
  Bell,
} from "lucide-react";
import AudioMixerPanel from "./AudioMixerPanel";

const TOAST_DURATION = 5000;

const HybridClassPanel = ({
  monitor,
  audioMixer,
  externalApi,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const prevHandsRef = useRef(0);
  const prevChatRef = useRef(null);

  const { virtualStudents, raisedHands, lastChatMessage, connectedCount } =
    monitor;

  const handleTileView = () => {
    try {
      externalApi?.executeCommand("toggleTileView");
    } catch (e) {}
  };

  const handleMuteAll = () => {
    try {
      externalApi?.executeCommand("muteAllParticipants");
    } catch (e) {}
  };

  const handleSpotlight = () => {
    try {
      externalApi?.executeCommand("toggleTileView");
    } catch (e) {}
  };

  useEffect(() => {
    if (raisedHands.length > prevHandsRef.current) {
      const newHands = raisedHands.filter(
        (h) => !prevHandsRef.current || true,
      );
      const latest = raisedHands[raisedHands.length - 1];
      if (latest) {
        setToast({
          type: "hand",
          message: `${latest.displayName} levantó la mano`,
          icon: "✋",
        });
      }
    }
    prevHandsRef.current = raisedHands.length;
  }, [raisedHands]);

  useEffect(() => {
    if (
      lastChatMessage &&
      lastChatMessage.message !== prevChatRef.current?.message
    ) {
      setToast({
        type: "chat",
        message: `${lastChatMessage.displayName}: ${lastChatMessage.message}`,
        icon: "💬",
      });
    }
    prevChatRef.current = lastChatMessage;
  }, [lastChatMessage]);

  useEffect(() => {
    if (toast) {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), TOAST_DURATION);
    }
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [toast]);

  const displayNames = virtualStudents
    .slice(0, 3)
    .map((s) => s.displayName.split(" (")[0])
    .join(", ");
  const moreCount = virtualStudents.length - 3;

  return (
    <div className="fixed top-14 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <div className="pointer-events-auto w-full max-w-3xl mx-2">
        {toast && (
          <div className="mb-1 bg-gray-900/90 backdrop-blur-sm text-white px-4 py-2 rounded-lg shadow-lg border border-gray-700/50 flex items-center gap-2 animate-in slide-in-from-top-2 duration-200">
            <span className="text-lg">{toast.icon}</span>
            <span className="text-sm font-medium truncate">
              {toast.message}
            </span>
            <button
              onClick={() => setToast(null)}
              className="ml-auto text-gray-400 hover:text-white flex-shrink-0"
            >
              <Bell size={14} />
            </button>
          </div>
        )}

        <div className="bg-gray-900/85 backdrop-blur-md text-white rounded-xl shadow-2xl border border-gray-700/50 overflow-hidden transition-all duration-200">
          <div className="flex items-center gap-1.5 px-3 py-2 text-xs">
            <div className="flex items-center gap-1.5 bg-gray-800/80 rounded-lg px-2.5 py-1.5">
              <Users size={14} className="text-blue-400" />
              <span className="font-bold text-blue-200">{connectedCount}</span>
              <span className="text-gray-400 hidden sm:inline">
                virtuales
              </span>
            </div>

            <div className="flex items-center gap-1.5 bg-gray-800/80 rounded-lg px-2.5 py-1.5">
              <Hand size={14} className="text-yellow-400" />
              <span className="font-bold text-yellow-200">
                {raisedHands.length}
              </span>
              <span className="text-gray-400 hidden sm:inline">manos</span>
            </div>

            {virtualStudents.length > 0 && connectedCount > 0 && (
              <div className="hidden md:flex items-center gap-1.5 bg-gray-800/80 rounded-lg px-2.5 py-1.5 max-w-[200px]">
                <span className="text-gray-400 text-[10px] truncate">
                  {displayNames}
                  {moreCount > 0 ? ` +${moreCount} más` : ""}
                </span>
              </div>
            )}

            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={handleTileView}
                className="p-1.5 rounded-lg hover:bg-gray-700/80 transition-colors"
                title="Vista mosaico"
              >
                <Layout size={14} />
              </button>
              <button
                onClick={handleMuteAll}
                className="p-1.5 rounded-lg hover:bg-gray-700/80 transition-colors"
                title="Silenciar todos"
              >
                <VolumeX size={14} />
              </button>
              <button
                onClick={() => setExpanded(!expanded)}
                className={`p-1.5 rounded-lg transition-colors ${
                  expanded ? "bg-gray-700/80" : "hover:bg-gray-700/80"
                }`}
                title="Control de audio"
              >
                {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>
          </div>

          {expanded && (
            <div className="border-t border-gray-700/50 px-3 py-3 bg-gray-900/60">
              <AudioMixerPanel {...audioMixer} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HybridClassPanel;
