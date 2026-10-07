// ============================================================
// AuraGen - UI Morphing + Week 4 Optimization
// Member 2 - Week 3 + Week 4
//
// Week 3:
// - Context-aware UI morphing
// - User input preservation
// - Smooth UI transition
//
// Week 4:
// - Context-based caching
// - Latency measurement
// - Graceful fallback
// - Existing UI preservation on failure
// ============================================================


// ============================================================
// MORPH CONFIGURATION
// ============================================================

const AURAGEN_MORPH_DURATION = 500;

const AURAGEN_CACHE_LIMIT = 10;

const auraGenUICache = new Map();


// ============================================================
// WEEK 4 - CACHE KEY
// ============================================================

function createAuraGenCacheKey(context) {

    try {

        return JSON.stringify({
            userInput: context.userInput || {},
            activeElement: context.activeElement || null,
            dom: context.dom || context.domMetadata || {}
        });

    } catch (error) {

        return null;
    }
}


// ============================================================
// WEEK 4 - CACHE MANAGEMENT
// ============================================================

function getCachedAuraGenContext(cacheKey) {

    if (!cacheKey) {
        return null;
    }

    return auraGenUICache.get(cacheKey) || null;
}


function cacheAuraGenContext(cacheKey, context) {

    if (!cacheKey || !context) {
        return;
    }

    // Keep cache lightweight.
    if (auraGenUICache.size >= AURAGEN_CACHE_LIMIT) {

        const firstKey =
            auraGenUICache.keys().next().value;

        auraGenUICache.delete(firstKey);
    }

    auraGenUICache.set(
        cacheKey,
        context
    );
}


// ============================================================
// CREATE GENERATED UI
// ============================================================

function createGeneratedUI(context) {

    const container =
        document.createElement("div");

    container.id =
        "auraGenGeneratedUI";

    container.style.opacity = "0";

    container.style.transform =
        "translateY(15px) scale(0.98)";

    container.style.transition =
        "opacity " +
        AURAGEN_MORPH_DURATION +
        "ms ease, transform " +
        AURAGEN_MORPH_DURATION +
        "ms ease";

    container.style.padding =
        "20px";

    container.style.marginTop =
        "20px";

    container.style.border =
        "2px solid #444";

    container.style.borderRadius =
        "10px";


    const heading =
        document.createElement("h2");

    heading.textContent =
        "AuraGen Adaptive UI";

    container.appendChild(heading);


    const message =
        document.createElement("p");

    message.textContent =
        "Your interface has been adapted while preserving your entered information.";

    container.appendChild(message);


    const name =
        document.createElement("p");

    name.textContent =
        "User Name: " +
        (
            context.userInput?.userName?.value ||
            ""
        );

    container.appendChild(name);


    const account =
        document.createElement("p");

    account.textContent =
        "Account Type: " +
        (
            context.userInput?.accountType?.value ||
            ""
        );

    container.appendChild(account);


    const request =
        document.createElement("p");

    request.textContent =
        "Request: " +
        (
            context.userInput?.userRequest?.value ||
            ""
        );

    container.appendChild(request);


    return container;
}


// ============================================================
// WEEK 4 - FALLBACK UI
// ============================================================

function showAuraGenFallback(message) {

    try {

        const existingFallback =
            document.getElementById(
                "auraGenFallback"
            );

        if (existingFallback) {
            existingFallback.remove();
        }


        const fallback =
            document.createElement("div");

        fallback.id =
            "auraGenFallback";

        fallback.style.padding =
            "12px";

        fallback.style.marginTop =
            "10px";

        fallback.style.border =
            "1px solid #999";

        fallback.style.borderRadius =
            "8px";

        fallback.style.background =
            "#f5f5f5";

        fallback.textContent =
            message ||
            "AuraGen could not adapt the interface. The existing interface remains available.";

        document.body.appendChild(
            fallback
        );

    } catch (fallbackError) {

        console.warn(
            "AuraGen fallback display failed.",
            fallbackError
        );
    }
}


// ============================================================
// WEEK 4 - MORPH PERFORMANCE METRICS
// ============================================================

let auraGenLastMorphMetrics = {

    latencyMs: 0,

    cacheHit: false,

    status: "not_started"
};


// ============================================================
// MORPH STATIC UI → GENERATED UI
// ============================================================

function morphToGeneratedUI() {

    const startTime =
        performance.now();


    try {

        const context =
            typeof window.getAuraGenContext ===
            "function"
                ? window.getAuraGenContext()
                : null;


        if (!context) {

            throw new Error(
                "AuraGen context is not available."
            );
        }


        const cacheKey =
            createAuraGenCacheKey(
                context
            );


        let contextToRender =
            getCachedAuraGenContext(
                cacheKey
            );


        const cacheHit =
            !!contextToRender;


        if (!contextToRender) {

            contextToRender =
                context;

            cacheAuraGenContext(
                cacheKey,
                contextToRender
            );
        }


        // Remove only the previous generated UI.
        // The original/static UI remains untouched.
        const previousUI =
            document.getElementById(
                "auraGenGeneratedUI"
            );

        if (previousUI) {
            previousUI.remove();
        }


        const generatedUI =
            createGeneratedUI(
                contextToRender
            );


        document.body.appendChild(
            generatedUI
        );


        // Allow browser to render initial state.
        requestAnimationFrame(function () {

            generatedUI.style.opacity =
                "1";

            generatedUI.style.transform =
                "translateY(0) scale(1)";
        });


        const endTime =
            performance.now();


        const latency =
            Number(
                (endTime - startTime).toFixed(2)
            );


        auraGenLastMorphMetrics = {

            latencyMs: latency,

            cacheHit: cacheHit,

            status: "success"
        };


        console.log(
            "AuraGen Week 4 Performance:",
            {
                latencyMs: latency,
                cacheHit: cacheHit,
                status: "success"
            }
        );


        console.log(
            cacheHit
                ? "AuraGen cache hit - reused existing context."
                : "AuraGen cache miss - context stored for reuse."
        );


        console.log(
            "AuraGen UI morph completed.",
            contextToRender
        );

    } catch (error) {

        const endTime =
            performance.now();


        const latency =
            Number(
                (endTime - startTime).toFixed(2)
            );


        auraGenLastMorphMetrics = {

            latencyMs: latency,

            cacheHit: false,

            status: "fallback"
        };


        console.error(
            "AuraGen UI morph failed. Existing UI preserved.",
            error
        );


        // Graceful degradation:
        // Do not remove or modify the existing UI.
        showAuraGenFallback(
            "AuraGen could not adapt the interface right now. Your existing interface remains available."
        );
    }
}


// ============================================================
// RESTORE ORIGINAL USER INPUT
// ============================================================

function restoreAuraGenContext() {

    try {

        if (
            typeof window.getAuraGenContext !==
            "function"
        ) {
            return;
        }


        const context =
            window.getAuraGenContext();


        if (
            typeof window.restoreAuraGenInput ===
            "function"
        ) {

            window.restoreAuraGenInput(
                context.userInput
            );
        }


        console.log(
            "AuraGen user context restored."
        );

    } catch (error) {

        console.warn(
            "AuraGen context restoration failed.",
            error
        );
    }
}


// ============================================================
// WEEK 4 - CACHE CONTROL
// ============================================================

function clearAuraGenCache() {

    auraGenUICache.clear();

    console.log(
        "AuraGen UI cache cleared."
    );
}


// ============================================================
// GLOBAL ACCESS
// ============================================================

window.morphToGeneratedUI =
    morphToGeneratedUI;

window.restoreAuraGenContext =
    restoreAuraGenContext;

window.clearAuraGenCache =
    clearAuraGenCache;

window.getAuraGenMorphMetrics =
    function () {
        return auraGenLastMorphMetrics;
    };


console.log(
    "AuraGen UI morphing module initialized."
);

console.log(
    "AuraGen Week 4 optimization enabled: caching, latency measurement and graceful fallback."
);