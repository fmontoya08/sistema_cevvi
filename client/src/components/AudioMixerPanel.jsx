import React from "react";
import {
  Mic,
  MicOff,
  Volume2,
  Users,
  Shuffle,
} from "lucide-react";

const AudioMixerPanel = ({
  devices,
  teacherMicId,
  setTeacherMicId,
  studentMicId,
  setStudentMicId,
  activeMic,
  switchMic,
  togglePTT,
  vuLevel,
}) => {
  const teacherLabel = activeMic === "teacher" ? "ACTIVO" : "INACTIVO";
  const studentLabel = activeMic === "student" ? "ACTIVO" : "INACTIVO";
  const teacherColor =
    activeMic === "teacher" ? "text-green-400" : "text-gray-400";
  const studentColor =
    activeMic === "student" ? "text-green-400" : "text-gray-400";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
          Mezclador de Audio
        </h4>
        <span className="text-xs text-gray-500">Push-to-Talk</span>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <Mic
            size={14}
            className={`${teacherColor} flex-shrink-0 ${activeMic === "teacher" ? "animate-pulse" : ""}`}
          />
          <select
            value={teacherMicId || ""}
            onChange={(e) => setTeacherMicId(e.target.value)}
            className="flex-1 min-w-0 bg-gray-700 text-white text-xs rounded px-1.5 py-1 border border-gray-600 outline-none truncate"
            title="Micrófono de la maestra (auricular)"
          >
            <option value="" disabled>
              Maestra (auricular)
            </option>
            {devices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `Micrófono ${d.deviceId.slice(0, 8)}`}
              </option>
            ))}
          </select>
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${activeMic === "teacher" ? "bg-green-900 text-green-300" : "bg-gray-700 text-gray-500"}`}
          >
            {teacherLabel}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <Users
            size={14}
            className={`${studentColor} flex-shrink-0 ${activeMic === "student" ? "animate-pulse" : ""}`}
          />
          <select
            value={studentMicId || ""}
            onChange={(e) => setStudentMicId(e.target.value)}
            className="flex-1 min-w-0 bg-gray-700 text-white text-xs rounded px-1.5 py-1 border border-gray-600 outline-none truncate"
            title="Micrófono de alumnos (inalámbrico)"
          >
            <option value="" disabled>
              Alumnos (inalámbrico)
            </option>
            {devices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `Micrófono ${d.deviceId.slice(0, 8)}`}
              </option>
            ))}
          </select>
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${activeMic === "student" ? "bg-green-900 text-green-300" : "bg-gray-700 text-gray-500"}`}
          >
            {studentLabel}
          </span>
        </div>
      </div>

      <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 rounded-full transition-all duration-100"
          style={{ width: `${vuLevel * 100}%` }}
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => switchMic("teacher")}
          disabled={activeMic === "teacher"}
          className={`flex-1 py-1.5 px-2 rounded text-xs font-bold transition-all ${
            activeMic === "teacher"
              ? "bg-green-700 text-white cursor-default"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          }`}
        >
          <Mic size={12} className="inline mr-1" />
          Maestra
        </button>
        <button
          onClick={togglePTT}
          className={`flex-1 py-1.5 px-2 rounded text-xs font-bold transition-all flex items-center justify-center gap-1 ${
            activeMic === "student"
              ? "bg-orange-600 text-white animate-pulse"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          }`}
        >
          {activeMic === "student" ? (
            <>
              <MicOff size={12} /> Pulsa para hablar
            </>
          ) : (
            <>
              <Shuffle size={12} /> PTT Alumnos
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default AudioMixerPanel;
