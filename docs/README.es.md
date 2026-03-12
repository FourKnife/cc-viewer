# CC-Viewer

Sistema de monitoreo de solicitudes para Claude Code que captura y visualiza en tiempo real todas las solicitudes y respuestas de API (texto original, sin recortes). Permite a los desarrolladores monitorear su Context para revisar y solucionar problemas durante el Vibe Coding.
La última versión de CC-Viewer también ofrece soluciones de programación web con despliegue en servidor, así como herramientas de programación para dispositivos móviles. Te invitamos a utilizarlo en tus propios proyectos; en el futuro se abrirán más funciones y se admitirá el despliegue en la nube.

Primero veamos la parte interesante, puedes verlo en dispositivos móviles:

<img width="1700" height="790" alt="image" src="https://github.com/user-attachments/assets/da3e519f-ff66-4cd2-81d1-f4e131215f6c" />

<font color="#999">(La compatibilidad con iOS en la versión actual no es muy buena, se optimizará para iOS el 01/04/2026)</font>

[English](../README.md) | [简体中文](./README.zh.md) | [繁體中文](./README.zh-TW.md) | [한국어](./README.ko.md) | [日本語](./README.ja.md) | [Deutsch](./README.de.md) | Español | [Français](./README.fr.md) | [Italiano](./README.it.md) | [Dansk](./README.da.md) | [Polski](./README.pl.md) | [Русский](./README.ru.md) | [العربية](./README.ar.md) | [Norsk](./README.no.md) | [Português (Brasil)](./README.pt-BR.md) | [ไทย](./README.th.md) | [Türkçe](./README.tr.md) | [Українська](./README.uk.md)

## Uso

### Instalación

```bash
npm install -g cc-viewer --registry=https://registry.npmjs.org
```

### Modo programación

ccv es un reemplazo directo de claude, todos los parámetros se pasan directamente a claude, mientras se inicia el Web Viewer.

```bash
ccv                    # == claude (modo interactivo)
ccv -c                 # == claude --continue (continuar última conversación)
ccv -r                 # == claude --resume (reanudar conversación)
ccv -p "hello"         # == claude --print "hello" (modo impresión)
ccv --d                # == claude --dangerously-skip-permissions (atajo)
ccv --model opus       # == claude --model opus
```

Una vez iniciado el modo programación, se abrirá automáticamente la página web.

Puedes usar Claude directamente desde la página web, y al mismo tiempo consultar los mensajes completos de las solicitudes y ver los cambios en el código.

Y lo que es aún más atractivo: ¡incluso puedes programar desde un dispositivo móvil!


### Modo logger

⚠️ Si todavía prefieres usar la herramienta nativa de claude o el plugin de VS Code, usa este modo.

En este modo, al iniciar ```claude``` o ```claude --dangerously-skip-permissions```

se iniciará automáticamente un proceso de registro que guarda los logs de solicitudes en ~/.claude/cc-viewer/*tuproyecto*/date.jsonl

Iniciar modo logger:
```bash
ccv -logger
```

Cuando no se puede imprimir el puerto específico en la consola, el primer puerto de inicio predeterminado es 127.0.0.1:7008. Si existen múltiples instancias, se incrementan al final, como 7009, 7010

Este comando detecta automáticamente el método de instalación local de Claude Code (NPM o Native Install) y se adapta en consecuencia.

- **Claude Code versión NPM**: Inyecta automáticamente el script interceptor en `cli.js` de Claude Code.
- **Claude Code versión Native**: Detecta automáticamente el binario `claude`, configura un proxy transparente local y establece un Zsh Shell Hook para redirigir el tráfico automáticamente.
- Se recomienda usar Claude Code instalado mediante NPM para este proyecto.

Desinstalar modo logger:
```bash
ccv --uninstall
```

### Solución de problemas (Troubleshooting)

Si tienes problemas para iniciar, existe una solución de diagnóstico definitiva:
Paso 1: abre Claude Code en cualquier directorio;
Paso 2: dale a Claude Code la siguiente instrucción:
```
He instalado el paquete npm cc-viewer, pero después de ejecutar ccv sigue sin funcionar correctamente. Revisa cli.js y findcc.js de cc-viewer, y adapta la implementación local de Claude Code según el entorno específico. Intenta limitar el alcance de los cambios a findcc.js.
```
¡Dejar que Claude Code inspeccione los errores por sí mismo es más efectivo que preguntarle a cualquier persona o leer cualquier documentación!

Una vez completada la instrucción anterior, se actualizará findcc.js. Si tu proyecto frecuentemente requiere despliegue local, o si el código bifurcado necesita resolver problemas de instalación con frecuencia, conserva este archivo para copiarlo directamente la próxima vez. En la actualidad, muchos proyectos y empresas que usan Claude Code no lo despliegan en Mac sino en servidores, por lo que el autor separó el archivo findcc.js para facilitar el seguimiento de las actualizaciones del código fuente de cc-viewer.

### Otros comandos auxiliares

Consultar
```bash
ccv -h
```

### Anulación de configuración (Configuration Override)

Si necesitas utilizar un endpoint de API personalizado (por ejemplo, un proxy corporativo), simplemente configúralo en `~/.claude/settings.json` o establece la variable de entorno `ANTHROPIC_BASE_URL`. `ccv` reconocerá automáticamente esta configuración y reenviará las solicitudes correctamente.

### Modo silencioso (Silent Mode)

De forma predeterminada, `ccv` se ejecuta en modo silencioso al envolver `claude`, lo que garantiza que la salida de tu terminal permanezca limpia e idéntica a la experiencia nativa. Todos los registros se capturan en segundo plano y son visibles en `http://localhost:7008`.

Una vez completada la configuración, usa el comando `claude` como de costumbre. Abre `http://localhost:7008` para ver la interfaz de monitoreo.


## Funciones


### Modo programación

Después de iniciar con ccv puedes ver:

<img width="1500" height="725" alt="image" src="https://github.com/user-attachments/assets/a64a381e-5a68-430c-b594-6d57dc01f4d3" />

Puedes ver directamente el diff del código después de completar la edición:

<img width="1500" height="728" alt="image" src="https://github.com/user-attachments/assets/2a4acdaa-fc5f-4dc0-9e5f-f3273f0849b2" />

Aunque puedes abrir archivos y programar manualmente, no se recomienda usar programación manual, ¡eso es programación antigua!

### Programación en dispositivos móviles

Incluso puedes escanear un código QR para programar en dispositivos móviles:

<img width="3018" height="1460" alt="image" src="https://github.com/user-attachments/assets/8debf48e-daec-420c-b37a-609f8b81cd20" />

Satisface tu imaginación sobre la programación móvil, además hay un mecanismo de plugins, si necesitas personalizar según tus hábitos de programación, puedes seguir las actualizaciones de los hooks de plugins en el futuro.

### Modo logger (ver conversación completa de Claude Code)

<img width="1500" height="720" alt="image" src="https://github.com/user-attachments/assets/519dd496-68bd-4e76-84d7-2a3d14ae3f61" />

- Captura en tiempo real todas las solicitudes de API enviadas por Claude Code, asegurando que sea el texto original, no logs recortados (¡¡¡esto es muy importante!!!)
- Identifica y marca automáticamente las solicitudes de Main Agent y Sub Agent (subtipos: Plan, Search, Bash)
- Las solicitudes de MainAgent admiten Body Diff JSON, mostrando de forma colapsada las diferencias con la solicitud anterior de MainAgent (solo muestra campos modificados/nuevos)
- Cada solicitud muestra estadísticas de uso de tokens en línea (tokens de entrada/salida, creación/lectura de caché, tasa de aciertos)
- Compatible con Claude Code Router (CCR) y otros escenarios de proxy — coincidencia de solicitudes mediante patrón de ruta API como respaldo

### Modo conversación

Haz clic en el botón «Modo conversación» en la esquina superior derecha para analizar el historial completo de conversación del Main Agent como una interfaz de chat:

<img width="1500" height="730" alt="image" src="https://github.com/user-attachments/assets/c973f142-748b-403f-b2b7-31a5d81e33e6" />

- Actualmente no admite la visualización de Agent Team
- Mensajes del usuario alineados a la derecha (burbuja azul), respuestas del Main Agent alineadas a la izquierda (burbuja oscura)
- Los bloques `thinking` están colapsados por defecto, se renderizan en Markdown, haz clic para expandir y ver el proceso de pensamiento; admite traducción con un clic (función aún inestable)
- Los mensajes de selección del usuario (AskUserQuestion) se muestran en formato de pregunta y respuesta
- Sincronización bidireccional de modos: al cambiar al modo conversación se posiciona automáticamente en la conversación correspondiente a la solicitud seleccionada; al volver al modo original se posiciona automáticamente en la solicitud seleccionada
- Panel de configuración: permite cambiar el estado de colapso predeterminado de los resultados de herramientas y bloques de pensamiento
- Navegación de conversación en móvil: en modo CLI móvil, haz clic en el botón «Navegación de conversación» en la barra superior para deslizar una vista de conversación de solo lectura y navegar por el historial completo de conversación en el móvil

### Herramientas de estadísticas

Panel flotante «Estadísticas de datos» en el área del encabezado:

<img width="1500" height="729" alt="image" src="https://github.com/user-attachments/assets/b23f9a81-fc3d-4937-9700-e70d84e4e5ce" />

- Muestra la cantidad de cache creation/read y la tasa de aciertos de caché
- Estadísticas de reconstrucción de caché: agrupadas por razón (TTL, cambio de system/tools/model, truncamiento/modificación de mensajes, cambio de key) mostrando cantidad y tokens de cache_creation
- Estadísticas de uso de herramientas: frecuencia de llamadas por herramienta, ordenadas por cantidad de llamadas
- Estadísticas de uso de Skills: frecuencia de llamadas por Skill, ordenadas por cantidad de llamadas
- Iconos de ayuda conceptual (?): haz clic para ver la documentación integrada de MainAgent, CacheRebuild y cada herramienta

### Gestión de logs

A través del menú desplegable de CC-Viewer en la esquina superior izquierda:

<img width="1200" height="672" alt="image" src="https://github.com/user-attachments/assets/8cf24f5b-9450-4790-b781-0cd074cd3b39" />

- Importar logs locales: explorar archivos de log históricos, agrupados por proyecto, se abre en nueva ventana
- Cargar archivo JSONL local: seleccionar y cargar directamente un archivo `.jsonl` local (hasta 500MB)
- Guardar log actual como: descargar el archivo de log JSONL de monitoreo actual
- Combinar logs: combinar múltiples archivos de log JSONL en una sola sesión para análisis unificado
- Ver Prompts del usuario: extraer y mostrar todas las entradas del usuario, con tres modos de vista — modo Original (contenido sin procesar), modo Contexto (etiquetas del sistema colapsables), modo Texto (texto plano); los comandos slash (`/model`, `/context`, etc.) se muestran como entradas independientes; las etiquetas relacionadas con comandos se ocultan automáticamente del contenido del Prompt
- Exportar Prompts como TXT: exportar los Prompts del usuario (texto plano, sin etiquetas del sistema) como archivo `.txt` local

### Actualización automática

CC-Viewer comprueba automáticamente si hay actualizaciones al iniciar (como máximo una vez cada 4 horas). Dentro de la misma versión mayor (por ejemplo, 1.x.x → 1.y.z) se actualiza automáticamente y surte efecto en el siguiente inicio. Para cambios de versión mayor solo se muestra una notificación.

La actualización automática sigue la configuración global de Claude Code en `~/.claude/settings.json`. Si Claude Code tiene desactivadas las actualizaciones automáticas (`autoUpdates: false`), CC-Viewer también omitirá la actualización automática.

### Soporte multilingüe

CC-Viewer admite 18 idiomas y cambia automáticamente según el idioma del sistema:

简体中文 | English | 繁體中文 | 한국어 | Deutsch | Español | Français | Italiano | Dansk | 日本語 | Polski | Русский | العربية | Norsk | Português (Brasil) | ไทย | Türkçe | Українська

## License

MIT
