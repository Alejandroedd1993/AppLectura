# React Doctor Full Report - 2026-03-06

## Scan metadata
- Command: `npx -y react-doctor@latest . --verbose --diff`
- Report source: `C:\Users\User\AppData\Local\Temp\react-doctor-6818dcbe-4228-4ef6-9018-f2cb6ee8450f\diagnostics.json`
- Score: 98/100
- Total warnings: 263

## Warnings by rule
- `exports`: 194
- `files`: 57
- `duplicates`: 12

## Warnings by bucket
- `src`: 204
- `server`: 38
- `scripts`: 9
- `tests`: 8
- `root`: 2
- `tools`: 1
- `public`: 1

## Unused files (57)
- `config-overrides.js`
- `jest.rules.config.js`
- `public\pdf.worker.min.js`
- `scripts\cleanup-old-sessions.js`
- `scripts\fix-ai-response-issues.js`
- `scripts\generate-docx.js`
- `scripts\generate-prompts-docx.js`
- `scripts\test-criterial-evaluation.js`
- `scripts\test-cross-device-sync.js`
- `scripts\test-simple.js`
- `scripts\test-web-search-fix.js`
- `scripts\verify-integration.js`
- `server\config\apiClients.js`
- `server\config\settings.js`
- `server\controllers\analisis.controller.js`
- `server\controllers\assessment.controller.js`
- `server\controllers\chat.completion.controller.js`
- `server\controllers\glossary.controller.js`
- `server\controllers\notes.controller.js`
- `server\controllers\ocr.controller.js`
- `server\controllers\pdf.controller.js`
- `server\controllers\preLectura.controller.js`
- `server\controllers\webSearch.controller.js`
- `server\index.js`
- `server\middleware\firebaseAuth.js`
- `server\middleware\performance.js`
- `server\middleware\rateLimiters.js`
- `server\prompts\analysis.prompt.js`
- `server\prompts\evaluationPrompts.js`
- `server\routes\adminCleanup.routes.js`
- `server\routes\analisis.routes.js`
- `server\routes\assessment.route.js`
- `server\routes\chat.completion.routes.js`
- `server\routes\notes.routes.js`
- `server\routes\ocr.routes.js`
- `server\routes\pdf.routes.js`
- `server\routes\storage.routes.js`
- `server\routes\webSearch.routes.js`
- `server\services\analisis.service.js`
- `server\services\notes.service.js`
- `server\services\ocr.service.js`
- `server\services\pdf.service.js`
- `server\services\strategies\deepseek.strategy.js`
- `server\services\strategies\gemini.strategy.js`
- `server\services\strategies\openai.strategy.js`
- `server\services\tableDetect.service.js`
- `server\utils\responseCache.js`
- `server\validators\schemas.js`
- `src\components\chat\WebEnrichmentButton.js`
- `src\hooks\useWebSearchAvailability.js`
- `src\hooks\useWebSearchTutor.js`
- `src\scripts\migrate-shared-styled.js`
- `src\scripts\migrate-shared-styled-v2.js`
- `src\services\webSearchService.js`
- `src\setupProxy.js`
- `src\setupTests.js`
- `tools\deep-audit.js`

## Duplicate exports (12)
- `LoadingState|default` in `src\components\ui\LoadingState.js`
- `AuthContext|default` in `src\context\AuthContext.js`
- `useAnnotations|default` in `src\hooks\useAnnotations.js`
- `useReadingProgress|default` in `src\hooks\useReadingProgress.js`
- `useReadingTimeTracker|default` in `src\hooks\useReadingTimeTracker.js`
- `useStudyItems|default` in `src\hooks\useStudyItems.js`
- `AnnotationsService|default` in `src\services\annotations.service.js`
- `NotesServices|default` in `src\services\notes\index.js`
- `StudyItemsService|default` in `src\services\studyItems.service.js`
- `copyToClipboard|default` in `src\utils\copyToClipboard.js`
- `fetchWebSearch|default` in `src\utils\fetchWebSearch.js`
- `procesarArchivo|default` in `src\utils\fileProcessor.js`

## Unused exports grouped by file (194)
### `src\styles\designTokens.js` (9)
- `breakpoints`
- `createTransition`
- `default`
- `generateShadow`
- `getResponsiveValue`
- `transitionDuration`
- `transitionTiming`
- `typography`
- `zIndex`

### `src\utils\accessibility.js` (9)
- `ariaHelpers`
- `checkWCAGContrast`
- `generateUniqueId`
- `getContrastRatio`
- `moveFocusTo`
- `prefersReducedMotion`
- `trapFocus`
- `useScreenReaderAnnounce`
- `validateFormAccessibility`

### `src\utils\logger.js` (9)
- `debug`
- `error`
- `group`
- `groupEnd`
- `log`
- `table`
- `time`
- `timeEnd`
- `warn`

### `src\hooks\useMediaQuery.js` (7)
- `BREAKPOINTS`
- `MEDIA_QUERIES`
- `useIsDesktop`
- `useIsMobile`
- `useIsTablet`
- `useIsTouchDevice`
- `useResponsive`

### `src\services\sessionManager.js` (7)
- `addBulkDeletedTombstones`
- `addDeletedSessionTombstone`
- `clearArtifactsDrafts`
- `clearDeletedSessionTombstone`
- `loadSession`
- `restoreArtifactsDrafts`
- `saveSession`

### `tests\testUtils.js` (7)
- `cleanupMocks`
- `createMockPDFFile`
- `createMockTextFile`
- `createOpenAIMock`
- `mockApiResponse`
- `render`
- `waitForAsyncComponent`

### `src\components\ui\LoadingState.js` (6)
- `DotsLoader`
- `LoadingState`
- `NotasSkeletonCard`
- `PulseSpinner`
- `Skeleton`
- `Spinner`

### `src\services\glossaryService.js` (6)
- `addTermToGlossary`
- `downloadGlossaryAsFile`
- `exportGlossaryAsText`
- `filterGlossary`
- `removeTermFromGlossary`
- `sortGlossaryAlphabetically`

### `src\services\practiceService.js` (6)
- `calculateProgressionStats`
- `default`
- `DIFFICULTY_PROMPTS`
- `generateDifficultyAdaptedPrompt`
- `HINTS_LIBRARY`
- `recommendNextPractice`

### `src\components\notas\index.js` (5)
- `ConfiguracionPanel`
- `CronogramaRepaso`
- `NotasContenido`
- `OpenAINotesService`
- `useNotasEstudio`

### `src\constants\timeoutConstants.js` (5)
- `ANALYSIS_TIMEOUT_MS`
- `default`
- `FIREBASE_TIMEOUT_MS`
- `MAX_RETRIES`
- `RETRY_DELAY_MS`

### `src\services\evaluationErrors.js` (5)
- `detectErrorType`
- `ERROR_MESSAGES`
- `ERROR_TYPES`
- `EvaluationError`
- `isRetryable`

### `src\services\notes\index.js` (5)
- `CronogramaService`
- `default`
- `initializeNotesServices`
- `OpenAINotesService`
- `StorageService`

### `src\services\rubricProgressV2.js` (5)
- `createEmptyRubricaV2`
- `createEmptySummative`
- `isRubricProgressV2`
- `migrateRubricProgressToV2`
- `REQUIRED_ARTEFACTS_FOR_ESSAY`

### `src\utils\analysisCache.js` (5)
- `checkStorageSpace`
- `clearCachedAnalysis`
- `default`
- `getPerformanceMetrics`
- `trackCacheUsage`

### `src\utils\cache.js` (5)
- `getAnalysisFromCache`
- `getCacheStats`
- `limpiarCache`
- `migrateLegacyTextAnalysisCache`
- `saveAnalysisToCache`

### `src\utils\storageKeys.js` (5)
- `appSessionIdKey`
- `currentSessionIdKey`
- `pendingSyncsKey`
- `sessionsKey`
- `STORAGE_PREFIXES`

### `src\firebase\auth.js` (4)
- `auth`
- `hasRole`
- `registerWithEmail`
- `updateUserProfile`

### `src\pedagogy\prompts\templates.js` (4)
- `createPromptWithTimeout`
- `default`
- `getEvaluationSchema`
- `validateEvaluatorInput`

### `src\pedagogy\tutor\studentNeedsAnalyzer.js` (4)
- `CONFUSION_PATTERNS`
- `CURIOSITY_PATTERNS`
- `FRUSTRATION_PATTERNS`
- `INSIGHT_PATTERNS`

### `src\firebase\firestore.js` (3)
- `deleteText`
- `purgeStudentCourseData`
- `updateSessionInFirestore`

### `src\pedagogy\discourse\acdAnalyzer.js` (3)
- `default`
- `IDEOLOGICAL_FRAMES`
- `RHETORICAL_STRATEGIES`

### `src\pedagogy\progression\progressionEngine.js` (3)
- `CRITERIA`
- `default`
- `SEQUENCE`

### `src\pedagogy\rewards\rewardsEngine.js` (3)
- `ACHIEVEMENTS`
- `REWARD_EVENTS`
- `STREAK_MULTIPLIERS`

### `src\services\analyticsService.js` (3)
- `calculateEngagementMetrics`
- `exportToJSON`
- `generateTimeSeriesData`

### `src\services\textStructureService.js` (3)
- `analyzeTextStructure`
- `default`
- `needsStructuralAnalysis`

### `src\utils\constants.js` (3)
- `LIMITE_TEXTO_COMPLETO`
- `LIMITE_TEXTO_GRANDE`
- `LIMITE_TEXTO_MEDIO`

### `src\context\AuthContext.js` (2)
- `AuthContext`
- `default`

### `src\pedagogy\rubrics\criticalLiteracyRubric.js` (2)
- `default`
- `normalizarPuntaje10aNivel4`

### `src\pedagogy\spaced\scheduler.js` (2)
- `default`
- `nextIntervalDays`

### `src\pedagogy\tutor\zdpDetector.js` (2)
- `BLOOM_LEVELS`
- `default`

### `src\services\basicAnalysisService.js` (2)
- `default`
- `mergeAnalysis`

### `src\services\retryWrapper.js` (2)
- `RETRY_CONFIG`
- `withRetry`

### `src\services\unifiedAiService.js` (2)
- `analyzeText`
- `default`

### `src\utils\markdownUtils.js` (2)
- `renderMarkdownList`
- `renderWithLineBreaks`

### `src\utils\migrateActivityData.js` (2)
- `cleanupOldActivityData`
- `hasPendingMigration`

### `src\utils\performanceMonitor.js` (2)
- `default`
- `withPerformanceTracking`

### `src\utils\sessionValidator.js` (2)
- `sanitizeSession`
- `validateSession`

### `server\config\firebaseAdmin.js` (1)
- `getAdminApp`

### `server\services\ownedCourseCleanup.service.js` (1)
- `buildOwnedCleanupJobId`

### `src\components\artefactos\shared\FormComponents.styled.js` (1)
- `Button`

### `src\components\artefactos\shared\index.js` (1)
- `Button`

### `src\components\evaluacion\EvaluationProgress.js` (1)
- `EVALUATION_STEPS`

### `src\components\notas\NotasUI.js` (1)
- `ConceptoEtiqueta`

### `src\components\notes\NotesPanelDock.js` (1)
- `NOTE_MAX_CHARS`

### `src\context\PedagogyContext.js` (1)
- `usePedagogyMaybe`

### `src\firebase\config.js` (1)
- `default`

### `src\firebase\sessionManager.js` (1)
- `updateSessionActivity`

### `src\hooks\notes\index.js` (1)
- `useNotasEstudio`

### `src\hooks\useActivityPersistence.js` (1)
- `getAllStoredActivities`

### `src\hooks\useAnnotations.js` (1)
- `useAnnotations`

### `src\hooks\useReadingProgress.js` (1)
- `default`

### `src\hooks\useReadingTimeTracker.js` (1)
- `default`

### `src\hooks\useStudyItems.js` (1)
- `useStudyItems`

### `src\pedagogy\questions\socratic.js` (1)
- `default`

### `src\pedagogy\safety\tutorGuard.js` (1)
- `HATE_SLUR_PATTERNS`

### `src\services\annotations.service.js` (1)
- `default`

### `src\services\ensayoIntegrador.service.js` (1)
- `default`

### `src\services\essayFormatValidator.js` (1)
- `default`

### `src\services\evaluacionIntegral.service.js` (1)
- `validarPrerequisitos`

### `src\services\pdfGlossaryService.js` (1)
- `generateGlossaryPDFBlob`

### `src\services\studyItems.service.js` (1)
- `default`

### `src\services\termDefinitionService.js` (1)
- `searchTermOnWeb`

### `src\styles\theme.js` (1)
- `themeUtils`

### `src\utils\contextBuilders.js` (1)
- `default`

### `src\utils\copyToClipboard.js` (1)
- `default`

### `src\utils\enrichmentConstants.js` (1)
- `default`

### `src\utils\exportUtils.js` (1)
- `exportarResultados`

### `src\utils\fetchWebSearch.js` (1)
- `default`

### `src\utils\fileProcessor.js` (1)
- `default`

### `tests\helpers\renderAsync.js` (1)
- `flushPromises`

