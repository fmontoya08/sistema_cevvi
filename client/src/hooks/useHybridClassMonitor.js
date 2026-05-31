import { useState, useEffect, useCallback, useRef } from "react";

const useHybridClassMonitor = (externalApi) => {
  const [virtualStudents, setVirtualStudents] = useState([]);
  const [raisedHands, setRaisedHands] = useState([]);
  const [lastChatMessage, setLastChatMessage] = useState(null);
  const [connectedCount, setConnectedCount] = useState(0);
  const prevHandsRef = useRef(0);

  useEffect(() => {
    if (!externalApi) return;

    const onParticipantJoined = (participant) => {
      const id = participant.id;
      const displayName = participant.displayName || `Alumno-${id.slice(0, 6)}`;
      setVirtualStudents((prev) => {
        if (prev.find((p) => p.id === id)) return prev;
        return [...prev, { id, displayName, joinedAt: Date.now() }];
      });
      setConnectedCount((c) => c + 1);
    };

    const onParticipantLeft = (participant) => {
      const id = participant.id;
      setVirtualStudents((prev) => prev.filter((p) => p.id !== id));
      setRaisedHands((prev) => prev.filter((p) => p.id !== id));
      setConnectedCount((c) => Math.max(0, c - 1));
    };

    const onRaiseHandUpdated = ({ participantId, displayName, handRaised }) => {
      if (handRaised) {
        setRaisedHands((prev) => {
          if (prev.find((p) => p.id === participantId)) return prev;
          return [
            ...prev,
            {
              id: participantId,
              displayName: displayName || "Alguien",
              raisedAt: Date.now(),
            },
          ];
        });
      } else {
        setRaisedHands((prev) => prev.filter((p) => p.id !== participantId));
      }
    };

    const onChatUpdated = ({ senderId, displayName, message, timestamp }) => {
      setLastChatMessage({
        senderId,
        displayName: displayName || "Alguien",
        message,
        timestamp: timestamp || Date.now(),
      });
    };

    externalApi.addEventListener("participantJoined", onParticipantJoined);
    externalApi.addEventListener("participantLeft", onParticipantLeft);
    externalApi.addEventListener("raiseHandUpdated", onRaiseHandUpdated);
    externalApi.addEventListener("chatUpdated", onChatUpdated);

    return () => {
      try {
        externalApi.removeEventListener(
          "participantJoined",
          onParticipantJoined,
        );
        externalApi.removeEventListener("participantLeft", onParticipantLeft);
        externalApi.removeEventListener(
          "raiseHandUpdated",
          onRaiseHandUpdated,
        );
        externalApi.removeEventListener("chatUpdated", onChatUpdated);
      } catch (e) {}
    };
  }, [externalApi]);

  const playRaiseHandSound = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
      osc.type = "sine";
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {}
  }, []);

  useEffect(() => {
    const current = raisedHands.length;
    if (current > prevHandsRef.current && current > 0) {
      playRaiseHandSound();
    }
    prevHandsRef.current = current;
  }, [raisedHands.length, playRaiseHandSound]);

  return {
    virtualStudents,
    raisedHands,
    lastChatMessage,
    connectedCount,
  };
};

export default useHybridClassMonitor;
