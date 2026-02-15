import React, { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import axios from "axios";
import {
  Folder,
  FileText,
  UploadCloud,
  Trash2,
  Plus,
  ArrowLeft,
  Home,
  Download,
  Share2,
  Users,
  Link,
  Copy,
  Check,
  X,
  Eye,
  Edit,
  Clock,
  Search,
  ExternalLink,
  Shield,
  UserPlus,
  Loader,
} from "lucide-react";

const ExcelEditorModal = ({ archivo, onClose, onSave }) => {
  const [data, setData] = useState([]);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const leerArchivo = async () => {
      try {
        const response = await axios.get(
          `https://api-universidad-c5o8.onrender.com${archivo.url}`,
          { responseType: "arraybuffer" },
        );
        const workbook = XLSX.read(response.data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Obtenemos los datos como matriz (filas y columnas)
        let jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Si está vacío, iniciamos con una celda
        if (!jsonData || jsonData.length === 0) jsonData = [[""]];

        // Normalizar: Asegurar que todas las filas tengan el mismo número de columnas
        const maxCols = Math.max(...jsonData.map((row) => row.length));
        const normalizedData = jsonData.map((row) => {
          const newRow = [...row];
          while (newRow.length < maxCols) newRow.push("");
          return newRow;
        });

        setData(normalizedData);
      } catch (error) {
        alert("No se pudo leer el Excel.");
        onClose();
      }
    };
    leerArchivo();
  }, [archivo]);

  // Editar celda
  const handleCellChange = (rowIndex, colIndex, value) => {
    const newData = [...data];
    newData[rowIndex][colIndex] = value;
    setData(newData);
  };

  // Agregar Fila (Abajo)
  const agregarFila = () => {
    const numCols = data.length > 0 ? data[0].length : 1;
    const nuevaFila = new Array(numCols).fill("");
    setData([...data, nuevaFila]);
  };

  // Agregar Columna (A la derecha)
  const agregarColumna = () => {
    const newData = data.map((row) => [...row, ""]); // Agregamos un espacio vacío a cada fila
    if (newData.length === 0) newData.push([""]); // Si no había filas, creamos una
    setData(newData);
  };

  // Generar letras de columna (A, B, C... AA, AB...)
  const getColumnLabel = (index) => {
    let label = "";
    let i = index;
    while (i >= 0) {
      label = String.fromCharCode((i % 26) + 65) + label;
      i = Math.floor(i / 26) - 1;
    }
    return label;
  };

  const guardar = async () => {
    setGuardando(true);
    try {
      const newWorkbook = XLSX.utils.book_new();
      const newWorksheet = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, "Hoja1");
      const excelBuffer = XLSX.write(newWorkbook, {
        bookType: "xlsx",
        type: "array",
      });
      const blob = new Blob([excelBuffer], {
        type: "application/octet-stream",
      });

      const file = new File([blob], archivo.nombre, {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      await onSave(file, archivo.ruta);
      onClose();
    } catch (error) {
      alert("Error al guardar.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col p-4 animate-in fade-in">
      <div className="bg-white rounded-lg flex-1 flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-3 border-b flex flex-col md:flex-row justify-between items-center bg-green-50 gap-3">
          <h3 className="font-bold text-green-800 flex gap-2 items-center">
            <FileText size={20} /> {archivo.nombre}
          </h3>

          <div className="flex gap-2">
            {/* BOTONES DE ACCIÓN */}
            <button
              onClick={agregarFila}
              className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 flex items-center gap-1 text-sm font-bold"
            >
              <Plus size={14} /> Fila
            </button>
            <button
              onClick={agregarColumna}
              className="px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded hover:bg-purple-100 flex items-center gap-1 text-sm font-bold"
            >
              <Plus size={14} /> Columna
            </button>

            <div className="w-px h-8 bg-gray-300 mx-1"></div>

            <button
              onClick={onClose}
              className="px-3 py-1.5 text-gray-600 hover:bg-gray-200 rounded text-sm"
            >
              Cerrar
            </button>
            <button
              onClick={guardar}
              disabled={guardando}
              className="px-4 py-1.5 bg-green-600 text-white font-bold rounded hover:bg-green-700 flex items-center gap-2 text-sm shadow-sm"
            >
              {guardando ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>

        {/* Tabla Estilo Excel */}
        <div className="flex-1 overflow-auto bg-gray-200 relative">
          <table className="border-collapse bg-white text-sm table-fixed">
            <thead>
              <tr>
                {/* Esquina vacía */}
                <th className="bg-gray-100 border border-gray-300 w-10 sticky top-0 left-0 z-20"></th>
                {/* Cabeceras de Columna (A, B, C...) */}
                {data[0]?.map((_, i) => (
                  <th
                    key={i}
                    className="bg-gray-100 border border-gray-300 p-1 min-w-[100px] font-bold text-gray-600 sticky top-0 z-10 select-none"
                  >
                    {getColumnLabel(i)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, r) => (
                <tr key={r}>
                  {/* Número de Fila (1, 2, 3...) */}
                  <td className="bg-gray-100 border border-gray-300 text-center font-bold text-gray-500 sticky left-0 z-10 select-none">
                    {r + 1}
                  </td>

                  {/* Celdas */}
                  {row.map((cell, c) => (
                    <td
                      key={c}
                      className="border border-gray-300 p-0 relative min-w-[100px] h-8"
                    >
                      <input
                        className="w-full h-full px-2 border-none outline-none focus:ring-2 focus:ring-green-500 focus:bg-green-50 focus:z-20 absolute inset-0 text-gray-800"
                        value={cell || ""}
                        onChange={(e) => handleCellChange(r, c, e.target.value)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Espacio extra al final para scroll cómodo */}
          <div className="h-20"></div>
        </div>
      </div>
    </div>
  );
};

const MiDrivePage = () => {
  const [rutaActual, setRutaActual] = useState("");
  const [ownerActual, setOwnerActual] = useState(null);
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const fileInputRef = useRef(null);

  // Estados para modales
  const [modalCompartir, setModalCompartir] = useState(false);
  const [itemSeleccionado, setItemSeleccionado] = useState(null);

  // Estados de compartir
  const [usuariosCompartidos, setUsuariosCompartidos] = useState([]);
  const [busquedaUsuarios, setBusquedaUsuarios] = useState("");
  const [usuariosDisponibles, setUsuariosDisponibles] = useState([]);
  const [buscandoUsuarios, setBuscandoUsuarios] = useState(false);
  const [permisoSeleccionado, setPermisoSeleccionado] = useState("ver");

  // Estados de enlace público
  const [enlacePublico, setEnlacePublico] = useState(null);
  const [copiado, setCopiado] = useState(false);
  const [diasExpiracion, setDiasExpiracion] = useState(7);

  const [editorExcelOpen, setEditorExcelOpen] = useState(false);
  const [archivoParaEditar, setArchivoParaEditar] = useState(null);

  // Cargar datos
  useEffect(() => {
    cargarDrive();
  }, [rutaActual]);

  const cargarDrive = async () => {
    setCargando(true);
    try {
      const token = localStorage.getItem("token");
      // Enviamos el ownerActual en la URL
      const res = await axios.get(
        `https://api-universidad-c5o8.onrender.com/api/drive/list?ruta=${rutaActual}&ownerId=${ownerActual || ""}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setItems(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDrive();
  }, [rutaActual, ownerActual]);

  // --- ACCIONES BÁSICAS ---

  const crearCarpeta = async () => {
    const nombre = prompt("Nombre de la nueva carpeta:");
    if (!nombre) return;
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "https://api-universidad-c5o8.onrender.com/api/drive/folder",
        { nombre, rutaActual },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      cargarDrive();
    } catch (error) {
      alert("Error al crear carpeta");
    }
  };

  const handleGuardarExcel = async (nuevoArchivo, rutaCompleta) => {
    // Calculamos la carpeta padre basándonos en la ruta del archivo
    // Ejemplo: "Carpetas/Trabajo/excel.xlsx" -> "Carpetas/Trabajo"
    const partes = rutaCompleta.split("/");
    partes.pop(); // Quitamos el nombre del archivo
    const carpetaPadre = partes.join("/");

    // Usamos FormData igual que en tu subida normal
    const formData = new FormData();
    formData.append("rutaActual", carpetaPadre); // IMPORTANTE: Ruta primero
    formData.append("archivo", nuevoArchivo);

    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "https://api-universidad-c5o8.onrender.com/api/drive/upload",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        },
      );
      cargarDrive(); // Recargamos para ver la fecha actualizada
      alert("Archivo actualizado con éxito.");
    } catch (e) {
      console.error(e);
      alert("Error al sobrescribir el archivo.");
    }
  };

  const handleClickItem = (item) => {
    if (item.tipo === "carpeta") {
      // Lógica de carpetas (la que ya tenías)
      const idDueno = item.es_compartido_root ? item.owner_id : null;
      const nombreReal = item.es_compartido_root
        ? item.ruta.split("/").pop()
        : item.nombre;
      entrarCarpeta(nombreReal, idDueno);
    } else {
      // --- LÓGICA DE ARCHIVOS ---

      const extension = item.nombre.split(".").pop().toLowerCase();

      // 1. EXCEL -> Editor
      if (["xlsx", "xls", "csv"].includes(extension)) {
        // Validar permiso: Si no es mío y no tengo permiso de editar, solo descargo
        if (!item.es_propio && item.permiso !== "editar") {
          handleDescargar(item);
        } else {
          setArchivoParaEditar(item);
          setEditorExcelOpen(true);
        }
      }
      // 2. PDF / IMAGEN / TXT -> Visualizar en Pestaña
      else if (
        ["pdf", "jpg", "jpeg", "png", "gif", "txt"].includes(extension)
      ) {
        window.open(
          `https://api-universidad-c5o8.onrender.com${item.url}`,
          "_blank",
        );
      }
      // 3. WORD / PPT / ZIP / OTROS -> Descargar Directo
      else {
        handleDescargar(item);
      }
    }
  };

  const subirArchivo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // ✅ AGREGAR ESTOS LOGS
    console.log("🔍 Estado actual:");
    console.log("- rutaActual:", rutaActual);
    console.log("- Archivo:", file.name);

    setSubiendo(true);
    const formData = new FormData();
    formData.append("rutaActual", rutaActual);
    formData.append("archivo", file);

    // ✅ AGREGAR ESTE LOG
    console.log("- FormData rutaActual:", formData.get("rutaActual"));

    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "https://api-universidad-c5o8.onrender.com/api/drive/upload",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        },
      );
      cargarDrive();
    } catch (error) {
      alert("Error al subir archivo");
    } finally {
      setSubiendo(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // --- FUNCIÓN DE DESCARGA FORZADA ---
  const handleDescargar = async (item) => {
    try {
      const response = await axios.get(
        `https://api-universidad-c5o8.onrender.com${item.url}`,
        {
          responseType: "blob", // Importante: recibir como archivo binario
        },
      );

      // Crear un enlace temporal en el navegador
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", item.nombre); // Forzar nombre del archivo
      document.body.appendChild(link);
      link.click();

      // Limpieza
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error al descargar:", error);
      alert("No se pudo descargar el archivo.");
    }
  };

  const eliminarItem = async (ruta, tipo) => {
    if (!window.confirm(`¿Seguro que quieres eliminar este ${tipo}?`)) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `https://api-universidad-c5o8.onrender.com/api/drive/item?ruta=${ruta}&tipo=${tipo}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      cargarDrive();
    } catch (error) {
      alert("No se pudo eliminar.");
    }
  };

  // --- FUNCIONES DE COMPARTIR ---

  const abrirModalCompartir = async (item) => {
    setItemSeleccionado(item);
    setModalCompartir(true);
    setEnlacePublico(null);
    setUsuariosCompartidos([]);
    setBusquedaUsuarios("");
    setUsuariosDisponibles([]);

    // Cargar usuarios con los que ya está compartido
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `https://api-universidad-c5o8.onrender.com/api/drive/compartidos?ruta=${item.ruta}&tipo=${item.tipo}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setUsuariosCompartidos(res.data);
    } catch (error) {
      console.error("Error cargando compartidos:", error);
    }

    // Verificar si ya tiene enlace público
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `https://api-universidad-c5o8.onrender.com/api/drive/enlace-publico?ruta=${item.ruta}&tipo=${item.tipo}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.data.enlace) {
        setEnlacePublico(res.data.enlace);
      }
    } catch (error) {
      console.error("Error obteniendo enlace:", error);
    }
  };

  const buscarUsuarios = async (query) => {
    setBusquedaUsuarios(query);

    if (query.length < 2) {
      setUsuariosDisponibles([]);
      return;
    }

    setBuscandoUsuarios(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `https://api-universidad-c5o8.onrender.com/api/drive/buscar-usuarios?q=${query}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setUsuariosDisponibles(res.data);
    } catch (error) {
      console.error("Error buscando usuarios:", error);
    } finally {
      setBuscandoUsuarios(false);
    }
  };

  const compartirConUsuario = async (usuario) => {
    if (!itemSeleccionado) return;

    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "https://api-universidad-c5o8.onrender.com/api/drive/compartir",
        {
          ruta: itemSeleccionado.ruta,
          tipo: itemSeleccionado.tipo,
          usuario_id: usuario.id,
          permiso: permisoSeleccionado,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      // Recargar lista de compartidos
      const res = await axios.get(
        `https://api-universidad-c5o8.onrender.com/api/drive/compartidos?ruta=${itemSeleccionado.ruta}&tipo=${itemSeleccionado.tipo}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setUsuariosCompartidos(res.data);
      setBusquedaUsuarios("");
      setUsuariosDisponibles([]);
    } catch (error) {
      console.error("Error compartiendo:", error);
      alert("Error al compartir");
    }
  };

  const eliminarAcceso = async (compartidoId) => {
    if (!window.confirm("¿Eliminar el acceso de este usuario?")) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `https://api-universidad-c5o8.onrender.com/api/drive/compartir/${compartidoId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      // Actualizar lista
      setUsuariosCompartidos(
        usuariosCompartidos.filter((u) => u.id !== compartidoId),
      );
    } catch (error) {
      console.error("Error eliminando acceso:", error);
      alert("Error al eliminar acceso");
    }
  };

  const cambiarPermiso = async (compartidoId, nuevoPermiso) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `https://api-universidad-c5o8.onrender.com/api/drive/compartir/${compartidoId}`,
        { permiso: nuevoPermiso },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      // Actualizar localmente
      setUsuariosCompartidos(
        usuariosCompartidos.map((u) =>
          u.id === compartidoId ? { ...u, permiso: nuevoPermiso } : u,
        ),
      );
    } catch (error) {
      console.error("Error cambiando permiso:", error);
      alert("Error al cambiar permiso");
    }
  };

  const generarEnlacePublico = async () => {
    if (!itemSeleccionado) return;

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        "https://api-universidad-c5o8.onrender.com/api/drive/enlace-publico",
        {
          ruta: itemSeleccionado.ruta,
          tipo: itemSeleccionado.tipo,
          dias_expiracion: diasExpiracion,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setEnlacePublico(res.data.enlace);
    } catch (error) {
      console.error("Error generando enlace:", error);
      alert("Error al generar enlace público");
    }
  };

  const copiarEnlace = () => {
    if (!enlacePublico) return;
    navigator.clipboard.writeText(enlacePublico);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const desactivarEnlace = async () => {
    if (!window.confirm("¿Desactivar el enlace público?")) return;
    if (!itemSeleccionado) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `https://api-universidad-c5o8.onrender.com/api/drive/enlace-publico?ruta=${itemSeleccionado.ruta}&tipo=${itemSeleccionado.tipo}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setEnlacePublico(null);
    } catch (error) {
      console.error("Error desactivando enlace:", error);
      alert("Error al desactivar enlace");
    }
  };

  // MODIFICAR: Navegación "Entrar Carpeta"
  const entrarCarpeta = (nombre, nuevoOwnerId) => {
    // Si me pasan un nuevo ID (ej: al hacer clic en carpeta compartida), lo uso.
    // Si no, mantengo el que ya tenía (ej: navegando dentro de subcarpetas del admin).
    if (nuevoOwnerId) setOwnerActual(nuevoOwnerId);

    setRutaActual(rutaActual ? `${rutaActual}/${nombre}` : nombre);
  };

  // MODIFICAR: Navegación "Ir Arriba" (Atrás)
  const irArriba = () => {
    if (!rutaActual) return;
    const partes = rutaActual.split("/");
    partes.pop();
    const nuevaRuta = partes.join("/");

    setRutaActual(nuevaRuta);

    // Si volvemos a la raíz absoluta, reseteamos el owner a "mí mismo"
    if (nuevaRuta === "") {
      setOwnerActual(null);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            ☁️ Mi Unidad
          </h1>

          <div className="flex gap-2">
            <button
              onClick={crearCarpeta}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 shadow-sm"
            >
              <Plus size={18} /> Carpeta
            </button>

            <button
              onClick={() => fileInputRef.current.click()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm"
              disabled={subiendo}
            >
              <UploadCloud size={18} />
              {subiendo ? "Subiendo..." : "Subir Archivo"}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={subirArchivo}
            />
          </div>
        </div>

        {/* Breadcrumbs */}
        <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 mb-6 flex items-center gap-2">
          <button
            onClick={() => setRutaActual("")}
            className="p-1 hover:bg-gray-100 rounded text-gray-500"
          >
            <Home size={20} />
          </button>
          <span className="text-gray-300">/</span>
          {rutaActual && (
            <>
              <button
                onClick={irArriba}
                className="p-1 hover:bg-gray-100 rounded text-gray-500"
              >
                <ArrowLeft size={20} />
              </button>
              <span className="text-sm font-mono text-gray-600 truncate">
                {rutaActual}
              </span>
            </>
          )}
        </div>

        {/* Grid de Archivos */}
        {cargando ? (
          <div className="text-center py-20 text-gray-400">
            Cargando tu nube...
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {items.length === 0 && (
              <div className="col-span-full text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
                <p className="text-gray-400">Esta carpeta está vacía</p>
                <button
                  onClick={() => fileInputRef.current.click()}
                  className="text-blue-500 mt-2 text-sm hover:underline"
                >
                  Sube tu primer archivo
                </button>
              </div>
            )}

            {items.map((item) => {
              // Determinamos qué permisos tiene el usuario sobre este ítem
              const puedeEditar = item.es_propio || item.permiso === "editar";
              const puedeBorrar = item.es_propio; // Solo el dueño borra (regla de seguridad)
              const esExcel = item.nombre.match(/\.(xlsx|xls|csv)$/i);
              const esVisualizable = item.nombre.match(
                /\.(pdf|jpg|png|jpeg|gif)$/i,
              );

              return (
                <div
                  key={item.nombre}
                  className="group relative bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
                >
                  {/* --- ÁREA CLICKEABLE (ICONO Y NOMBRE) --- */}
                  <div
                    className="w-full flex flex-col items-center cursor-pointer"
                    onClick={() => handleClickItem(item)}
                  >
                    {/* Icono según tipo */}
                    <div className="w-16 h-16 mb-3 flex items-center justify-center text-gray-500">
                      {item.tipo === "carpeta" ? (
                        <Folder
                          size={64}
                          className="text-yellow-400 fill-yellow-50"
                        />
                      ) : item.nombre.match(/\.(jpg|png|jpeg)$/i) ? (
                        <img
                          src={`https://api-universidad-c5o8.onrender.com${item.url}`}
                          className="w-full h-full object-cover rounded shadow-sm"
                          alt={item.nombre}
                        />
                      ) : esExcel ? (
                        <FileText size={50} className="text-green-500" />
                      ) : item.nombre.endsWith(".pdf") ? (
                        <FileText size={50} className="text-red-500" />
                      ) : (
                        <FileText size={50} className="text-blue-400" />
                      )}
                    </div>

                    {/* Nombre del archivo */}
                    <p
                      className="text-sm font-medium text-gray-700 truncate w-full text-center"
                      title={item.nombre}
                    >
                      {item.nombre}
                    </p>
                  </div>

                  {/* --- BARRA DE ACCIONES (Aparece en Hover) --- */}
                  <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm rounded-lg p-1 shadow-sm">
                    {/* 1. BOTÓN DESCARGAR (Siempre visible para archivos) */}
                    {item.tipo !== "carpeta" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDescargar(item);
                        }}
                        className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="Descargar"
                      >
                        <Download size={16} />
                      </button>
                    )}

                    {/* 2. BOTÓN EDITAR (Solo Excel y con permiso) */}
                    {item.tipo !== "carpeta" && esExcel && puedeEditar && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setArchivoParaEditar(item);
                          setEditorExcelOpen(true);
                        }}
                        className="p-1.5 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors"
                        title="Editar Hoja de Cálculo"
                      >
                        <Edit size={16} />
                      </button>
                    )}

                    {/* 3. BOTÓN VER (Solo PDF/Imágenes) */}
                    {item.tipo !== "carpeta" && esVisualizable && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(
                            `https://api-universidad-c5o8.onrender.com${item.url}`,
                            "_blank",
                          );
                        }}
                        className="p-1.5 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
                        title="Visualizar"
                      >
                        <Eye size={16} />
                      </button>
                    )}

                    {/* 4. BOTÓN COMPARTIR (Solo Dueño) */}
                    {item.es_propio && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          abrirModalCompartir(item);
                        }}
                        className="p-1.5 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                        title="Compartir"
                      >
                        <Share2 size={16} />
                      </button>
                    )}

                    {/* 5. BOTÓN BORRAR (Solo Dueño) */}
                    {puedeBorrar && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          eliminarItem(item.ruta, item.tipo);
                        }}
                        className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* MODAL DE COMPARTIR */}
        {modalCompartir && itemSeleccionado && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header del modal */}
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <Share2 size={24} className="text-blue-500" />
                    Compartir
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {itemSeleccionado.nombre}
                  </p>
                </div>
                <button
                  onClick={() => setModalCompartir(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Sección: Compartir con usuarios */}
                <div>
                  <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Users size={18} />
                    Compartir con usuarios
                  </h3>

                  {/* Buscador de usuarios */}
                  <div className="relative mb-4">
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <Search
                          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                          size={18}
                        />
                        <input
                          type="text"
                          placeholder="Buscar usuario por nombre o matrícula..."
                          value={busquedaUsuarios}
                          onChange={(e) => buscarUsuarios(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <select
                        value={permisoSeleccionado}
                        onChange={(e) => setPermisoSeleccionado(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="ver">👁️ Ver</option>
                        <option value="descargar">⬇️ Descargar</option>
                        <option value="editar">✏️ Editar</option>
                      </select>
                    </div>

                    {/* Resultados de búsqueda */}
                    {buscandoUsuarios && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center">
                        <Loader className="animate-spin mx-auto text-blue-500" />
                      </div>
                    )}

                    {usuariosDisponibles.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto z-10">
                        {usuariosDisponibles.map((usuario) => (
                          <button
                            key={usuario.id}
                            onClick={() => compartirConUsuario(usuario)}
                            className="w-full p-3 hover:bg-gray-50 flex items-center gap-3 text-left border-b last:border-b-0"
                          >
                            <img
                              src={
                                usuario.foto_perfil ||
                                `https://ui-avatars.com/api/?name=${usuario.nombre}`
                              }
                              alt={usuario.nombre}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                            <div className="flex-1">
                              <p className="font-medium text-gray-800">
                                {usuario.nombre} {usuario.apellido_paterno}
                              </p>
                              <p className="text-sm text-gray-500">
                                {usuario.matricula} • {usuario.rol}
                              </p>
                            </div>
                            <UserPlus size={18} className="text-blue-500" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Lista de usuarios con acceso */}
                  {usuariosCompartidos.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600 mb-2">
                        Usuarios con acceso:
                      </p>
                      {usuariosCompartidos.map((compartido) => (
                        <div
                          key={compartido.id}
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                        >
                          <img
                            src={
                              compartido.foto_perfil ||
                              `https://ui-avatars.com/api/?name=${compartido.nombre}`
                            }
                            alt={compartido.nombre}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div className="flex-1">
                            <p className="font-medium text-gray-800">
                              {compartido.nombre} {compartido.apellido_paterno}
                            </p>
                            <p className="text-sm text-gray-500">
                              {compartido.matricula}
                            </p>
                          </div>
                          <select
                            value={compartido.permiso}
                            onChange={(e) =>
                              cambiarPermiso(compartido.id, e.target.value)
                            }
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                          >
                            <option value="ver">Ver</option>
                            <option value="descargar">Descargar</option>
                            <option value="editar">Editar</option>
                          </select>
                          <button
                            onClick={() => eliminarAcceso(compartido.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-full"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Separador */}
                <div className="border-t border-gray-200"></div>

                {/* Sección: Enlace público */}
                <div>
                  <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Link size={18} />
                    Enlace público
                  </h3>

                  {!enlacePublico ? (
                    <div>
                      <p className="text-sm text-gray-600 mb-3">
                        Cualquier persona con el enlace podrá acceder
                      </p>
                      <div className="flex gap-2 items-center mb-3">
                        <label className="text-sm text-gray-600">
                          Expira en:
                        </label>
                        <select
                          value={diasExpiracion}
                          onChange={(e) =>
                            setDiasExpiracion(parseInt(e.target.value))
                          }
                          className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
                        >
                          <option value={1}>1 día</option>
                          <option value={7}>7 días</option>
                          <option value={30}>30 días</option>
                          <option value={0}>Nunca</option>
                        </select>
                      </div>
                      <button
                        onClick={generarEnlacePublico}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                      >
                        <ExternalLink size={18} />
                        Generar enlace
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={enlacePublico}
                          readOnly
                          className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-mono"
                        />
                        <button
                          onClick={copiarEnlace}
                          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2"
                        >
                          {copiado ? (
                            <>
                              <Check size={18} className="text-green-500" />
                              Copiado
                            </>
                          ) : (
                            <>
                              <Copy size={18} />
                              Copiar
                            </>
                          )}
                        </button>
                      </div>
                      <button
                        onClick={desactivarEnlace}
                        className="text-sm text-red-500 hover:underline"
                      >
                        Desactivar enlace
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        {/* MODAL EDITOR EXCEL */}
        {editorExcelOpen && archivoParaEditar && (
          <ExcelEditorModal
            archivo={archivoParaEditar}
            onClose={() => setEditorExcelOpen(false)}
            onSave={handleGuardarExcel}
          />
        )}
      </div>{" "}
      {/* Cierre de max-w-7xl */}
    </div> // Cierre del div principal
  );
};

export default MiDrivePage;
