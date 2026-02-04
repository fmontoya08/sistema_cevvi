import React, { useState } from "react";
import axios from "axios";
import { UserPlus, CheckCircle, AlertTriangle, Mail } from "lucide-react";
import { Link } from "react-router-dom";

const RegistroPage = () => {
  // Estado inicial limpio (Igual al del Admin)
  const [form, setForm] = useState({
    nombre: "",
    apellido_paterno: "",
    apellido_materno: "",
    email_personal: "", // Campo clave para enviar las claves
    telefono: "",
    domicilio: "",
    genero: "H",
    curp: "",
    fecha_nacimiento: "",
    carrera_id: "1",
    sede_id: "1",
  });

  const [cargando, setCargando] = useState(false);
  const [credenciales, setCredenciales] = useState(null);
  const [error, setError] = useState("");

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);
    setError("");

    try {
      // Enviamos los datos a la ruta pública
      const res = await axios.post(
        "https://api-universidad-c5o8.onrender.com/api/public/registro-aspirante",
        form,
      );
      // const res = await axios.post(
      //   "http://localhost:3001/api/public/registro-aspirante", // <--- APUNTA A TU MÁQUINA
      //   form,
      // );
      setCredenciales(res.data.credenciales);
    } catch (err) {
      setError(
        err.response?.data?.message || "Error al conectar con el servidor.",
      );
    } finally {
      setCargando(false);
    }
  };

  // --- VISTA DE ÉXITO (Muestra Credenciales) ---
  if (credenciales) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center border-t-8 border-green-500 animate-in fade-in zoom-in duration-300">
          <div className="mx-auto bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mb-4">
            <CheckCircle size={40} className="text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            ¡Registro Exitoso!
          </h2>
          <p className="text-gray-600 mb-6">
            Hemos enviado tus claves a:{" "}
            <strong className="text-blue-600">{form.email_personal}</strong>
          </p>

          <div className="bg-gray-50 p-6 rounded-xl border border-dashed border-gray-300 text-left space-y-4 mb-6">
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold">
                Usuario / Matrícula
              </p>
              <p className="text-xl font-mono font-bold text-gray-900">
                {credenciales.usuario}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold">
                Contraseña
              </p>
              <p className="text-lg font-mono font-bold text-blue-700">
                {credenciales.password}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold">
                Correo Institucional
              </p>
              <p className="text-sm font-medium text-gray-700">
                {credenciales.correo}
              </p>
            </div>
          </div>
          <Link
            to="/login"
            className="block w-full bg-[#a72a34] text-white py-3 rounded-xl font-bold hover:bg-[#8f242c] transition shadow-lg"
          >
            Ir a Iniciar Sesión
          </Link>
        </div>
      </div>
    );
  }

  // --- VISTA FORMULARIO (CAMPOS EXACTOS DEL ADMIN) ---
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden">
        {/* Encabezado */}
        <div className="bg-[#a72a34] p-6 text-white text-center">
          <h1 className="text-2xl font-bold uppercase tracking-wide flex justify-center items-center gap-2">
            <UserPlus /> Registro de Aspirantes
          </h1>
          <p className="text-white/80 text-sm mt-1">
            Completa tus datos básicos para generar tu matrícula
          </p>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-2 border border-red-200">
              <AlertTriangle size={20} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 1. CORREO PERSONAL (Importante para el envío) */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <label className="block text-xs font-bold text-blue-800 uppercase mb-1 flex items-center gap-1">
                <Mail size={14} /> Correo Personal (Gmail/Outlook) *
              </label>
              <input
                required
                type="email"
                name="email_personal"
                placeholder="ejemplo@gmail.com"
                value={form.email_personal}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <p className="text-xs text-blue-600 mt-1">
                Te enviaremos tus claves de acceso aquí.
              </p>
            </div>

            {/* 2. DATOS GENERALES (Grid de 2 columnas) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="label-form">Nombre(s) *</label>
                <input
                  required
                  name="nombre"
                  value={form.nombre}
                  onChange={handleChange}
                  className="input-form"
                />
              </div>
              <div>
                <label className="label-form">Apellido Paterno *</label>
                <input
                  required
                  name="apellido_paterno"
                  value={form.apellido_paterno}
                  onChange={handleChange}
                  className="input-form"
                />
              </div>
              <div>
                <label className="label-form">Apellido Materno</label>
                <input
                  name="apellido_materno"
                  value={form.apellido_materno}
                  onChange={handleChange}
                  className="input-form"
                />
              </div>
              <div>
                <label className="label-form">Teléfono *</label>
                <input
                  required
                  name="telefono"
                  type="tel"
                  value={form.telefono}
                  onChange={handleChange}
                  className="input-form"
                />
              </div>
              <div className="md:col-span-2">
                <label className="label-form">Domicilio Completo *</label>
                <input
                  required
                  name="domicilio"
                  placeholder="Calle, Número, Colonia y Código Postal"
                  value={form.domicilio}
                  onChange={handleChange}
                  className="input-form"
                />
              </div>

              <div>
                <label className="label-form">CURP *</label>
                <input
                  required
                  name="curp"
                  value={form.curp}
                  onChange={handleChange}
                  className="input-form uppercase"
                  maxLength={18}
                />
              </div>
              <div>
                <label className="label-form">Fecha Nacimiento *</label>
                <input
                  required
                  type="date"
                  name="fecha_nacimiento"
                  value={form.fecha_nacimiento}
                  onChange={handleChange}
                  className="input-form"
                />
              </div>

              <div>
                <label className="label-form">Género *</label>
                <select
                  name="genero"
                  value={form.genero}
                  onChange={handleChange}
                  className="input-form bg-white"
                >
                  <option value="H">Hombre</option>
                  <option value="M">Mujer</option>
                  <option value="O">Otro</option>
                </select>
              </div>

              <div>
                <label className="label-form">Carrera de Interés *</label>
                <select
                  name="carrera_id"
                  value={form.carrera_id}
                  onChange={handleChange}
                  className="input-form bg-white"
                >
                  <option value="1">
                    Ingeniería en Desarrollo de Software
                  </option>
                  <option value="2">Licenciatura en Derecho</option>
                  <option value="3">Licenciatura en Administración</option>
                  {/* Ajusta tus carreras aquí */}
                </select>
              </div>
            </div>

            <button
              disabled={cargando}
              type="submit"
              className="w-full bg-[#a72a34] hover:bg-[#8f242c] text-white py-4 rounded-xl font-bold text-lg shadow-xl mt-6 transition transform hover:scale-[1.01]"
            >
              {cargando ? "Registrando..." : "REGISTRARME"}
            </button>
          </form>
        </div>
      </div>

      {/* Estilos simples */}
      <style>{`
        .label-form { display: block; font-size: 0.75rem; font-weight: 700; color: #6b7280; text-transform: uppercase; margin-bottom: 0.25rem; }
        .input-form { width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; outline: none; transition: all 0.2s; }
        .input-form:focus { ring: 2px; ring-color: #a72a34; border-color: #a72a34; }
      `}</style>
    </div>
  );
};

export default RegistroPage;
