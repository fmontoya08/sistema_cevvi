import React, { useState } from "react";
import axios from "axios";
import { UserPlus, CheckCircle, AlertTriangle, Mail } from "lucide-react";
import { Link } from "react-router-dom";

const RegistroPage = () => {
  // CONFIGURACIÓN: URL DE PRODUCCIÓN
  // Asegúrate de que tu Backend en Render ya tenga el cambio de "password_correo" subido.
  const API_URL = "https://api-universidad-c5o8.onrender.com";

  // Estado del formulario
  const [form, setForm] = useState({
    nombre: "",
    apellido_paterno: "",
    apellido_materno: "",
    email_personal: "",
    telefono: "",
    domicilio: "",
    colonia: "",
    edad: "",
    modalidad: "",
    escuela_procedencia: "",
    contacto_emergencia_nombre: "",
    contacto_emergencia_telefono: "",
    genero: "H",
    curp: "",
    fecha_nacimiento: "",
    carrera_id: "1",
    sede_id: "1",
  });

  const [cargando, setCargando] = useState(false);
  const [credenciales, setCredenciales] = useState(null);
  const [error, setError] = useState("");

  // --- CORRECCIÓN AQUÍ: Forzar mayúsculas al escribir en CURP ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({
      ...form,
      [name]: name === "curp" ? value.toUpperCase() : value,
    });
  };
  // -------------------------------------------------------------

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);
    setError("");

    try {
      // Enviamos los datos a la ruta pública
      const res = await axios.post(
        `${API_URL}/api/public/registro-aspirante`,
        form,
      );
      setCredenciales(res.data.credenciales);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message || "Error al conectar con el servidor.",
      );
    } finally {
      setCargando(false);
    }
  };

  // --- VISTA DE RESULTADO (CREDENCIALES) ---
  if (credenciales) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full text-center border-t-8 border-green-500 animate-in fade-in zoom-in duration-300">
          <div className="mx-auto bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <CheckCircle size={32} className="text-green-600" />
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            ¡Registro Exitoso!
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            Captura esta pantalla. Estos son tus accesos oficiales:
          </p>

          <div className="text-left space-y-4 mb-8">
            {/* 1. DATOS PLATAFORMA */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-gray-200 text-gray-600 text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                PLATAFORMA
              </div>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold">
                    Usuario / Matrícula
                  </p>
                  <p className="text-xl font-mono font-bold text-gray-900 truncate">
                    {credenciales.usuario}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold">
                    Contraseña
                  </p>
                  <p className="text-xl font-mono font-bold text-gray-900 truncate">
                    {credenciales.password}
                  </p>
                </div>
              </div>
            </div>

            {/* 2. DATOS CORREO INSTITUCIONAL */}
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-blue-200 text-blue-800 text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                CORREO OFICIAL
              </div>
              <div className="space-y-3 mt-2">
                <div>
                  <p className="text-[10px] text-blue-400 uppercase font-bold">
                    Correo Institucional
                  </p>
                  <p className="text-sm font-mono font-bold text-gray-800 break-all select-all">
                    {credenciales.correo}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-blue-400 uppercase font-bold">
                    Contraseña del Correo
                  </p>
                  <div className="mt-1">
                    <span className="text-lg font-mono font-bold text-blue-700 bg-white border border-blue-100 px-3 py-1 rounded-md select-all inline-block">
                      {credenciales.password_correo || "Revisar Backend"}
                    </span>
                  </div>
                  <p className="text-[10px] text-blue-400 mt-1 italic">
                    * Úsala para entrar a Gmail o Outlook.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Link
            to="plataforma/login"
            className="block w-full bg-[#1e293b] text-white py-3 rounded-xl font-bold hover:bg-black transition shadow-lg transform active:scale-95"
          >
            Ir a Iniciar Sesión
          </Link>
        </div>
      </div>
    );
  }

  // --- VISTA FORMULARIO ---
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
            <div className="mb-6 bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-2 border border-red-200 animate-pulse">
              <AlertTriangle size={20} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* SECCIÓN 1: CONTACTO CLAVE */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <label className="block text-xs font-bold text-blue-800 uppercase mb-1 flex items-center gap-1">
                <Mail size={14} /> Correo Personal
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
            </div>

            {/* SECCIÓN 2: DATOS GENERALES */}
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
                  placeholder="Calle, Número, Cruzamientos"
                  value={form.domicilio}
                  onChange={handleChange}
                  className="input-form"
                />
              </div>

              <div>
                <label className="label-form">Colonia *</label>
                <input
                  required
                  name="colonia"
                  value={form.colonia}
                  onChange={handleChange}
                  className="input-form"
                />
              </div>
              <div>
                <label className="label-form">Edad *</label>
                <input
                  required
                  type="number"
                  name="edad"
                  value={form.edad}
                  onChange={handleChange}
                  className="input-form"
                />
              </div>

              <div className="md:col-span-2">
                <label className="label-form">Escuela de Procedencia *</label>
                <input
                  required
                  name="escuela_procedencia"
                  placeholder="Nombre de tu Bachillerato"
                  value={form.escuela_procedencia}
                  onChange={handleChange}
                  className="input-form"
                />
              </div>

              <div>
                <label className="label-form">Modalidad *</label>
                <select
                  name="modalidad"
                  value={form.modalidad}
                  onChange={handleChange}
                  className="input-form bg-white"
                >
                  <option value="Presencial">Presencial</option>
                  <option value="Virtual">Virtual</option>
                </select>
              </div>

              {/* EMERGENCIA */}
              <div className="md:col-span-2 bg-red-50 p-4 rounded-lg border border-red-100">
                <p className="text-xs font-bold text-red-800 uppercase mb-3 border-b border-red-200 pb-1">
                  En caso de emergencia
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label-form text-red-900">
                      Nombre Contacto *
                    </label>
                    <input
                      required
                      name="contacto_emergencia_nombre"
                      value={form.contacto_emergencia_nombre}
                      onChange={handleChange}
                      className="input-form border-red-200"
                    />
                  </div>
                  <div>
                    <label className="label-form text-red-900">
                      Teléfono Contacto *
                    </label>
                    <input
                      required
                      type="tel"
                      name="contacto_emergencia_telefono"
                      value={form.contacto_emergencia_telefono}
                      onChange={handleChange}
                      className="input-form border-red-200"
                    />
                  </div>
                </div>
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
                  <option value="1">Licenciatura en Pedagogía</option>
                  <option value="2">Licenciatura en Psicología</option>
                  {/* Agrega más opciones aquí */}
                </select>
              </div>
            </div>

            <button
              disabled={cargando}
              type="submit"
              className="w-full bg-[#a72a34] hover:bg-[#8f242c] text-white py-4 rounded-xl font-bold text-lg shadow-xl mt-6 transition transform hover:scale-[1.01]"
            >
              {cargando ? "Procesando Registro..." : "FINALIZAR REGISTRO"}
            </button>
          </form>
        </div>
      </div>

      <style>{`
        .label-form { display: block; font-size: 0.75rem; font-weight: 700; color: #6b7280; text-transform: uppercase; margin-bottom: 0.25rem; }
        .input-form { width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; outline: none; transition: all 0.2s; }
        .input-form:focus { ring: 2px; ring-color: #a72a34; border-color: #a72a34; background-color: #fff; box-shadow: 0 0 0 4px rgba(167, 42, 52, 0.1); }
      `}</style>
    </div>
  );
};

export default RegistroPage;
