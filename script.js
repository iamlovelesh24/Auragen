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


let clickCount = 0;


// ===============================
// SESSION TIMER
// ===============================

const startTime = performance.now();

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

// Maximum velocity accepted for this prototype
const MAX_VALID_VELOCITY = 3000;


// ===============================
// MOUSE ACTIVITY SETTINGS
// ===============================

// Distance thresholds
const LOW_MOVEMENT_THRESHOLD = 1000;
const HIGH_MOVEMENT_THRESHOLD = 3000;


// ===============================
// VELOCITY ACTIVITY SETTINGS
// ===============================

// Velocity thresholds
const SLOW_VELOCITY_THRESHOLD = 200;
const FAST_VELOCITY_THRESHOLD = 1000;


// ===============================
// HTML ELEMENTS
// ===============================

const button =
    document.getElementById("testButton");

const clickCountDisplay =
    document.getElementById("clickCount");

const hesitationDisplay =
    document.getElementById("hesitationTime");

const hesitationThresholdDisplay =
    document.getElementById("hesitationThreshold");

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


    // Add event to the log
    interactionEvents.push(eventData);


    // Keep only the latest 10 events
    if (
        interactionEvents.length >
        MAX_LOG_EVENTS
    ) {

        interactionEvents.shift();
    }


    // Clear current display
    interactionLogDisplay.innerHTML = "";


    // Display recorded events
    interactionEvents.forEach(function (event) {

        const listItem =
            document.createElement("li");


        listItem.textContent =
            "#" + event.eventNumber +
            " | " + event.time +
            " | Click " + event.clickNumber +
            " | " + event.hesitationTime +
            " sec" +
            " | " + event.hesitationStatus +
            " | " + event.clickPattern;


        interactionLogDisplay.appendChild(
            listItem
        );
    });
}


// ===============================
// TELEMETRY VALIDATION
// ===============================

function validateTelemetry() {

    // Check that telemetry values
    // are not negative

    const valuesAreNonNegative =
        clickCount >= 0 &&
        totalMouseDistance >= 0 &&
        totalMouseTime >= 0 &&
        maxMouseVelocity >= 0 &&
        currentMouseVelocity >= 0;


    // Assume average velocity is valid
    let averageVelocityIsValid = true;


    // Validate average velocity
    // against distance / movement time

    if (totalMouseTime > 0) {

        const calculatedAverageVelocity =
            totalMouseDistance /
            totalMouseTime;


        const displayedAverageVelocity =
            parseFloat(
                averageVelocityDisplay.textContent
            );


        const difference =
            Math.abs(
                calculatedAverageVelocity -
                displayedAverageVelocity
            );


        // Allow small rounding difference
        averageVelocityIsValid =
            difference < 0.1;
    }


    // Final validation result

    if (
        valuesAreNonNegative &&
        averageVelocityIsValid
    ) {

        telemetryValidationDisplay.textContent =
            "Valid";
    }

    else {

        telemetryValidationDisplay.textContent =
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


        // --------------------------------
        // First mouse movement
        // --------------------------------

        if (lastMouseX === null) {

            lastMouseX =
                event.clientX;

            lastMouseY =
                event.clientY;

            lastMouseTime =
                currentTime;

            return;
        }


        // --------------------------------
        // Calculate mouse movement
        // --------------------------------

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


        // --------------------------------
        // Calculate movement time
        // --------------------------------

        const timeElapsed =
            (
                currentTime -
                lastMouseTime
            ) / 1000;


        // --------------------------------
        // Validate time interval
        // --------------------------------

        if (
            timeElapsed >=
            MIN_TIME_INTERVAL
        ) {

            const velocity =
                distance /
                timeElapsed;


            // --------------------------------
            // Accept realistic velocity only
            // --------------------------------

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


                // --------------------------------
                // Update maximum velocity
                // --------------------------------

                if (
                    velocity >
                    maxMouseVelocity
                ) {

                    maxMouseVelocity =
                        velocity;
                }


                // --------------------------------
                // Calculate average velocity
                // --------------------------------

                let averageVelocity = 0;


                if (
                    totalMouseTime > 0
                ) {

                    averageVelocity =
                        totalMouseDistance /
                        totalMouseTime;
                }


                // --------------------------------
                // Update current velocity
                // --------------------------------

                velocityDisplay.textContent =
                    currentMouseVelocity.toFixed(2) +
                    " px/second";


                // --------------------------------
                // Classify current velocity
                // --------------------------------

                if (
                    currentMouseVelocity <
                    SLOW_VELOCITY_THRESHOLD
                ) {

                    mouseVelocityActivityDisplay.textContent =
                        "Slow movement";
                }

                else if (
                    currentMouseVelocity <
                    FAST_VELOCITY_THRESHOLD
                ) {

                    mouseVelocityActivityDisplay.textContent =
                        "Normal movement";
                }

                else {

                    mouseVelocityActivityDisplay.textContent =
                        "Fast movement";
                }


                // --------------------------------
                // Update average velocity
                // --------------------------------

                averageVelocityDisplay.textContent =
                    averageVelocity.toFixed(2) +
                    " px/second";


                // --------------------------------
                // Update maximum velocity
                // --------------------------------

                maxVelocityDisplay.textContent =
                    maxMouseVelocity.toFixed(2) +
                    " px/second";


                // --------------------------------
                // Update total mouse distance
                // --------------------------------

                mouseDistanceDisplay.textContent =
                    totalMouseDistance.toFixed(2) +
                    " px";


                // --------------------------------
                // Classify mouse movement activity
                // --------------------------------

                if (
                    totalMouseDistance <
                    LOW_MOVEMENT_THRESHOLD
                ) {

                    mouseMovementActivityDisplay.textContent =
                        "Low movement";
                }

                else if (
                    totalMouseDistance <
                    HIGH_MOVEMENT_THRESHOLD
                ) {

                    mouseMovementActivityDisplay.textContent =
                        "Moderate movement";
                }

                else {

                    mouseMovementActivityDisplay.textContent =
                        "High movement";
                }


                // --------------------------------
                // Update mouse movement time
                // --------------------------------

                mouseMovementTimeDisplay.textContent =
                    totalMouseTime.toFixed(2) +
                    " seconds";


                // --------------------------------
                // Update structured session telemetry
                // --------------------------------

                updateTelemetrySession();


                // --------------------------------
                // Validate telemetry
                // --------------------------------

                validateTelemetry();
            }
        }


        // --------------------------------
        // Store current mouse position
        // --------------------------------

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


        // --------------------------------
        // Increase click count
        // --------------------------------

        clickCount++;


        clickCountDisplay.textContent =
            clickCount;


        // --------------------------------
        // Calculate hesitation time
        // --------------------------------

        const currentTime =
            performance.now();

        let hesitationTime;


        // --------------------------------
        // FIRST CLICK
        // --------------------------------

        if (
            lastClickTime === null
        ) {

            // Time from page opening
            // to first click

            hesitationTime =
                (
                    currentTime -
                    startTime
                ) / 1000;
        }


        // --------------------------------
        // SUBSEQUENT CLICKS
        // --------------------------------

        else {

            // Time from previous click
            // to current click

            hesitationTime =
                (
                    currentTime -
                    lastClickTime
                ) / 1000;
        }


        // --------------------------------
        // Store current click time
        // --------------------------------

        lastClickTime =
            currentTime;


        // --------------------------------
        // Display hesitation time
        // --------------------------------

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


        // ===============================
        // CLICK PATTERN DETECTION
        // ===============================

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


        // ===============================
        // LOG INTERACTION EVENT
        // ===============================

        logInteractionEvent(
            clickCount,
            hesitationTime,
            hesitationStatusDisplay.textContent,
            clickPatternDisplay.textContent
        );


        // ===============================
        // UPDATE STRUCTURED SESSION TELEMETRY
        // ===============================

        telemetrySession.metrics.hesitationTime =
            hesitationTime;

        telemetrySession.metrics.hesitationStatus =
            hesitationStatusDisplay.textContent;

        telemetrySession.metrics.clickPattern =
            clickPatternDisplay.textContent;

        updateTelemetrySession();


        // ===============================
        // STORE STRUCTURED CLICK EVENT
        // ===============================

        telemetrySession.events.push({

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
                    hesitationTime.toFixed(2)
                ),

            hesitationStatus:
                hesitationStatusDisplay.textContent,

            clickPattern:
                clickPatternDisplay.textContent
        });


        // ===============================
        // VALIDATE TELEMETRY
        // ===============================

        validateTelemetry();

    }
);