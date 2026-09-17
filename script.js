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
    // Calculate movement
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
    // Calculate time
    // --------------------------------

    const timeElapsed =
        (currentTime - lastMouseTime) / 1000;


    // --------------------------------
    // Ignore extremely small intervals
    // --------------------------------

    if (timeElapsed >= MIN_TIME_INTERVAL) {

        const velocity =
            distance / timeElapsed;


        // --------------------------------
        // Accept only realistic velocity
        // --------------------------------

        if (velocity <= MAX_VALID_VELOCITY) {

            currentMouseVelocity = velocity;

            totalMouseDistance += distance;

            totalMouseTime += timeElapsed;


            // --------------------------------
            // Maximum velocity
            // --------------------------------

            if (velocity > maxMouseVelocity) {

                maxMouseVelocity = velocity;
            }


            // --------------------------------
            // Average velocity
            // --------------------------------

            let averageVelocity = 0;

            if (totalMouseTime > 0) {

                averageVelocity =
                    totalMouseDistance /
                    totalMouseTime;
            }


            // --------------------------------
            // Update screen
            // --------------------------------

            velocityDisplay.textContent =
                currentMouseVelocity.toFixed(2) +
                " px/second";


            averageVelocityDisplay.textContent =
                averageVelocity.toFixed(2) +
                " px/second";


            maxVelocityDisplay.textContent =
                maxMouseVelocity.toFixed(2) +
                " px/second";


            mouseDistanceDisplay.textContent =
                totalMouseDistance.toFixed(2) +
                " px";


            mouseMovementTimeDisplay.textContent =
                totalMouseTime.toFixed(2) +
                " seconds";
        }
    }


    // --------------------------------
    // Store current position/time
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
    // Calculate click hesitation
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


    // Store current click time
    lastClickTime = currentTime;


    // --------------------------------
    // Display hesitation time
    // --------------------------------

    hesitationDisplay.textContent =
        hesitationTime.toFixed(2) +
        " seconds";


    // ===============================
    // HESITATION DETECTION
    // ===============================

    if (hesitationTime >= HESITATION_THRESHOLD) {

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

    else if (clickCount === 2) {

        clickPatternDisplay.textContent =
            "Second interaction";

    }

    else if (clickCount === 3) {

        clickPatternDisplay.textContent =
            "Exploring";

    }

    else if (
        clickCount >= 4 &&
        clickCount <= 6
    ) {

        clickPatternDisplay.textContent =
            "Repeated interaction";

    }

    else {

        clickPatternDisplay.textContent =
            "High click activity";
    }
});