// ============================================================
// AuraGen - Click & Hesitation Detection
// Week 2 - Structured Telemetry + Dynamic UI Rendering
// Commit 16 - Enhanced Session Summary
// ============================================================


// ============================================================
// DOM REFERENCES
// ============================================================

const button =
    document.getElementById("testButton");

const resetTelemetryButton =
    document.getElementById("resetTelemetryButton");

const clickCountDisplay =
    document.getElementById("clickCount");

const hesitationDisplay =
    document.getElementById("hesitationTime");

const hesitationStatusDisplay =
    document.getElementById("hesitationStatus");

const velocityDisplay =
    document.getElementById("mouseVelocity");

const mouseVelocityActivityDisplay =
    document.getElementById("mouseVelocityActivity");

const averageVelocityDisplay =
    document.getElementById("averageVelocity");

const maxVelocityDisplay =
    document.getElementById("maxVelocity");

const mouseDistanceDisplay =
    document.getElementById("mouseDistance");

const mouseMovementActivityDisplay =
    document.getElementById("mouseMovementActivity");

const mouseMovementTimeDisplay =
    document.getElementById("mouseMovementTime");

const clickPatternDisplay =
    document.getElementById("clickPattern");

const statusDisplay =
    document.getElementById("status");

const telemetryValidationDisplay =
    document.getElementById("telemetryValidation");

const interactionLogDisplay =
    document.getElementById("interactionLog");


// ============================================================
// APPLICATION CONSTANTS
// ============================================================

const HESITATION_THRESHOLD = 3;

const MIN_TIME_INTERVAL = 0.01;

const MAX_VALID_VELOCITY = 3000;

const LOW_MOVEMENT_THRESHOLD = 1000;

const HIGH_MOVEMENT_THRESHOLD = 3000;

const MAX_LOG_EVENTS = 10;


// ============================================================
// APPLICATION STATE
// ============================================================

let clickCount = 0;

let startTime =
    performance.now();

let lastClickTime = null;

let hesitationTime = 0;

let lastMouseX = null;

let lastMouseY = null;

let lastMouseTime = null;

let currentMouseVelocity = 0;

let maxMouseVelocity = 0;

let totalMouseDistance = 0;

let totalMouseTime = 0;

let interactionEvents = [];


// ============================================================
// WEEK 2 - STRUCTURED SESSION TELEMETRY
// ============================================================

const telemetrySession = {

    sessionId:
        "session-" + Date.now(),

    startedAt:
        new Date().toISOString(),

    metrics: {

        clickCount: 0,

        hesitationTime: 0,

        hesitationStatus: "Waiting",

        mouseVelocity: 0,

        averageMouseVelocity: 0,

        maximumMouseVelocity: 0,

        mouseDistance: 0,

        mouseMovementTime: 0,

        clickPattern: "Waiting"
    },

    events: []
};


// ============================================================
// UPDATE STRUCTURED TELEMETRY
// ============================================================

function updateTelemetrySession() {

    telemetrySession.metrics.clickCount =
        clickCount;

    telemetrySession.metrics.mouseVelocity =
        currentMouseVelocity;

    telemetrySession.metrics.averageMouseVelocity =
        totalMouseTime > 0
            ? totalMouseDistance / totalMouseTime
            : 0;

    telemetrySession.metrics.maximumMouseVelocity =
        maxMouseVelocity;

    telemetrySession.metrics.mouseDistance =
        totalMouseDistance;

    telemetrySession.metrics.mouseMovementTime =
        totalMouseTime;
}


// ============================================================
// TELEMETRY ACCESS FOR TESTING
// ============================================================

window.getAuraGenTelemetry = function () {

    return JSON.parse(
        JSON.stringify(telemetrySession)
    );
};


// ============================================================
// ALLOWED TELEMETRY VALUES
// ============================================================

const ALLOWED_HESITATION_STATUSES = [

    "Waiting",

    "Hesitation detected",

    "Quick interaction"
];


const ALLOWED_CLICK_PATTERNS = [

    "Waiting",

    "First click",

    "Hesitant interaction",

    "Rapid interaction",

    "Exploring",

    "High click activity",

    "Normal interaction"
];


// ============================================================
// TELEMETRY VALIDATION
// ============================================================

function isSafeTelemetryNumber(value) {

    return (

        typeof value === "number" &&

        Number.isFinite(value) &&

        value >= 0
    );
}


function isSafeTelemetryText(
    value,
    allowedValues
) {

    return (

        typeof value === "string" &&

        value.length <= 100 &&

        allowedValues.includes(value)
    );
}


function validateTelemetryMetrics() {

    const metrics =
        telemetrySession.metrics;

    return (

        isSafeTelemetryNumber(
            metrics.clickCount
        ) &&

        Number.isInteger(
            metrics.clickCount
        ) &&

        isSafeTelemetryNumber(
            metrics.hesitationTime
        ) &&

        isSafeTelemetryText(
            metrics.hesitationStatus,
            ALLOWED_HESITATION_STATUSES
        ) &&

        isSafeTelemetryNumber(
            metrics.mouseVelocity
        ) &&

        isSafeTelemetryNumber(
            metrics.averageMouseVelocity
        ) &&

        isSafeTelemetryNumber(
            metrics.maximumMouseVelocity
        ) &&

        isSafeTelemetryNumber(
            metrics.mouseDistance
        ) &&

        isSafeTelemetryNumber(
            metrics.mouseMovementTime
        ) &&

        isSafeTelemetryText(
            metrics.clickPattern,
            ALLOWED_CLICK_PATTERNS
        )
    );
}


function validateTelemetryEvent(event) {

    if (
        typeof event !== "object" ||
        event === null
    ) {

        return false;
    }

    return (

        Number.isInteger(
            event.eventNumber
        ) &&

        event.eventNumber > 0 &&

        event.eventType === "click" &&

        typeof event.timestamp === "string" &&

        Number.isInteger(
            event.clickNumber
        ) &&

        event.clickNumber >= 1 &&

        isSafeTelemetryNumber(
            event.hesitationTime
        ) &&

        isSafeTelemetryText(
            event.hesitationStatus,
            ALLOWED_HESITATION_STATUSES
        ) &&

        isSafeTelemetryText(
            event.clickPattern,
            ALLOWED_CLICK_PATTERNS
        )
    );
}


function validateTelemetry() {

    const metricsValid =
        validateTelemetryMetrics();

    const eventsValid =
        telemetrySession.events.every(
            validateTelemetryEvent
        );

    const averageVelocity =
        telemetrySession.metrics
            .averageMouseVelocity;

    const expectedAverage =
        totalMouseTime > 0
            ? totalMouseDistance /
              totalMouseTime
            : 0;

    const averageConsistent =
        Math.abs(
            averageVelocity -
            expectedAverage
        ) < 0.1;

    const isValid =
        metricsValid &&
        eventsValid &&
        averageConsistent;

    telemetryValidationDisplay.textContent =
        isValid
            ? "Valid"
            : "Check required";

    return isValid;
}


// ============================================================
// STORE STRUCTURED CLICK EVENT
// ============================================================

function storeStructuredClickEvent(
    currentHesitationTime
) {

    const event = {

        eventNumber:
            telemetrySession.events.length + 1,

        eventType:
            "click",

        timestamp:
            new Date().toISOString(),

        clickNumber:
            clickCount,

        hesitationTime:
            Number(
                currentHesitationTime.toFixed(2)
            ),

        hesitationStatus:
            hesitationStatusDisplay.textContent,

        clickPattern:
            clickPatternDisplay.textContent
    };

    if (
        validateTelemetryEvent(event)
    ) {

        telemetrySession.events.push(event);
    }

    if (
        telemetrySession.events.length >
        MAX_LOG_EVENTS
    ) {

        telemetrySession.events =
            telemetrySession.events.slice(
                -MAX_LOG_EVENTS
            );
    }
}


// ============================================================
// INTERACTION EVENT LOG
// ============================================================

function logInteractionEvent(
    clickNumber,
    currentHesitationTime,
    currentHesitationStatus,
    currentClickPattern
) {

    const event = {

        eventNumber:
            interactionEvents.length + 1,

        time:
            new Date().toLocaleTimeString(),

        clickNumber:
            clickNumber,

        hesitationTime:
            Number(
                currentHesitationTime.toFixed(2)
            ),

        hesitationStatus:
            currentHesitationStatus,

        clickPattern:
            currentClickPattern
    };

    interactionEvents.push(event);

    if (
        interactionEvents.length >
        MAX_LOG_EVENTS
    ) {

        interactionEvents =
            interactionEvents.slice(
                -MAX_LOG_EVENTS
            );
    }

    renderInteractionLog();
}


function renderInteractionLog() {

    if (
        interactionEvents.length === 0
    ) {

        interactionLogDisplay.innerHTML =
            "<li>Waiting for interaction events...</li>";

        return;
    }

    interactionLogDisplay.innerHTML = "";

    interactionEvents.forEach(
        function (event) {

            const listItem =
                document.createElement("li");

            listItem.textContent =

                "#" +
                event.eventNumber +
                " | " +
                event.time +
                " | Click " +
                event.clickNumber +
                " | " +
                event.hesitationTime.toFixed(2) +
                " sec | " +
                event.hesitationStatus +
                " | " +
                event.clickPattern;

            interactionLogDisplay.appendChild(
                listItem
            );
        }
    );
}


// ============================================================
// MOUSE TELEMETRY TRACKING
// ============================================================

document.addEventListener(

    "mousemove",

    function (event) {

        const currentTime =
            performance.now();

        if (
            lastMouseX !== null &&
            lastMouseY !== null &&
            lastMouseTime !== null
        ) {

            const deltaX =
                event.clientX -
                lastMouseX;

            const deltaY =
                event.clientY -
                lastMouseY;

            const distance =
                Math.sqrt(
                    (deltaX * deltaX) +
                    (deltaY * deltaY)
                );

            const deltaTime =
                (
                    currentTime -
                    lastMouseTime
                ) / 1000;

            if (
                deltaTime >=
                MIN_TIME_INTERVAL
            ) {

                const velocity =
                    distance /
                    deltaTime;

                if (
                    Number.isFinite(velocity) &&
                    velocity <=
                    MAX_VALID_VELOCITY
                ) {

                    currentMouseVelocity =
                        velocity;

                    totalMouseDistance +=
                        distance;

                    totalMouseTime +=
                        deltaTime;

                    if (
                        velocity >
                        maxMouseVelocity
                    ) {

                        maxMouseVelocity =
                            velocity;
                    }


                    // Current velocity

                    velocityDisplay.textContent =

                        currentMouseVelocity
                            .toFixed(2) +
                        " px/second";


                    // Velocity activity

                    if (
                        currentMouseVelocity < 200
                    ) {

                        mouseVelocityActivityDisplay
                            .textContent =
                            "Slow movement";
                    }

                    else if (
                        currentMouseVelocity < 1000
                    ) {

                        mouseVelocityActivityDisplay
                            .textContent =
                            "Normal movement";
                    }

                    else {

                        mouseVelocityActivityDisplay
                            .textContent =
                            "Fast movement";
                    }


                    // Average velocity

                    const averageVelocity =

                        totalMouseTime > 0
                            ? totalMouseDistance /
                              totalMouseTime
                            : 0;

                    averageVelocityDisplay.textContent =

                        averageVelocity.toFixed(2) +
                        " px/second";


                    // Maximum velocity

                    maxVelocityDisplay.textContent =

                        maxMouseVelocity.toFixed(2) +
                        " px/second";


                    // Mouse distance

                    mouseDistanceDisplay.textContent =

                        totalMouseDistance.toFixed(2) +
                        " px";


                    // Movement activity

                    if (
                        totalMouseDistance <
                        LOW_MOVEMENT_THRESHOLD
                    ) {

                        mouseMovementActivityDisplay
                            .textContent =
                            "Low movement";
                    }

                    else if (
                        totalMouseDistance <
                        HIGH_MOVEMENT_THRESHOLD
                    ) {

                        mouseMovementActivityDisplay
                            .textContent =
                            "Moderate movement";
                    }

                    else {

                        mouseMovementActivityDisplay
                            .textContent =
                            "High movement";
                    }


                    // Movement time

                    mouseMovementTimeDisplay.textContent =

                        totalMouseTime.toFixed(2) +
                        " seconds";


                    updateTelemetrySession();

                    validateTelemetry();
                }
            }
        }

        lastMouseX =
            event.clientX;

        lastMouseY =
            event.clientY;

        lastMouseTime =
            currentTime;
    }
);


// ============================================================
// CLICK TRACKING
// ============================================================

if (button) {

    button.addEventListener(

        "click",

        function () {

            clickCount++;

            clickCountDisplay.textContent =
                clickCount;


            // ------------------------------------------------
            // Hesitation calculation
            // ------------------------------------------------

            const currentTime =
                performance.now();

            if (
                lastClickTime === null
            ) {

                hesitationTime =

                    (
                        currentTime -
                        startTime
                    ) / 1000;
            }

            else {

                hesitationTime =

                    (
                        currentTime -
                        lastClickTime
                    ) / 1000;
            }

            lastClickTime =
                currentTime;


            hesitationDisplay.textContent =

                hesitationTime.toFixed(2) +
                " seconds";


            // ------------------------------------------------
            // Hesitation status
            // ------------------------------------------------

            if (
                hesitationTime >=
                HESITATION_THRESHOLD
            ) {

                hesitationStatusDisplay.textContent =
                    "Hesitation detected";

                statusDisplay.textContent =
                    "Hesitation detected";
            }

            else {

                hesitationStatusDisplay.textContent =
                    "Quick interaction";

                statusDisplay.textContent =
                    "Quick interaction";
            }


            // ------------------------------------------------
            // Click pattern
            // ------------------------------------------------

            if (
                clickCount === 1
            ) {

                clickPatternDisplay.textContent =
                    "First click";
            }

            else if (
                hesitationTime >=
                HESITATION_THRESHOLD
            ) {

                clickPatternDisplay.textContent =
                    "Hesitant interaction";
            }

            else if (
                hesitationTime <= 1
            ) {

                clickPatternDisplay.textContent =
                    "Rapid interaction";
            }

            else if (
                clickCount >= 3 &&
                clickCount <= 5
            ) {

                clickPatternDisplay.textContent =
                    "Exploring";
            }

            else if (
                clickCount >= 6
            ) {

                clickPatternDisplay.textContent =
                    "High click activity";
            }

            else {

                clickPatternDisplay.textContent =
                    "Normal interaction";
            }


            // ------------------------------------------------
            // Application event log
            // ------------------------------------------------

            logInteractionEvent(

                clickCount,

                hesitationTime,

                hesitationStatusDisplay.textContent,

                clickPatternDisplay.textContent
            );


            // ------------------------------------------------
            // Structured telemetry
            // ------------------------------------------------

            telemetrySession.metrics.hesitationTime =
                hesitationTime;

            telemetrySession.metrics.hesitationStatus =
                hesitationStatusDisplay.textContent;

            telemetrySession.metrics.clickPattern =
                clickPatternDisplay.textContent;

            updateTelemetrySession();

            storeStructuredClickEvent(
                hesitationTime
            );

            validateTelemetry();
        }
    );
}


// ============================================================
// RESET TELEMETRY SESSION
// ============================================================

function resetTelemetrySession() {

    telemetrySession.sessionId =
        "session-" + Date.now();

    telemetrySession.startedAt =
        new Date().toISOString();

    telemetrySession.events = [];


    // Application state

    clickCount = 0;

    startTime =
        performance.now();

    lastClickTime = null;

    hesitationTime = 0;

    lastMouseX = null;

    lastMouseY = null;

    lastMouseTime = null;

    currentMouseVelocity = 0;

    maxMouseVelocity = 0;

    totalMouseDistance = 0;

    totalMouseTime = 0;

    interactionEvents = [];


    // Display reset

    clickCountDisplay.textContent =
        "0";

    hesitationDisplay.textContent =
        "--";

    hesitationStatusDisplay.textContent =
        "Waiting";

    statusDisplay.textContent =
        "Waiting for interaction";

    clickPatternDisplay.textContent =
        "Waiting";

    velocityDisplay.textContent =
        "0.00 px/second";

    mouseVelocityActivityDisplay.textContent =
        "Waiting";

    averageVelocityDisplay.textContent =
        "0.00 px/second";

    maxVelocityDisplay.textContent =
        "0.00 px/second";

    mouseDistanceDisplay.textContent =
        "0.00 px";

    mouseMovementActivityDisplay.textContent =
        "Waiting";

    mouseMovementTimeDisplay.textContent =
        "0.00 seconds";

    telemetryValidationDisplay.textContent =
        "Waiting";

    interactionLogDisplay.innerHTML =
        "<li>Waiting for interaction events...</li>";


    // Structured metrics reset

    telemetrySession.metrics.clickCount =
        0;

    telemetrySession.metrics.hesitationTime =
        0;

    telemetrySession.metrics.hesitationStatus =
        "Waiting";

    telemetrySession.metrics.mouseVelocity =
        0;

    telemetrySession.metrics.averageMouseVelocity =
        0;

    telemetrySession.metrics.maximumMouseVelocity =
        0;

    telemetrySession.metrics.mouseDistance =
        0;

    telemetrySession.metrics.mouseMovementTime =
        0;

    telemetrySession.metrics.clickPattern =
        "Waiting";


    updateTelemetrySession();

    console.log(
        "AuraGen telemetry session reset:",
        telemetrySession.sessionId
    );
}


if (resetTelemetryButton) {

    resetTelemetryButton.addEventListener(
        "click",
        resetTelemetrySession
    );
}


// ============================================================
// COMMIT 14 - DYNAMIC UI RENDERING SHELL
// ============================================================

function renderAuraGenUI(htmlContent) {

    if (
        typeof htmlContent !== "string"
    ) {

        return false;
    }

    const safeContent =
        htmlContent.trim();

    if (
        safeContent.length === 0
    ) {

        return false;
    }

    const dynamicContainer =
        document.getElementById(
            "auragenDynamicContent"
        );

    if (
        dynamicContainer
    ) {

        dynamicContainer.innerHTML =
            safeContent;

    } else {

        const container =
            document.createElement("div");

        container.id =
            "auragenDynamicContent";

        container.innerHTML =
            safeContent;

        document.body.appendChild(
            container
        );
    }

    console.log(
        "AuraGen dynamic UI rendered successfully."
    );

    return true;
}


window.renderAuraGenUI =
    renderAuraGenUI;


// ============================================================
// INITIAL DYNAMIC UI SHELL
// ============================================================

function createDynamicRenderingShell() {

    if (
        document.getElementById(
            "auragenDynamicContent"
        )
    ) {

        return;
    }

    const container =
        document.createElement("div");

    container.id =
        "auragenDynamicContent";

    container.setAttribute(
        "data-component",
        "auragen-dynamic-ui"
    );

    document.body.appendChild(
        container
    );
}


// ============================================================
// COMMIT 15 - SESSION SUMMARY API
// ============================================================

function getAuraGenSessionSummary() {

    const metrics =
        telemetrySession.metrics;

    return {

        sessionId:
            telemetrySession.sessionId,

        startedAt:
            telemetrySession.startedAt,

        generatedAt:
            new Date().toISOString(),

        totalClicks:
            metrics.clickCount,

        hesitationTime:
            Number(
                metrics.hesitationTime.toFixed(2)
            ),

        hesitationStatus:
            metrics.hesitationStatus,

        clickPattern:
            metrics.clickPattern,

        averageMouseVelocity:
            Number(
                metrics.averageMouseVelocity.toFixed(2)
            ),

        maximumMouseVelocity:
            Number(
                metrics.maximumMouseVelocity.toFixed(2)
            ),

        mouseDistance:
            Number(
                metrics.mouseDistance.toFixed(2)
            ),

        mouseMovementTime:
            Number(
                metrics.mouseMovementTime.toFixed(2)
            ),

        recordedEvents:
            telemetrySession.events.length
    };
}


window.getAuraGenSessionSummary =
    getAuraGenSessionSummary;


// ============================================================
// COMMIT 16 - ENHANCED SESSION SUMMARY
// ============================================================

function getAuraGenEnhancedSessionSummary() {

    const metrics =
        telemetrySession.metrics;

    const sessionDuration =
        Math.max(
            0,
            (performance.now() - startTime) / 1000
        );

    const telemetryIsValid =
        validateTelemetry();

    let interactionClassification =
        "No interaction";

    if (metrics.clickPattern !== "Waiting") {

        interactionClassification =
            metrics.clickPattern;
    }

    return {

        sessionId:
            telemetrySession.sessionId,

        startedAt:
            telemetrySession.startedAt,

        generatedAt:
            new Date().toISOString(),

        sessionDuration:
            Number(
                sessionDuration.toFixed(2)
            ),

        totalClicks:
            metrics.clickCount,

        hesitationThreshold:
            HESITATION_THRESHOLD,

        hesitationTime:
            Number(
                metrics.hesitationTime.toFixed(2)
            ),

        hesitationStatus:
            metrics.hesitationStatus,

        clickPattern:
            metrics.clickPattern,

        interactionClassification:
            interactionClassification,

        currentMouseVelocity:
            Number(
                metrics.mouseVelocity.toFixed(2)
            ),

        averageMouseVelocity:
            Number(
                metrics.averageMouseVelocity.toFixed(2)
            ),

        maximumMouseVelocity:
            Number(
                metrics.maximumMouseVelocity.toFixed(2)
            ),

        mouseDistance:
            Number(
                metrics.mouseDistance.toFixed(2)
            ),

        mouseMovementTime:
            Number(
                metrics.mouseMovementTime.toFixed(2)
            ),

        mouseVelocityActivity:
            getMouseVelocityActivity(),

        mouseMovementActivity:
            getMouseMovementActivity(),

        recordedEvents:
            telemetrySession.events.length,

        eventCount:
            telemetrySession.events.length,

        telemetryValidation:
            telemetryIsValid
                ? "Valid"
                : "Check required"
    };
}


// ============================================================
// COMMIT 16 - SESSION SUMMARY HELPERS
// ============================================================

function getMouseVelocityActivity() {

    if (
        currentMouseVelocity < 200
    ) {

        return "Slow movement";
    }

    if (
        currentMouseVelocity < 1000
    ) {

        return "Normal movement";
    }

    return "Fast movement";
}


function getMouseMovementActivity() {

    if (
        totalMouseDistance <
        LOW_MOVEMENT_THRESHOLD
    ) {

        return "Low movement";
    }

    if (
        totalMouseDistance <
        HIGH_MOVEMENT_THRESHOLD
    ) {

        return "Moderate movement";
    }

    return "High movement";
}


window.getAuraGenEnhancedSessionSummary =
    getAuraGenEnhancedSessionSummary;


// ============================================================
// INITIALIZATION
// ============================================================

createDynamicRenderingShell();

updateTelemetrySession();

validateTelemetry();

console.log(
    "AuraGen Week 2 Dynamic UI Rendering Shell initialized."
);

console.log(
    "AuraGen Week 2 Session Summary API initialized."
);

console.log(
    "AuraGen Week 2 Enhanced Session Summary initialized."
);

// =====================================================
// WEEK 2 - SIMPLE TELEMETRY EXPORT API
// =====================================================

function exportAuraGenTelemetry() {

    const telemetryData = {

        exportVersion: "1.0",

        exportedAt:
            new Date().toISOString(),

        source:
            "AuraGen Click & Hesitation Detection",

        interaction: {

            clickCount:
                typeof clickCount !== "undefined"
                    ? clickCount
                    : 0,

            hesitationTime:
                typeof hesitationTime !== "undefined"
                    ? Number(hesitationTime.toFixed(2))
                    : 0,

            hesitationStatus:
                typeof hesitationStatusDisplay !== "undefined"
                    ? hesitationStatusDisplay.textContent
                    : "Unavailable",

            clickPattern:
                typeof clickPatternDisplay !== "undefined"
                    ? clickPatternDisplay.textContent
                    : "Unavailable"
        },

        mouseTelemetry: {

            currentVelocity:
                typeof currentMouseVelocity !== "undefined"
                    ? Number(currentMouseVelocity.toFixed(2))
                    : 0,

            averageVelocity:
                typeof totalMouseTime !== "undefined" &&
                totalMouseTime > 0
                    ? Number(
                        (totalMouseDistance / totalMouseTime)
                        .toFixed(2)
                    )
                    : 0,

            maximumVelocity:
                typeof maxMouseVelocity !== "undefined"
                    ? Number(maxMouseVelocity.toFixed(2))
                    : 0,

            mouseDistance:
                typeof totalMouseDistance !== "undefined"
                    ? Number(totalMouseDistance.toFixed(2))
                    : 0,

            mouseMovementTime:
                typeof totalMouseTime !== "undefined"
                    ? Number(totalMouseTime.toFixed(2))
                    : 0
        }
    };

    return telemetryData;
}


// Make the API available from the browser console
window.exportAuraGenTelemetry =
    exportAuraGenTelemetry;

console.log(
    "AuraGen Week 2 Simple Telemetry Export API initialized."
);

// =====================================================
// COMMIT 18 - CLICK & HESITATION JSON EXPORT
// =====================================================

function downloadClickHesitationJSON() {

    const data = {
        exportedAt: new Date().toISOString(),
        clickCount: clickCount,
        hesitationTime: Number(hesitationTime.toFixed(2)),
        hesitationStatus: hesitationStatusDisplay.textContent,
        hesitationThreshold: 3,
        clickPattern: clickPatternDisplay.textContent
    };

    const json = JSON.stringify(data, null, 2);

    const blob = new Blob(
        [json],
        { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = "auragen-click-hesitation.json";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    console.log(
        "AuraGen Click & Hesitation JSON exported."
    );
}

window.downloadClickHesitationJSON =
    downloadClickHesitationJSON;

console.log(
    "AuraGen Commit 18 JSON Export initialized."
);