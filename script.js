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
// VELOCITY SETTINGS
// ===============================

// Ignore extremely small time intervals
const MIN_TIME_INTERVAL = 0.01;

// Maximum velocity accepted for this prototype
const MAX_VALID_VELOCITY = 3000;


// ===============================
// MOUSE ACTIVITY SETTINGS
// ===============================

// Distance thresholds used to classify
// overall mouse movement activity
const LOW_MOVEMENT_THRESHOLD = 1000;
const HIGH_MOVEMENT_THRESHOLD = 3000;


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


// ===============================
// INITIAL DISPLAY
// ===============================

hesitationThresholdDisplay.textContent =
    HESITATION_THRESHOLD + " seconds";


// ===============================
// MOUSE MOVEMENT TRACKING
// ===============================

document.addEventListener("mousemove", function (event) {

    const currentTime = performance.now();


    // --------------------------------
    // First mouse movement
    // --------------------------------

    if (lastMouseX === null) {

        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
        lastMouseTime = currentTime;

        return;
    }


    // --------------------------------
    // Calculate mouse movement
    // --------------------------------

    const deltaX =
        event.clientX - lastMouseX;

    const deltaY =
        event.clientY - lastMouseY;


    const distance = Math.sqrt(
        deltaX * deltaX +
        deltaY * deltaY
    );


    // --------------------------------
    // Calculate movement time
    // --------------------------------

    const timeElapsed =
        (currentTime - lastMouseTime) / 1000;


    // --------------------------------
    // Validate time interval
    // --------------------------------

    if (timeElapsed >= MIN_TIME_INTERVAL) {

        const velocity =
            distance / timeElapsed;


        // --------------------------------
        // Accept realistic velocity only
        // --------------------------------

        if (velocity <= MAX_VALID_VELOCITY) {

            currentMouseVelocity = velocity;

            totalMouseDistance += distance;

            totalMouseTime += timeElapsed;


            // --------------------------------
            // Update maximum velocity
            // --------------------------------

            if (velocity > maxMouseVelocity) {

                maxMouseVelocity = velocity;
            }


            // --------------------------------
            // Calculate average velocity
            // --------------------------------

            let averageVelocity = 0;

            if (totalMouseTime > 0) {

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
        }
    }


    // --------------------------------
    // Store current mouse position
    // --------------------------------

    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
    lastMouseTime = currentTime;

});


// ===============================
// BUTTON CLICK TRACKING
// ===============================

button.addEventListener("click", function () {

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

    if (lastClickTime === null) {

        // Time from page opening
        // to first click

        hesitationTime =
            (currentTime - startTime) / 1000;
    }


    // --------------------------------
    // SUBSEQUENT CLICKS
    // --------------------------------

    else {

        // Time from previous click
        // to current click

        hesitationTime =
            (currentTime - lastClickTime) / 1000;
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

    if (clickCount === 1) {

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

});