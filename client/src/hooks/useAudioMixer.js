import { useState, useEffect, useCallback, useRef } from "react";

const useAudioMixer = (externalApi) => {
  const [devices, setDevices] = useState([]);
  const [teacherMicId, setTeacherMicId] = useState(null);
  const [studentMicId, setStudentMicId] = useState(null);
  const [activeMic, setActiveMic] = useState("teacher");
  const [teacherVolume, setTeacherVolume] = useState(1);
  const [studentVolume, setStudentVolume] = useState(1);
  const [vuLevel, setVuLevel] = useState(0);
  const analyserRef = useRef(null);
  const audioContextRef = useRef(null);
  const sourceRef = useRef(null);
  const rafRef = useRef(null);

  const enumerateDevices = useCallback(async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = allDevices.filter(
        (d) => d.kind === "audioinput" && d.deviceId,
      );
      setDevices(audioInputs);
      if (audioInputs.length > 0 && !teacherMicId) {
        setTeacherMicId(audioInputs[0].deviceId);
      }
      if (audioInputs.length > 1 && !studentMicId) {
        setStudentMicId(audioInputs[1].deviceId);
      }
    } catch (e) {
      console.error("Error enumerating devices:", e);
    }
  }, [teacherMicId, studentMicId]);

  useEffect(() => {
    enumerateDevices();
    navigator.mediaDevices.addEventListener("devicechange", enumerateDevices);
    return () => {
      navigator.mediaDevices.removeEventListener(
        "devicechange",
        enumerateDevices,
      );
    };
  }, [enumerateDevices]);

  const switchMic = useCallback(
    (which) => {
      const deviceId =
        which === "teacher" ? teacherMicId : studentMicId;
      if (!deviceId || !externalApi) return;
      setActiveMic(which);
      try {
        externalApi.executeCommand("setAudioInputDevice", deviceId);
      } catch (e) {
        console.error("Error switching mic:", e);
      }
    },
    [teacherMicId, studentMicId, externalApi],
  );

  const togglePTT = useCallback(() => {
    if (activeMic === "teacher") {
      if (studentMicId) switchMic("student");
    } else {
      switchMic("teacher");
    }
  }, [activeMic, studentMicId, switchMic]);

  const startVUMeter = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: activeMic === "teacher" ? teacherMicId : studentMicId,
        },
      });
      audioContextRef.current = new (window.AudioContext ||
        window.webkitAudioContext)();
      sourceRef.current =
        audioContextRef.current.createMediaStreamSource(stream);
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 256;
      sourceRef.current.connect(analyser);
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const update = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const avg =
          dataArray.reduce((a, b) => a + b, 0) / bufferLength;
        setVuLevel(Math.min(1, avg / 128));
        rafRef.current = requestAnimationFrame(update);
      };
      update();
    } catch (e) {
      // Silently fail if mic access denied
    }
  }, [activeMic, teacherMicId, studentMicId]);

  useEffect(() => {
    startVUMeter();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (sourceRef.current) {
        sourceRef.current.disconnect();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [startVUMeter]);

  return {
    devices,
    teacherMicId,
    setTeacherMicId,
    studentMicId,
    setStudentMicId,
    activeMic,
    switchMic,
    togglePTT,
    teacherVolume,
    setTeacherVolume,
    studentVolume,
    setStudentVolume,
    vuLevel,
  };
};

export default useAudioMixer;
