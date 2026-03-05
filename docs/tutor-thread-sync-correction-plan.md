# Plan de Correcciones: Sincronizacion de Hilos del Tutor

Fecha: 2026-03-04

## Objetivo

Eliminar los errores criticos de sincronizacion entre pestanas/dispositivos en el chat del tutor, priorizando consistencia de historial y no perdida de mensajes.

## Hallazgos Prioritarios

1. Bloqueo global de snapshots remotos durante writes locales.
2. Limpiezas remotas (`messages: []`) ignoradas bajo ciertas condiciones.
3. Riesgo de perdida por `last-write-wins` al persistir arrays completos.
4. Activacion tardia de hilo nuevo dependiente de latencia de Firestore.
5. Resolucion sensible a relojes locales (clock skew).

## Fase 1: Hotfixes Inmediatos

1. Reemplazar bloqueo global de `onSnapshot` por deteccion de eco por firma (`lastWrittenSignature`).
2. Aceptar eventos remotos de limpieza y aplicarlos localmente.
3. Introducir merge defensivo de historiales divergentes (prefijo comun + colas no comunes) antes de persistir.
4. Activar hilo nuevo en UI inmediatamente (sin esperar `setDoc/getDocs`).
5. Evitar decisiones de precedencia basadas solo en `Date.now()` local:
   - separar `lastRemoteUpdatedAt` (origen Firestore),
   - usar reloj monotono local solo para metadata local.

## Fase 2: Cobertura de Regresion

Agregar pruebas automatizadas para:

1. Snapshot remoto valido durante write local en curso.
2. Propagacion de clear remoto.
3. Merge de ramas concurrentes (dos dispositivos escribiendo desde una base comun).
4. Adopcion de remoto con timestamp menor (clock skew) sin perder estado.
5. Creacion de hilo con seleccion activa inmediata aun con red lenta.

## Fase 3: Endurecimiento (siguiente iteracion)

1. Migrar almacenamiento de `messages` a modelo append-only con IDs estables por mensaje.
2. Persistir vector/version por hilo para detectar conflictos reales.
3. Telemetria de conflictos por hilo y tasa de auto-merge.
4. Politica de resolucion configurable (`remote-first`, `merge`, `local-first`) por tipo de evento.

## Criterios de Aceptacion

1. No se pierden mensajes en escenarios de concurrencia basicos entre dos dispositivos.
2. `clearHistory` en un dispositivo se refleja en los demas.
3. Crear hilo nuevo no deja al usuario escribiendo en clave `no-thread`.
4. Suite de regresion de tutor/hilos en verde.
