# Fiche Expert Auto

## Runtime architecture

`js/app.js` loads the unified `data/vehicles.json` data through
`js/db-loader.js`, then initializes `js/legacy-features.js` once. That controller
owns local sheets, vehicle selectors, scoring, photos, signatures, import/export,
comparison, validation, budget calculations, and PDF generation. Its vehicle
indexes are constructed from the loaded data; no historic inline vehicle database
is included in the JavaScript.

Application web pour consulter des fiches techniques de véhicules.
