import React, { useState, useEffect, useContext } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { AuthContext } from "../App"; // Importamos el contexto
import { Send, Trash2, MessageSquare, Info } from "lucide-react";

const MuroDocentePage = () => {
  const { grupoId, asignaturaId } = useParams();
  const { user } = useContext(AuthContext); // Usamos user del contexto
  const [posts, setPosts] = useState([]);
  const [nuevoMensaje, setNuevoMensaje] = useState("");
  const [loading, setLoading] = useState(true);

  // Configuración de API local (o usa tu instancia 'api' si la exportas)
  const api = axios.create({
    baseURL: "https://api-universidad-c5o8.onrender.com/api", // Ajusta a tu URL real
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });

  useEffect(() => {
    cargarMuro();
  }, [grupoId, asignaturaId]);

  const cargarMuro = async () => {
    try {
      const res = await api.get(`/muro/${grupoId}/${asignaturaId}`);
      setPosts(res.data);
    } catch (error) {
      console.error("Error cargando muro", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePublicar = async (e) => {
    e.preventDefault();
    if (!nuevoMensaje.trim()) return;
    try {
      await api.post("/muro/publicar", {
        grupo_id: grupoId,
        asignatura_id: asignaturaId,
        mensaje: nuevoMensaje,
        tipo: "anuncio",
      });
      setNuevoMensaje("");
      cargarMuro();
    } catch (error) {
      alert("Error al publicar");
    }
  };

  const handleEliminar = async (id) => {
    if (!window.confirm("¿Borrar esta publicación?")) return;
    try {
      await api.delete(`/muro/${id}`);
      cargarMuro();
    } catch (error) {
      alert("Error al eliminar");
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Caja de Publicación */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-8">
        <h2 className="text-lg font-bold text-gray-700 mb-2 flex items-center gap-2">
          <MessageSquare size={20} className="text-blue-600" />
          Anunciar algo a la clase
        </h2>
        <form onSubmit={handlePublicar}>
          <textarea
            className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-gray-50 focus:bg-white transition-colors"
            placeholder="Escribe un comunicado, bienvenida o aviso..."
            rows="3"
            value={nuevoMensaje}
            onChange={(e) => setNuevoMensaje(e.target.value)}
          />
          <div className="flex justify-end mt-2">
            <button
              type="submit"
              disabled={!nuevoMensaje.trim()}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={16} /> Publicar
            </button>
          </div>
        </form>
      </div>

      {/* Lista de Publicaciones */}
      <div className="space-y-4">
        {loading ? (
          <p className="text-center text-gray-400">Cargando novedades...</p>
        ) : posts.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <Info className="mx-auto text-gray-300 mb-2" size={32} />
            <p className="text-gray-500">Aún no hay anuncios en este curso.</p>
          </div>
        ) : (
          posts.map((post) => (
            <div
              key={post.id}
              className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex gap-4 animate-in fade-in slide-in-from-bottom-2"
            >
              <div className="shrink-0">
                {post.foto_perfil ? (
                  <img
                    src={`https://api-universidad-c5o8.onrender.com/uploads/perfiles/${post.foto_perfil}`}
                    alt="Avatar"
                    className="w-12 h-12 rounded-full object-cover border border-gray-200"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg">
                    {post.nombre.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-bold text-gray-900 text-base">
                      {post.nombre} {post.apellido_paterno}
                    </span>
                    <span className="text-xs text-gray-400 block mt-0.5">
                      {new Date(post.fecha).toLocaleString("es-MX", {
                        dateStyle: "full",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>
                  {(user.rol === "admin" || user.id === post.usuario_id) && (
                    <button
                      onClick={() => handleEliminar(post.id)}
                      className="text-gray-400 hover:text-red-500 p-1"
                      title="Eliminar"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                <p className="text-gray-700 mt-3 whitespace-pre-wrap leading-relaxed text-sm">
                  {post.mensaje}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MuroDocentePage;
