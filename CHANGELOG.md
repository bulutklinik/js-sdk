# Changelog

All notable changes to `@bulutklinik/sdk` are documented here. The format is based
on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0]

### Added

- `client.laboratory` — the patient's lab results and orderable test catalog:
  `results(page?)` (`GET /patients/userLabTestList/{page?}`),
  `resultDetail(testId)` (`GET /patients/userLabTestDetail/{testId}` — `testId`
  may carry a `-lab` suffix), `catalog()` (`GET /patients/allLaboratoryTests`),
  `catalogDetail(id)` (`GET /patients/laboratoryTestDetail/{id}`) and
  `order(input)` (`POST /patients/addNewLaboratoryTest`).
- `client.diets` — the patient's diet lists: `list(page?)`
  (`GET /patients/dietLists/{page?}`) and `detail(listId)`
  (`GET /patients/diet/{listId}`).
- Types: `LabOrderInput`, `LabResultListItem`, `DietListItem`.

## [0.3.0]

### Added

- `client.skin.analyze(images)` — "Cildimde Neyim Var" AI skin-lesion analysis
  (`POST /patients/imageCheck`). Returns per-image lesion `label`, a Turkish AI
  `comment`, `confidence`, `possible_icd` and an opaque `case_detail` blob (which
  can be forwarded as a payment's `caseDetail`).
- `client.meals.analyze(input)` — AI meal-photo calorie/nutrition estimation
  (`POST /patients/imageAnalyzeMeal`).
- Types: `SkinImage`, `SkinAnalysis`, `SkinAnalysisResult`, `MealAnalysisInput`,
  `MealAnalysisResult`, `PortionSize`, `MealType`.

## [0.2.0]

### Added

- `client.request(...)` escape hatch for calling any endpoint not yet covered by a
  typed resource method (DESIGN.md §7.2).

## [0.1.0]

### Added

- Initial release: `auth`, `doctors`, `slots`, `appointments`, `payments`,
  `measures` service groups over a shared transport with silent token refresh.
