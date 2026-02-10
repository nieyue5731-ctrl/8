# Risk Register

## Active Risks

### R1: Script Load Order Sensitivity
- **Severity**: HIGH
- **Description**: The game relies on specific script load order due to global variable dependencies. Any change to load order could cause ReferenceErrors.
- **Mitigation**: Load order extracted directly from original file's `<script>` tag sequence and preserved in `js/load-order.json`. Index.html generated programmatically from this ordered list.
- **Status**: MITIGATED

### R2: CSS Specificity Changes from Consolidation
- **Severity**: MEDIUM
- **Description**: Merging 6 separate `<style>` blocks into one CSS file could theoretically change rule precedence if rules appeared in different blocks.
- **Mitigation**: CSS is concatenated in the exact same order as the original `<style>` blocks appear in the HTML. Specificity and cascade order are preserved.
- **Status**: MITIGATED

### R3: Monkey-Patch Timing Dependencies
- **Severity**: HIGH
- **Description**: 10+ monkey-patches override prototype methods at specific points during load. If a patch loads before its target class is defined, it will fail silently.
- **Mitigation**: Patch files are numbered with `_patch_N` suffix and loaded in their original position in the load order. Each patch has defensive checks (`if (typeof ClassName !== 'undefined')`).
- **Status**: MITIGATED

### R4: Worker Blob URL Generation
- **Severity**: MEDIUM
- **Description**: The WorldWorkerClient generates worker code as inline strings and creates Blob URLs. Moving to external files doesn't change this mechanism, but the worker code itself is still inline string-based.
- **Mitigation**: Worker generation code preserved verbatim in `js/workers/worker-client.js`. No changes to the string concatenation approach.
- **Status**: MITIGATED

### R5: Global Variable Pollution Preserved
- **Severity**: LOW
- **Description**: The original code uses 30+ `window.*` global assignments. These are preserved as-is in the modular files to maintain compatibility.
- **Mitigation**: All global assignments preserved. Future phases can migrate to module imports.
- **Status**: ACCEPTED (intentional for compatibility)

### R6: Cross-Origin Resource Loading
- **Severity**: LOW
- **Description**: Loading JS/CSS from external files requires the page to be served from an HTTP server (not `file://` protocol due to CORS restrictions on some browsers).
- **Mitigation**: Document that a local server is needed. Original single-file still works via `file://` protocol.
- **Status**: DOCUMENTED

## Resolved Risks

None yet - this is the initial extraction phase.
