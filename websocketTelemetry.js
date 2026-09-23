// AuraGen WebSocket Telemetry
// Member 2 - WebSocket Integration

const telemetrySocket = {
    status: "disconnected",
    url: "ws://localhost:8080",
    connection: null
};


// Connect to the WebSocket server
function connectTelemetrySocket() {

    if (telemetrySocket.connection) {
        return telemetrySocket.connection;
    }

    const socket = new WebSocket(
        telemetrySocket.url
    );

    telemetrySocket.connection = socket;

    socket.onopen = function () {

        telemetrySocket.status = "connected";

        console.log(
            "AuraGen WebSocket connected."
        );
    };

    socket.onclose = function () {

        telemetrySocket.status = "disconnected";

        telemetrySocket.connection = null;

        console.log(
            "AuraGen WebSocket disconnected."
        );
    };

    socket.onerror = function (error) {

        telemetrySocket.status = "error";

        console.error(
            "AuraGen WebSocket error:",
            error
        );
    };

    socket.onmessage = function (event) {

        console.log(
            "AuraGen WebSocket response:",
            event.data
        );
    };

    return socket;
};


// Get current WebSocket status
function getTelemetrySocketStatus() {

    return telemetrySocket;
}

// Send telemetry event to the WebSocket server
function sendTelemetryEvent(event) {

    if (
        !telemetrySocket.connection ||
        telemetrySocket.status !== "connected"
    ) {
        console.warn(
            "AuraGen WebSocket is not connected."
        );
        return false;
    }

    telemetrySocket.connection.send(
        JSON.stringify(event)
    );

    console.log(
        "AuraGen telemetry sent:",
        event
    );

    return true;
}

console.log(
    "AuraGen WebSocket telemetry module initialized."
);

connectTelemetrySocket();