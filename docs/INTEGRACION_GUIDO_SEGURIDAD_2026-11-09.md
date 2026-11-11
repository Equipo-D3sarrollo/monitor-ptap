# Integración de Guido y seguridad — 9 de noviembre de 2026

## Alcance y respaldo

Se integró en la copia ZIP local la rama `guido` en el commit
`614a4b97c23495c73db53f702227cc74e55cd435`. Incluye la base de `yosh`
`72f46d4471671e1d30693aabbffbf9f8a67b0ff5`, necesaria porque esta copia local
partía de `main` `184b350`. El cambio propio de Guido respecto de Yosh abarcaba
49 archivos; la diferencia completa desde la base antigua abarcaba 415.

Se compararon base, copia local y rama entrante. Se conservaron las correcciones
locales de seguridad, el test OPC UA adaptado y las novedades 1.4.0/1.4.1. No se
modificaron ramas remotas ni se inicializó Git en el ZIP.

El respaldo de los archivos afectados, las versiones base y entrante y el manifiesto
de integración se guardaron fuera del proyecto, en:

`C:\Users\User\.codex\visualizations\2026\11\05\01a1ad60-7cf6-78e2-9526-24f89d0ef545\integration-2026-11-09`

## Cambios aplicados

- Login y tablero de Guido: Poppins, fondo de agua, selector de plantas, estados,
  anomalías, caudalímetros y tanques. Se incorporaron sus servicios, tipos y pruebas.
- Base funcional de Yosh: novedades, notificaciones y aislamiento por cuenta/planta,
  permisos, validaciones de mandos y simulación local. Se copiaron las migraciones
  0014–0016, pero **no se ejecutaron contra ninguna base de datos**.
- Ajustes de integración: referencias del login compatibles con React Native 0.88;
  importación de `BotonSilencio` ahora utilizada por el nuevo caudalímetro; valores de
  animación estables siguiendo el patrón existente de `TankGaugeCard`.
- Se conservó `web.output: single`, la retirada de `newArchEnabled` y Android SDK 37.
  La configuración de notificaciones de Guido incluye un manejador global explícito;
  el antiguo ajuste local que las suprimía en primer plano fue reemplazado por él.

## Dependencias y prevención

- Node 26.12.1 y npm 11.20.0 dentro de Docker, de acuerdo con `.nvmrc` y `engines`.
  No se actualizó Node ni se instalaron dependencias en Windows.
- Imagen oficial fijada por digest:
  `node:26.12.1-bookworm@sha256:3b764117159bda01d2396391e7789b6a9106af9729cfd001ef55e98557868310`.
  `.devcontainer/Dockerfile` añade `iputils-ping` para el diagnóstico de conexión,
  retirando su capacidad de archivo. ICMP se limita al grupo 1000 dentro del contenedor;
  no se añade `NET_RAW` ni se modifica el sistema de Windows. Se actualizaron los
  paquetes base desde los repositorios Debian antes de construir la imagen local
  `aquora-dev:node26-security`.
- Entorno de desarrollo como usuario `node`, sin capacidades Linux y con
  `no-new-privileges` y límites de CPU/memoria. Dependencias en los tres volúmenes
  Docker existentes y un cuarto independiente para la herramienta PLC.
- Lockfile combinado generado desde los manifiestos y reproducido con
  `npm ci --ignore-scripts`. `.npmrc` y Dev Container deshabilitan scripts de instalación
  por defecto. La herramienta PLC se comprobó separadamente en `/tmp` del contenedor.
- Expo 58.0.23, React Native 0.88.1, NestJS 12.4.2 y Nodemailer 10.4.0 efectivos.
  Se conservaron los overrides de glob, minimatch, Multer y shell-quote.
- Se incorporó el parche local atribuido `deepmerge` 4.3.1-ptap.1 y sus cuatro
  regresiones. Es una modificación mantenida por el proyecto, no una corrección
  oficial publicada por upstream; requiere seguimiento propio.
- CI local preparado para PR a `main` y `yosh`: instalación sin scripts, auditoría
  obligatoria desde severidad baja, build de shared, tipos, lint, regresiones de
  seguridad, pruebas API/móvil y exportación web. YAML validado; falta subirlo para
  ejecutarlo en GitHub Actions. Acciones fijadas a commits oficiales comprobados,
  token con permiso de lectura y sin conservar credenciales de checkout.
- Dependabot configurado semanalmente para el monorepo, la herramienta PLC, la imagen
  Docker y las acciones de CI.
  El archivo está preparado localmente; no se crearon PR ni se activaron opciones remotas.

## Resultados comprobados

| Comprobación | Resultado |
|---|---|
| npm audit monorepo, API y móvil | 0 vulnerabilidades conocidas |
| npm audit herramienta PLC | 0 vulnerabilidades conocidas |
| Firmas de registro | 1211 verificadas; 384 atestaciones |
| Regresiones deepmerge | 4/4 |
| Pruebas móviles | 287/287 |
| Suite API completa | 754/754 |
| Pruebas operativas de seguridad | 37/37, sin ejecutar despliegues |
| Regresión de novedades actualizada | 10/10; primero 1.4.1 y 1.4.0 |
| Diagnóstico ICMP como usuario node | Aprobado; capacidades efectivas 0, no-new-privileges activo |
| Typecheck API, móvil, shared y herramienta PLC | Aprobado |
| Lint workspaces | 0 errores; 101 advertencias de estilo en API |
| Lint completo de apps/mobile | 0 errores; 5 advertencias en efectos y tipos de arrays |
| Expo install --check / Doctor | Al día / 20 de 20 |
| Build shared + API | Aprobado |
| Exportación web | Aprobada; salida temporal Docker |
| Bundle JavaScript Android | Aprobado; Hermes, 4 MB |
| Prebuild Android | Aprobado en copia temporal Docker |
| APK Android nativa | Debug arm64 aprobada; Gradle: BUILD SUCCESSFUL |
| Login en navegador | Revisado a 1366 × 768 y 360 × 800 |

Las pruebas API se ejecutaron con fixtures, servidores OPC locales y una copia
temporal completa de código/configuración. Las pruebas que necesitan Git usaron un
repositorio temporal con el `.gitignore` del proyecto. No se modificó una base de
datos de producción ni se enviaron órdenes a un PLC real.

La suite API se repitió en la imagen final endurecida: 754/754 como usuario `node`.
Los cuatro directorios `node_modules` de Windows están vacíos. La PKI de prueba
permaneció en la copia temporal Docker; se retiró junto con ella al guardar los resultados.

Los resultados de auditoría, SBOM CycloneDX y registros están en
`docs/security-audit/2026-11-09/`. Las capturas y el alcance visual pendiente están en
`docs/revision-visual/2026-11/`.

La APK de comprobación (79 MB) quedó fuera del repositorio, en la carpeta de respaldo
indicada arriba, bajo `artifacts/aquora-debug-arm64.apk`. Su SHA256 es
`901E56D6D01470DE5F2BB30F7CEDFFD188330B03AA57A415D7E6F43DAF95280A`.
Es `com.ptap.monitor`, versión 1.4.1, versionCode 10, arm64 y **debuggable**. Comprueba
compilación/enlace nativo, no una entrega de producción: requiere el entorno de
desarrollo y no acredita la firma de distribución, el resultado de R8 ni FCM.

El primer intento paralelo dejó Docker sin respuesta. Se recuperó exclusivamente su
distribución WSL y se compiló en serie, con Gradle de un trabajador, heap de 1 GB y
Ninja `-j1` en el contenedor auxiliar. El segundo intento terminó en 6 min 49 s.
No se modificó el SDK Android de Windows. Tras guardar la APK y el registro, se
restauró la propiedad de los volúmenes al usuario `node` y se retiró el auxiliar,
incluidos el SDK/NDK y la caché Gradle descargados dentro de él.

## Pendientes antes de publicar

Para esta revisión se levantó una base MySQL separada y un único administrador temporal,
`aquora.preview@example.test`. Sus datos son sintéticos y viven en Docker. La API fuerza el
simulador; el mapping real no se alteró. El tablero se comprobó en escritorio y viewport
móvil. Falta ejecutar la APK en un teléfono o emulador, que no está disponible en este equipo.

1. Preparar y verificar una build **release** con configuración y firma autorizadas.
   La APK debug y la exportación JS ya están comprobadas; no sustituyen esa entrega.
2. Validar en teléfono: navegación, cambios de sesión/planta, notificaciones en primer
   plano/cerrada, tarea de fondo y movimiento reducido. No hay evidencia física todavía.
3. Preparar una API/MySQL de pruebas, aplicar allí las migraciones y completar las
   capturas protegidas con una cuenta autorizada. Se revisó visualmente el login.
4. Para producción: configurar HTTPS/API, Firebase Android y credenciales de servidor
   autorizadas; verificar permisos, PKI y mandos con el responsable de la planta.
   No se generaron ni inventaron credenciales. Una build sin Firebase no acredita FCM.
5. Revisar el diff en una copia Git, subirlo a la rama elegida y obtener CI verde.
   Contrastar las fechas de Novedades con el registro de publicaciones.

La corrección de dependencias y los controles preventivos locales están hechos.
El cierre de publicación requiere las validaciones anteriores. Cero avisos de npm
no equivale a ausencia de todo riesgo, no audita completamente el sistema operativo
de la imagen ni diagnostica si Windows tiene malware.
