# YeyoSistema — Instrucciones de instalación y compilación

## LO QUE NECESITAS INSTALAR (solo una vez)

### 1. Node.js
- Ve a: https://nodejs.org
- Descarga la versión **LTS** (la que dice "Recommended")
- Instálala con todas las opciones por defecto
- Reinicia tu computadora después de instalar

### 2. Verifica que Node se instaló
Abre **Símbolo del sistema** (busca "cmd" en el menú inicio) y escribe:
```
node --version
npm --version
```
Deben mostrar números de versión. Si sí los muestran, Node está listo.

---

## PASOS PARA COMPILAR EL .EXE

### Paso 1 — Coloca los archivos
Copia la carpeta **yeyosistema** a cualquier lugar de tu computadora.
Por ejemplo: `C:\Users\TuNombre\Desktop\yeyosistema`

### Paso 2 — Abre la consola en esa carpeta
- Abre el Explorador de Windows
- Navega hasta la carpeta `yeyosistema`
- En la barra de dirección (donde dice la ruta), escribe `cmd` y presiona Enter
- Se abrirá la consola ya posicionada en esa carpeta

### Paso 3 — Instala dependencias
```
npm install
```
Esto descargará todos los paquetes necesarios (tarda unos minutos la primera vez).

### Paso 4 — PRUEBA la app antes de compilar
```
npm start
```
Se abrirá la ventana de YeyoSistema. Verifica que todo funcione.
Ciérrala cuando termines de probar.

### Paso 5 — Compila el instalador .exe
```
npm run build
```
Esto tarda entre 2 y 5 minutos. Al terminar, se creará una carpeta llamada `dist` con:
- `YeyoSistema Setup 1.0.0.exe` ← Este es tu instalador

### Paso 6 — Instala la app
Ejecuta el `YeyoSistema Setup 1.0.0.exe`.
Después de instalar, tendrás un ícono en el escritorio llamado **YeyoSistema**.

---

## ¿DÓNDE SE GUARDAN LOS DATOS?

Los datos se guardan en una base de datos SQLite en:
```
C:\Users\TuNombre\AppData\Roaming\yeyo-sistema\yeyosistema.db
```
**No borres esa carpeta.** Ahí está toda la información de clientes y cotizaciones.

---

## PREGUNTAS FRECUENTES

**¿Puedo mover el .exe a otra computadora?**
Sí, pero debes instalar en cada computadora. Los datos quedan en cada máquina por separado.

**¿Qué pasa si ya tenía datos en la versión web?**
La versión web usaba localStorage del navegador. Los datos no se migran automáticamente, hay que re-capturarlos.

**¿Puedo actualizar la app después?**
Sí. Modifica los archivos, vuelve a ejecutar `npm run build` y tendrás un nuevo instalador.

**El comando npm install da error en better-sqlite3**
Ese paquete necesita compilarse. Instala las herramientas de Windows ejecutando esto en cmd como administrador:
```
npm install --global windows-build-tools
```
Si sigue fallando, abre cmd como administrador y repite el `npm install`.
