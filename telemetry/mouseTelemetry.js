// Manish - Week 1 & Week 2
// Mouse Movement + Velocity + Activity Telemetry

const mouseTelemetry = {
    totalDistance: 0,
    movementTime: 0,
    movementCount: 0,

    currentVelocity: 0,
    maxVelocity: 0,
    totalVelocity: 0,

    activity: "stationary",

    lastX: null,
    lastY: null,
    lastTimestamp: null,
    startTime: null
};


function startMouseTelemetry() {

    mouseTelemetry.startTime = Date.now();

    document.addEventListener(
        "mousemove",
        trackMouseMovement
    );
}


function classifyMouseActivity(velocity) {

    if (velocity < 10) {
        return "stationary";
    }

    if (velocity < 500) {
        return "slow";
    }

    if (velocity < 1500) {
        return "normal";
    }

    return "fast";
}


function trackMouseMovement(event) {

    const currentTime = Date.now();

    if (mouseTelemetry.lastX === null) {

        mouseTelemetry.lastX = event.clientX;
        mouseTelemetry.lastY = event.clientY;
        mouseTelemetry.lastTimestamp = currentTime;

        return;
    }

    const dx =
        event.clientX - mouseTelemetry.lastX;

    const dy =
        event.clientY - mouseTelemetry.lastY;

    const distance = Math.sqrt(
        (dx * dx) + (dy * dy)
    );

    const timeDifference =
        currentTime - mouseTelemetry.lastTimestamp;


    if (timeDifference > 0) {

        const velocity =
            distance / timeDifference * 1000;

        mouseTelemetry.currentVelocity =
            velocity;

        mouseTelemetry.maxVelocity =
            Math.max(
                mouseTelemetry.maxVelocity,
                velocity
            );

        mouseTelemetry.totalVelocity +=
            velocity;

        mouseTelemetry.activity =
            classifyMouseActivity(velocity);
    }


    mouseTelemetry.totalDistance +=
        distance;

    mouseTelemetry.movementCount += 1;

    mouseTelemetry.lastX =
        event.clientX;

    mouseTelemetry.lastY =
        event.clientY;

    mouseTelemetry.lastTimestamp =
        currentTime;

    mouseTelemetry.movementTime =
        currentTime -
        mouseTelemetry.startTime;
}


function getMouseTelemetry() {

    const averageVelocity =
        mouseTelemetry.movementCount > 0
            ? mouseTelemetry.totalVelocity /
              mouseTelemetry.movementCount
            : 0;

    return {

        totalDistance:
            Number(
                mouseTelemetry.totalDistance.toFixed(2)
            ),

        movementTime:
            mouseTelemetry.movementTime,

        movementCount:
            mouseTelemetry.movementCount,

        currentVelocity:
            Number(
                mouseTelemetry.currentVelocity.toFixed(2)
            ),

        maxVelocity:
            Number(
                mouseTelemetry.maxVelocity.toFixed(2)
            ),

        averageVelocity:
            Number(
                averageVelocity.toFixed(2)
            ),

        activity:
            mouseTelemetry.activity
    };
}


console.log(
    "Manish mouse telemetry initialized."
);

if (typeof window !== "undefined") {
    window.startMouseTelemetry = startMouseTelemetry;
    window.getMouseTelemetry = getMouseTelemetry;
}