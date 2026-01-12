# Smoke test (manual) — Multiusuario + Curso

Objetivo: confirmar que **AppLectura (base AppLectura11 restaurada)** funciona en flujo real y que **no mezcla datos** entre usuarios y/o cursos.

## 0) Prerrequisitos
- Backend: `http://localhost:3001` levantado.
- Frontend: `http://localhost:3000` levantado.
- Tener **2 cuentas reales** (p.ej. docente + estudiante) o 2 estudiantes.
- Recomendado: 2 ventanas separadas (normal + incógnito) para evitar sesión compartida.

## 1) Sanity: backend vivo
- Abrir `http://localhost:3001/health` → debe devolver JSON con `status: "ok"`.
- Abrir `http://localhost:3001/api/health` → debe devolver JSON y mostrar si las APIs están configuradas.

## 2) Preparación: evitar “basura” previa
En cada navegador/ventana:
- Abrir DevTools → Application → Local Storage → `http://localhost:3000`.
- (Opcional) limpiar keys antiguas relacionadas con sesiones/lecturas si vas a hacer una verificación “desde cero”.

## 3) Caso A — Aislamiento por usuario (mismo curso)
**Setup**
1. Ventana A: iniciar sesión como Usuario A.
2. Ventana B (incógnito): iniciar sesión como Usuario B.
3. Asegurar que ambos están en el **mismo curso** (mismo `courseId`/código).

**Validación**
- Usuario A realiza una acción que genere cambios persistentes (ejemplos):
  - Guardar una nota.
  - Generar/guardar un artefacto.
  - Ejecutar análisis y guardar resultado.
  - Acumular puntos (si aplica por acción).
- Usuario B:
  - NO debe ver los cambios privados de A (p.ej. borradores/notas/artefactos si son personales).
  - Si hay elementos compartidos por diseño (p.ej. un texto del curso), deben ser los mismos, pero **el progreso/puntos** debe ser independiente.

**Checklist**
- [ ] Notas privadas no aparecen en el otro usuario.
- [ ] Artefactos/borradores privados no aparecen en el otro usuario.
- [ ] Puntos/progreso no se sincronizan entre usuarios.

## 4) Caso B — Aislamiento por curso (mismo usuario)
**Setup**
1. Usar un mismo usuario (Usuario A).
2. Entrar a Curso 1 y realizar acciones: crear nota, análisis, etc.
3. Cambiar a Curso 2.

**Validación**
- Lo guardado en Curso 1 no debe “contaminar” Curso 2.

**Checklist**
- [ ] Al cambiar de curso, no se arrastran notas/borradores/artefactos del otro curso.
- [ ] Puntos/progreso no se mezclan entre Curso 1 y Curso 2.

## 5) Caso C — Logout/Login (rehidratación limpia)
1. Usuario A en Curso 1: crear nota/borrador.
2. Cerrar sesión.
3. Iniciar sesión con Usuario B.

**Checklist**
- [ ] No quedan visibles datos del usuario anterior.
- [ ] El estado inicial es coherente (sin “mezcla” de sesiones).

## 6) Evidencia mínima a capturar (para decisión “go/no-go”)
- 2 capturas de pantalla (o texto copiado) de Local Storage mostrando que los keys (si los hay) están diferenciados por usuario/curso.
- 1 video corto (opcional) cambiando de curso y mostrando que no se arrastran datos.

## Nota sobre PowerShell y curl
En PowerShell, `curl` suele ser alias de `Invoke-WebRequest` y puede pedir confirmación interactiva.
- Usa `curl.exe http://localhost:3001/health` si necesitas hacerlo por terminal.
