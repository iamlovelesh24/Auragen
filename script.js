let clickCount = 0;

const startTime = performance.now();

let lastMouseX = 0;
let lastMouseY = 0;
let lastMouseTime = performance.now();

let totalMouseDistance = 0;
let totalMouseTime = 0;

const button = document.getElementById("testButton");
const clickCountDisplay = document.getElementById("clickCount");
const hesitationDisplay = document.getElementById("hesitationTime");
const mouseVelocityDisplay = document.getElementById("mouseVelocity");
const clickPatternDisplay = document.getElementById("clickPattern");
const statusDisplay = document.getElementById("status");

// Track mouse movement
document.addEventListener("mousemove", function (event) {

    const currentTime = performance.now();

    const dx = event.clientX - lastMouseX;
    const dy = event.clientY - lastMouseY;

    const distance = Math.sqrt((dx * dx) + (dy * dy));

    const timeDifference = currentTime - lastMouseTime;

    if (timeDifference > 0) {
        totalMouseDistance += distance;
        totalMouseTime += timeDifference;
    }

    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
    lastMouseTime = currentTime;
});

// Track button clicks
button.addEventListener("click", function () {

    clickCount++;

    clickCountDisplay.textContent = clickCount;

    const currentTime = performance.now();

    const hesitationTime =
        (currentTime - startTime) / 1000;

    hesitationDisplay.textContent =
        hesitationTime.toFixed(2) + " seconds";

    let mouseVelocity = 0;

    if (totalMouseTime > 0) {
        mouseVelocity =
            totalMouseDistance / (totalMouseTime / 1000);
    }

    mouseVelocityDisplay.textContent =
        mouseVelocity.toFixed(2) + " px/second";

    // Basic click pattern detection
    if (clickCount === 1) {
        clickPatternDisplay.textContent = "First click";
    } else if (clickCount <= 3) {
        clickPatternDisplay.textContent = "Low activity";
    } else {
        clickPatternDisplay.textContent = "Repeated clicks";
    }

    statusDisplay.textContent = "Button clicked";
});