// ===============================
// WEEK 2 - STRUCTURED SESSION TELEMETRY
// ===============================

const telemetrySession = {

    sessionId:
        "session-" +
        Date.now(),

    startedAt:
        new Date().toISOString(),

    metrics: {

        clickCount: 0,

        hesitationTime: 0,

        hesitationStatus:
            "Waiting",

        mouseVelocity: 0,

        averageMouseVelocity: 0,

        maximumMouseVelocity: 0,

        mouseDistance: 0,

        mouseMovementTime: 0,

        clickPattern:
            "Waiting"
    },

    events: []
};


// ===============================
// UPDATE STRUCTURED TELEMETRY
// ===============================

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


// ===============================
// TELEMETRY ACCESS FOR TESTING
// ===============================

window.getAuraGenTelemetry = function () {

    return JSON.parse(
        JSON.stringify(telemetrySession)
    );
};


// ===============================
// WEEK 2 - CODE SAFETY VALIDATION
// ===============================

// Allowed hesitation status values
const ALLOWED_HESITATION_STATUSES = [

    "Waiting",

    "Hesitation detected",

    "Quick interaction"
];


// Allowed click pattern values
const ALLOWED_CLICK_PATTERNS = [

    "Waiting",

    "First click",

    "Hesitant interaction",

    "Rapid interaction",

    "Exploring",

    "High click activity",

    "Normal interaction"
];


// ===============================
// SAFE NUMBER VALIDATION
// ===============================

function isSafeTelemetryNumber(value) {

    return (

        typeof value === "number" &&

        Number.isFinite(value) &&

        value >= 0
    );
}


// ===============================
// SAFE TEXT VALIDATION
// ===============================

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


// ===============================
// VALIDATE TELEMETRY METRICS
// ===============================

function validateTelemetryMetrics() {

    const metrics =
        telemetrySession.metrics;

    return (

        // Click count
        isSafeTelemetryNumber(
            metrics.clickCount
        ) &&

        Number.isInteger(
            metrics.clickCount
        ) &&


        // Hesitation time
        isSafeTelemetryNumber(
            metrics.hesitationTime
        ) &&


        // Hesitation status
        isSafeTelemetryText(
            metrics.hesitationStatus,
            ALLOWED_HESITATION_STATUSES
        ) &&


        // Mouse telemetry
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


        // Click pattern
        isSafeTelemetryText(
            metrics.clickPattern,
            ALLOWED_CLICK_PATTERNS
        )
    );
}


// ===============================
// VALIDATE ONE TELEMETRY EVENT
// ===============================

function validateTelemetryEvent(event) {

    if (

        typeof event !== "object" ||

        event === null
    ) {

        return false;
    }


    return (

        // Event number
        Number.isInteger(
            event.eventNumber
        ) &&

        event.eventNumber > 0 &&


        // Event type
        event.eventType === "click" &&


        // Timestamp
        typeof event.timestamp === "string" &&

        event.timestamp.length <= 50 &&


        // Click number
        Number.isInteger(
            event.clickNumber
        ) &&

        event.clickNumber > 0 &&


        // Hesitation
        isSafeTelemetryNumber(
            event.hesitationTime
        ) &&


        // Status
        isSafeTelemetryText(
            event.hesitationStatus,
            ALLOWED_HESITATION_STATUSES
        ) &&


        // Pattern
        isSafeTelemetryText(
            event.clickPattern,
            ALLOWED_CLICK_PATTERNS
        )
    );
}


// ===============================
// VALIDATE COMPLETE SESSION
// ===============================

function validateTelemetrySession() {

    // Session object
    if (

        typeof telemetrySession !== "object" ||

        telemetrySession === null
    ) {

        return false;
    }


    // Session ID
    if (

        typeof telemetrySession.sessionId !== "string" ||

        !telemetrySession.sessionId.startsWith(
            "session-"
        ) ||

        telemetrySession.sessionId.length > 100
    ) {

        return false;
    }


    // Start time
    if (

        typeof telemetrySession.startedAt !== "string" ||

        telemetrySession.startedAt.length > 50
    ) {

        return false;
    }


    // Metrics
    if (
        !validateTelemetryMetrics()
    ) {

        return false;
    }


    // Events must be an array
    if (
        !Array.isArray(
            telemetrySession.events
        )
    ) {

        return false;
    }


    // Maximum event limit
    if (

        telemetrySession.events.length >
        MAX_LOG_EVENTS
    ) {

        return false;
    }


    // Validate every event
    return telemetrySession.events.every(
        validateTelemetryEvent
    );
}


// ===============================
// SAFE STRUCTURED EVENT STORAGE
// ===============================

function storeStructuredClickEvent(
    hesitationTime
) {

    const event = {

        eventNumber:
            clickCount,

        eventType:
            "click",

        timestamp:
            new Date().toISOString(),

        clickNumber:
            clickCount,

        hesitationTime:
            Number(
                hesitationTime.toFixed(2)
            ),

        hesitationStatus:
            hesitationStatusDisplay.textContent,

        clickPattern:
            clickPatternDisplay.textContent
    };


    // Store only validated events
    if (
        validateTelemetryEvent(event)
    ) {

        telemetrySession.events.push(
            event
        );


        // Keep latest 10 events
        if (

            telemetrySession.events.length >
            MAX_LOG_EVENTS
        ) {

            telemetrySession.events.shift();
        }
    }
}


// ===============================
// UPDATE SAFETY STATUS
// ===============================

function updateTelemetrySafetyStatus() {

    const isValid =
        validateTelemetrySession();


    if (
        telemetryValidationDisplay
    ) {

        telemetryValidationDisplay.dataset.safety =
            isValid
                ? "valid"
                : "invalid";
    }


    return isValid;
}


// ===============================
// CLICK COUNT
// ===============================

let clickCount = 0;


// ===============================
// SESSION TIMER
// ===============================

const startTime =
    performance.now();


// Stores the time of the previous click
let lastClickTime = null;


// ===============================
// HESITATION SETTINGS
// ===============================

const HESITATION_THRESHOLD = 3;


// ===============================
// MOUSE TRACKING VARIABLES
// ===============================

let lastMouseX = null;

let lastMouseY = null;

let lastMouseTime = null;

let totalMouseDistance = 0;

let totalMouseTime = 0;

let maxMouseVelocity = 0;

let currentMouseVelocity = 0;


// ===============================
// INTERACTION EVENT LOG
// ===============================

let interactionEvents = [];

const MAX_LOG_EVENTS = 10;


// ===============================
// VELOCITY SETTINGS
// ===============================

// Ignore extremely small time intervals
const MIN_TIME_INTERVAL = 0.01;


// Maximum velocity accepted
const MAX_VALID_VELOCITY = 3000;


// ===============================
// MOUSE ACTIVITY SETTINGS
// ===============================

const LOW_MOVEMENT_THRESHOLD = 1000;

const HIGH_MOVEMENT_THRESHOLD = 3000;


// ===============================
// VELOCITY ACTIVITY SETTINGS
// ===============================

const SLOW_VELOCITY_THRESHOLD = 200;

const FAST_VELOCITY_THRESHOLD = 1000;


// ===============================
// HTML ELEMENTS
// ===============================

const button =
    document.getElementById(
        "testButton"
    );

const clickCountDisplay =
    document.getElementById(
        "clickCount"
    );

const hesitationDisplay =
    document.getElementById(
        "hesitationTime"
    );

const hesitationThresholdDisplay =
    document.getElementById(
        "hesitationThreshold"
    );

const hesitationStatusDisplay =
    document.getElementById(
        "hesitationStatus"
    );

const velocityDisplay =
    document.getElementById(
        "mouseVelocity"
    );

const mouseVelocityActivityDisplay =
    document.getElementById(
        "mouseVelocityActivity"
    );

const averageVelocityDisplay =
    document.getElementById(
        "averageVelocity"
    );

const maxVelocityDisplay =
    document.getElementById(
        "maxVelocity"
    );

const mouseDistanceDisplay =
    document.getElementById(
        "mouseDistance"
    );

const mouseMovementActivityDisplay =
    document.getElementById(
        "mouseMovementActivity"
    );

const mouseMovementTimeDisplay =
    document.getElementById(
        "mouseMovementTime"
    );

const clickPatternDisplay =
    document.getElementById(
        "clickPattern"
    );

const statusDisplay =
    document.getElementById(
        "status"
    );

const telemetryValidationDisplay =
    document.getElementById(
        "telemetryValidation"
    );

const interactionLogDisplay =
    document.getElementById(
        "interactionLog"
    );


// ===============================
// INTERACTION EVENT LOGGER
// ===============================

function logInteractionEvent(

    clickNumber,

    hesitationTime,

    hesitationStatus,

    clickPattern

) {

    const eventTime =
        new Date().toLocaleTimeString();


    const eventData = {

        eventNumber:
            interactionEvents.length + 1,

        time:
            eventTime,

        clickNumber:
            clickNumber,

        hesitationTime:
            hesitationTime.toFixed(2),

        hesitationStatus:
            hesitationStatus,

        clickPattern:
            clickPattern
    };


    // Add event
    interactionEvents.push(
        eventData
    );


    // Keep latest 10 events
    if (

        interactionEvents.length >
        MAX_LOG_EVENTS
    ) {

        interactionEvents.shift();
    }


    // Clear display
    interactionLogDisplay.innerHTML =
        "";


    // Display events
    interactionEvents.forEach(
        function (event) {

            const listItem =
                document.createElement(
                    "li"
                );


            listItem.textContent =

                "#" +
                event.eventNumber +

                " | " +
                event.time +

                " | Click " +
                event.clickNumber +

                " | " +
                event.hesitationTime +

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


// ===============================
// TELEMETRY VALIDATION
// ===============================

function validateTelemetry() {

    // -------------------------------
    // Basic numeric validation
    // -------------------------------

    const valuesAreNonNegative =

        clickCount >= 0 &&

        totalMouseDistance >= 0 &&

        totalMouseTime >= 0 &&

        maxMouseVelocity >= 0 &&

        currentMouseVelocity >= 0;


    // -------------------------------
    // Average velocity validation
    // -------------------------------

    let averageVelocityIsValid =
        true;


    if (
        totalMouseTime > 0
    ) {

        const calculatedAverageVelocity =

            totalMouseDistance /
            totalMouseTime;


        const displayedAverageVelocity =

            parseFloat(
                averageVelocityDisplay
                    .textContent
            );


        const difference =

            Math.abs(

                calculatedAverageVelocity -
                displayedAverageVelocity
            );


        // Allow rounding difference
        averageVelocityIsValid =
            difference < 0.1;
    }


    // -------------------------------
    // Session safety validation
    // -------------------------------

    const sessionIsSafe =
        updateTelemetrySafetyStatus();


    // -------------------------------
    // Final result
    // -------------------------------

    if (

        valuesAreNonNegative &&

        averageVelocityIsValid &&

        sessionIsSafe

    ) {

        telemetryValidationDisplay
            .textContent =
            "Valid";
    }

    else {

        telemetryValidationDisplay
            .textContent =
            "Check required";
    }
}


// ===============================
// INITIAL DISPLAY
// ===============================

hesitationThresholdDisplay.textContent =

    HESITATION_THRESHOLD +
    " seconds";


// ===============================
// MOUSE MOVEMENT TRACKING
// ===============================

document.addEventListener(

    "mousemove",

    function (event) {

        const currentTime =
            performance.now();


        // -------------------------------
        // First mouse movement
        // -------------------------------

        if (
            lastMouseX === null
        ) {

            lastMouseX =
                event.clientX;

            lastMouseY =
                event.clientY;

            lastMouseTime =
                currentTime;

            return;
        }


        // -------------------------------
        // Calculate movement
        // -------------------------------

        const deltaX =

            event.clientX -
            lastMouseX;


        const deltaY =

            event.clientY -
            lastMouseY;


        const distance =

            Math.sqrt(

                deltaX * deltaX +
                deltaY * deltaY
            );


        // -------------------------------
        // Calculate movement time
        // -------------------------------

        const timeElapsed =

            (
                currentTime -
                lastMouseTime
            ) / 1000;


        // -------------------------------
        // Validate time interval
        // -------------------------------

        if (

            timeElapsed >=
            MIN_TIME_INTERVAL

        ) {

            const velocity =

                distance /
                timeElapsed;


            // -------------------------------
            // Accept realistic velocity
            // -------------------------------

            if (

                velocity <=
                MAX_VALID_VELOCITY

            ) {

                currentMouseVelocity =
                    velocity;


                totalMouseDistance +=
                    distance;


                totalMouseTime +=
                    timeElapsed;


                // -------------------------------
                // Maximum velocity
                // -------------------------------

                if (

                    velocity >
                    maxMouseVelocity

                ) {

                    maxMouseVelocity =
                        velocity;
                }


                // -------------------------------
                // Average velocity
                // -------------------------------

                let averageVelocity = 0;


                if (
                    totalMouseTime > 0
                ) {

                    averageVelocity =

                        totalMouseDistance /
                        totalMouseTime;
                }


                // -------------------------------
                // Current velocity display
                // -------------------------------

                velocityDisplay.textContent =

                    currentMouseVelocity.toFixed(2) +
                    " px/second";


                // -------------------------------
                // Velocity classification
                // -------------------------------

                if (

                    currentMouseVelocity <
                    SLOW_VELOCITY_THRESHOLD

                ) {

                    mouseVelocityActivityDisplay
                        .textContent =
                        "Slow movement";
                }

                else if (

                    currentMouseVelocity <
                    FAST_VELOCITY_THRESHOLD

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


                // -------------------------------
                // Average velocity display
                // -------------------------------

                averageVelocityDisplay.textContent =

                    averageVelocity.toFixed(2) +
                    " px/second";


                // -------------------------------
                // Maximum velocity display
                // -------------------------------

                maxVelocityDisplay.textContent =

                    maxMouseVelocity.toFixed(2) +
                    " px/second";


                // -------------------------------
                // Mouse distance display
                // -------------------------------

                mouseDistanceDisplay.textContent =

                    totalMouseDistance.toFixed(2) +
                    " px";


                // -------------------------------
                // Mouse movement classification
                // -------------------------------

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


                // -------------------------------
                // Mouse movement time
                // -------------------------------

                mouseMovementTimeDisplay.textContent =

                    totalMouseTime.toFixed(2) +
                    " seconds";


                // -------------------------------
                // Update structured telemetry
                // -------------------------------

                updateTelemetrySession();


                // -------------------------------
                // Validate telemetry
                // -------------------------------

                validateTelemetry();
            }
        }


        // -------------------------------
        // Store current mouse position
        // -------------------------------

        lastMouseX =
            event.clientX;

        lastMouseY =
            event.clientY;

        lastMouseTime =
            currentTime;
    }
);


// ===============================
// BUTTON CLICK TRACKING
// ===============================

button.addEventListener(

    "click",

    function () {


        // -------------------------------
        // Increase click count
        // -------------------------------

        clickCount++;


        clickCountDisplay.textContent =
            clickCount;


        // -------------------------------
        // Calculate hesitation time
        // -------------------------------

        const currentTime =
            performance.now();


        let hesitationTime;


        // -------------------------------
        // First click
        // -------------------------------

        if (
            lastClickTime === null
        ) {

            hesitationTime =

                (
                    currentTime -
                    startTime
                ) / 1000;
        }


        // -------------------------------
        // Subsequent clicks
        // -------------------------------

        else {

            hesitationTime =

                (
                    currentTime -
                    lastClickTime
                ) / 1000;
        }


        // -------------------------------
        // Store click time
        // -------------------------------

        lastClickTime =
            currentTime;


        // -------------------------------
        // Display hesitation
        // -------------------------------

        hesitationDisplay.textContent =

            hesitationTime.toFixed(2) +
            " seconds";


        // ===============================
        // HESITATION DETECTION
        // ===============================

        if (

            hesitationTime >=
            HESITATION_THRESHOLD

        ) {

            hesitationStatusDisplay
                .textContent =
                "Hesitation detected";


            statusDisplay
                .textContent =
                "Hesitation detected";
        }

        else {

            hesitationStatusDisplay
                .textContent =
                "Quick interaction";


            statusDisplay
                .textContent =
                "Quick interaction";
        }


        // ===============================
        // CLICK PATTERN DETECTION
        // ===============================

        if (
            clickCount === 1
        ) {

            clickPatternDisplay
                .textContent =
                "First click";
        }

        else if (

            hesitationTime >=
            HESITATION_THRESHOLD

        ) {

            clickPatternDisplay
                .textContent =
                "Hesitant interaction";
        }

        else if (

            hesitationTime <= 1

        ) {

            clickPatternDisplay
                .textContent =
                "Rapid interaction";
        }

        else if (

            clickCount >= 3 &&

            clickCount <= 5

        ) {

            clickPatternDisplay
                .textContent =
                "Exploring";
        }

        else if (

            clickCount >= 6

        ) {

            clickPatternDisplay
                .textContent =
                "High click activity";
        }

        else {

            clickPatternDisplay
                .textContent =
                "Normal interaction";
        }


        // ===============================
        // LOG INTERACTION EVENT
        // ===============================

        logInteractionEvent(

            clickCount,

            hesitationTime,

            hesitationStatusDisplay
                .textContent,

            clickPatternDisplay
                .textContent
        );


        // ===============================
        // UPDATE STRUCTURED TELEMETRY
        // ===============================

        telemetrySession.metrics.hesitationTime =

            hesitationTime;


        telemetrySession.metrics.hesitationStatus =

            hesitationStatusDisplay
                .textContent;


        telemetrySession.metrics.clickPattern =

            clickPatternDisplay
                .textContent;


        updateTelemetrySession();


        // ===============================
        // STORE STRUCTURED CLICK EVENT
        // ===============================

        storeStructuredClickEvent(

            hesitationTime
        );


        // ===============================
        // VALIDATE TELEMETRY
        // ===============================

        validateTelemetry();

    }
);