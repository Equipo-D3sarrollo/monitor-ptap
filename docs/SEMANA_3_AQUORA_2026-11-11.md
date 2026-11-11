# Semana 3 Aquora — desarrollo

Fecha de trabajo: 11 de noviembre de 2026 (Bogotá). Fuente: plan DES-PLN-2026-000 v1.0, páginas 6–7. El alcance solicitado es código frontend/backend; no sustituye sesiones ni aprobaciones humanas.

## Trabajo

| Tarea | Resultado técnico |
|---|---|
| A9 — Mauricio: informe por planta | Nuevo `GET /api/diagnostics/plant/:plantId` con `system_config`, validación de planta, composición pura, red/puente globales y buffers/señales/anomalías por planta. Consulta normal desde caché; `?probe=deep` realiza lecturas mediante la sesión OPC existente. Sin timestamp válido o sin calidad Good: indeterminado. La CLI reutiliza el clasificador de frescura. |
| A10 — Guido: Ayuda | FAQ local de 83 códigos vigentes, prueba de cobertura contra el catálogo, búsqueda, respuestas desplegables y acceso desde Ajustes. Conserva estilos corporativos y no añade dependencias. |
| A11 — Guido: mejoras visuales | Ya existían cinco correcciones técnicas: navegación sin superposición, región principal accesible, contraste de datos congelados, tipografía consistente y resultados de válvulas ligados a su planta. Se conservaron, sin repetirlas ni atribuirlas a una sesión de operadores no realizada. |
| J3 — herramientas de estabilidad | El harness ya existía. Se corrigió el reporte para exigir la duración objetivo (mínimo 24 h) y cierre completo; seis casos offline distinguen 24/72 h, interrupción y truncado. Esto no acredita una nueva corrida real de 72 h. |

J4 es una reunión y queda fuera del alcance de código acordado. No se implementaron decisiones de historial/alertas sin definición de alcance.

## Integración Git

Se inicializó Git sobre la carpeta existente sin sobrescribir sus archivos. La rama de trabajo `trabajo/semana3-aquora-2026-11` se basa en `origin/guido` `2ed45c2`. Se incorporaron por comparación de tres versiones las novedades remotas de Cabuyo y se comprobó que el login local conserva el tipado de referencias corregido por Guido. No se modificó `yosh` ni se desplegó producción.

El pull request incluye también los cambios locales previos de seguridad, interfaz y semanas 1–2 que aún no estaban publicados. Se habilitó CI para PR dirigidos a `guido`. Los entornos, cachés y transcripciones locales no forman parte del código a publicar.

## Validación

Las pruebas se ejecutaron en Docker con Node 26.12.1, sin instalar dependencias en Windows:

- API completa: 777/777 aprobadas; incluye acceso HTTP 401/403, reporte normal sin lecturas directas y deep explícito.
- Móvil: 305/305 aprobadas, incluidas cobertura FAQ y búsqueda/vacío.
- Herramientas web: 5/5; tipos de API/móvil/shared y de pruebas API aprobados; exportación web aprobada.
- Seguridad de dependencias: 4/4 regresiones; `npm audit --audit-level=low`: cero vulnerabilidades conocidas.
- Lint integrado: salida 0, ningún error; 103 advertencias en API, ninguna en móvil/shared. No se presentan las advertencias como corregidas.
- La primera comprobación de tipos encontró la caché de rutas Expo anterior a Ayuda. Se regeneró con `expo start --offline --port 8082 --max-workers 1` y se detuvo Metro. No se añadieron casts ni se debilitó TypeScript; la comprobación final aprobó.
- Navegador: la nueva ruta dejó de ser inexistente y redirige al login sin sesión; no se comprobó visualmente el interior de Ayuda autenticado a 1366/360 ni en APK física en esta tarea.

Se revisaron los archivos a publicar para excluir `.env`, cachés, logs y claves privadas. Los archivos de licencia de fuentes se conservan sin alterar el texto original.

Límites de aceptación: la compilación web no demuestra una APK física ni lecturas de campo. El objetivo Lighthouse móvil >=90 seguía abierto en la auditoría anterior y no se declara cerrado por estas tareas.
