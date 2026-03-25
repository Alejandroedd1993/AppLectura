# QA Manual - Mi Progreso

Objetivo: validar la pestana `Mi Progreso` de punta a punta en la lectura actual, sin mezclar otras lecturas ni otros cursos.

## Preparacion

- Entrar con una cuenta de estudiante.
- Tener al menos una lectura con `checkpoint` habilitado.
- Probar en desktop y en mobile o viewport angosto.
- Si es posible, preparar tambien una cuenta o dataset con:
  - una lectura sin progreso,
  - una lectura con 1 dimension activa,
  - una lectura con pendientes,
  - una lectura con evidencia legacy,
  - una lectura con cobertura 5/5,
  - varias sesiones historicas comparables.

## Escenario 1 - Sin progreso

Pasos:

1. Abrir una lectura nueva o reseteada.
2. Ir a `Actividades -> Mi Progreso`.

Esperado:

- El hero muestra un estado tipo `Sin iniciar`.
- No aparecen metricas inventadas ni graficas vacias.
- `DashboardRubricas`, `ProgressStats` y `AnalyticsPanel` muestran estados vacios coherentes.
- `Exportar CSV` y `Exportar PDF` quedan deshabilitados o sin contenido exportable.

## Escenario 2 - Inicio real con 1/5

Pasos:

1. Completar el checkpoint.
2. Resolver una sola dimension con una evaluacion formativa.
3. Volver a `Mi Progreso`.

Esperado:

- El hero muestra `Primeros pasos`.
- Cobertura `1/5`.
- El siguiente paso sugiere abrir una nueva dimension.
- Las tarjetas, el detalle y las analiticas muestran la misma dimension activa.
- El panel analitico entra en modo `poco dato`: sin radar ni dashboard historico habilitado.

## Escenario 3 - Pendiente de revision

Pasos:

1. Dejar una entrega o sumativo en estado `submitted` sin calificar.
2. Ir a `Mi Progreso`.

Esperado:

- El hero y las tarjetas marcan pendiente de revision.
- La dimension no baja falsamente a `0/10`.
- La accion principal prioriza revisar o continuar esa dimension pendiente.
- Exportacion refleja `Pendiente` o `Sumativo pendiente de revision`, no una nota falsa.

## Escenario 4 - Evidencia legacy

Pasos:

1. Abrir una lectura/sesion con nota legacy sin historial detallado.
2. Ir a `Mi Progreso`.

Esperado:

- La dimension aparece como iniciada/evaluada si tiene nota valida.
- No se muestra `0 intentos` de forma enganosa.
- Debe verse `Sin registro legacy` o copy equivalente en tarjetas, analiticas y exportacion.
- El dashboard historico no inventa fechas ni intentos.

## Escenario 5 - Cobertura completa 5/5

Pasos:

1. Activar las 5 dimensiones.
2. Asegurar que al menos una quede mas debil que las otras.
3. Ir a `Mi Progreso`.

Esperado:

- El hero muestra `Cobertura completa con foco de mejora` o estado equivalente.
- La accion principal apunta a la dimension mas debil, no a una ya fuerte.
- La columna derecha se mantiene compacta y no duplica innecesariamente todo el mapa.
- Radar, distribucion y lecturas rapidas son consistentes con las tarjetas.

## Escenario 6 - Varias sesiones comparables

Pasos:

1. Generar al menos 2 sesiones del mismo texto con notas comparables.
2. Ir a `Analiticas y metricas`.
3. Abrir `Comparar sesiones` y `Dashboard historico`.

Esperado:

- Ambas tabs se habilitan solo cuando existen sesiones comparables.
- El orden temporal es consistente entre comparacion e historico.
- Las sesiones sin fecha se muestran como `Sesion N` y solo entran en `Todo`.
- `Sin dato` no se representa como `0.0`.
- Los filtros por rubrica no castigan ausencias como ceros.

## Escenario 7 - Exportacion

Pasos:

1. Exportar CSV y PDF en una lectura con mezcla de:
   - una dimension formativa,
   - una pendiente,
   - una legacy,
   - una con override o sumativo.

Esperado:

- CSV usa `Intento o registro`.
- PDF usa el mismo criterio de estado y mejor puntaje.
- Los nombres de artefacto coinciden con la metadata canonica.
- No aparecen `Invalid Date`, `0.0` falsos ni textos contradictorios.

## Escenario 8 - Reset

Pasos:

1. Desde `Mi Progreso`, ejecutar `Resetear Todo el Progreso`.
2. Recargar la app.
3. Si hay sync remota, volver a entrar con la misma cuenta.

Esperado:

- El reset solo se confirma si la persistencia remota fue exitosa.
- El progreso no reaparece tras recarga o rehidratacion.
- La lectura vuelve al estado vacio correcto.

## Mobile QA

Revisar en viewport pequeno:

- Hero sin desbordes horizontales.
- CTA principal a ancho util.
- Cards activas y por abrir sin exceso de scroll horizontal.
- Tabs clicables y legibles.
- Exportacion y reset sin superponerse.

## Criterios de cierre

La pestana puede darse por estable si:

- no hay contradicciones entre hero, tarjetas, detalle, analiticas y exportacion,
- no aparecen notas falsas, intentos falsos ni fechas falsas,
- el scope se mantiene en la lectura actual,
- las tabs historicas solo se habilitan con datos comparables,
- la experiencia sigue siendo legible en desktop y mobile.

## Registro recomendado

Por cada hallazgo encontrado, anotar:

1. escenario,
2. pasos exactos,
3. esperado,
4. observado,
5. captura o video,
6. archivo o modulo probable,
7. severidad.
