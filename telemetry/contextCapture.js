/*
 * AuraGen - Week 3 Contextual Awareness
 * Member 1 - Manish
 *
 * Captures the current UI state and user-input context so that
 * downstream telemetry/WebSocket layers can preserve user progress
 * when the UI is adapted.
 */

const contextState = {
    lastEvent: null,
    lastEventTimestamp: null,
    eventCount: 0,
    clickCount: 0,
    inputCount: 0,
    focusCount: 0,
    changeCount: 0,
    focusedElement: null,
    fieldValues: {},
    startedAt: null
};

const MAX_DOM_SNAPSHOT_CHARS = 4000;
const MAX_FIELD_VALUE_CHARS = 500;

const SENSITIVE_INPUT_TYPES = new Set([
    "password"
]);

const INTERACTIVE_SELECTOR = [
    "input",
    "textarea",
    "select",
    "button"
].join(",");


function isSensitiveField(element) {
    if (!element) {
        return false;
    }

    const type = (
        element.getAttribute("type") || ""
    ).toLowerCase();

    return SENSITIVE_INPUT_TYPES.has(type);
}


function getElementIdentifier(element) {
    if (!element) {
        return null;
    }

    return {
        tag: element.tagName
            ? element.tagName.toLowerCase()
            : null,

        id: element.id || null,

        name: element.getAttribute("name") || null,

        type: element.getAttribute("type") || null,

        ariaLabel:
            element.getAttribute("aria-label") || null
    };
}


function getFieldValue(element) {
    if (!element || isSensitiveField(element)) {
        return "[REDACTED]";
    }

    const value = element.value;

    if (typeof value !== "string") {
        return null;
    }

    return value.slice(0, MAX_FIELD_VALUE_CHARS);
}


function captureFieldValues() {
    const fields = {};

    document
        .querySelectorAll(INTERACTIVE_SELECTOR)
        .forEach((element, index) => {

            const identifier =
                getElementIdentifier(element);

            if (!identifier) {
                return;
            }

            const key =
                identifier.id ||
                identifier.name ||
                `${identifier.tag}_${index}`;

            fields[key] = {
                ...identifier,
                value: getFieldValue(element)
            };
        });

    return fields;
}


function captureDomSnapshot() {
    if (!document.body) {
        return "";
    }

    const clone =
        document.body.cloneNode(true);

    /*
     * Do not expose entered values through the DOM snapshot.
     * Field values are captured separately.
     */
    clone
        .querySelectorAll("input, textarea, select")
        .forEach((element) => {

            if (element.hasAttribute("value")) {
                element.setAttribute(
                    "value",
                    ""
                );
            }

            if ("value" in element) {
                try {
                    element.value = "";
                } catch (_) {
                    // Ignore read-only elements.
                }
            }
        });

    return clone.outerHTML
        .replace(/\s+/g, " ")
        .slice(0, MAX_DOM_SNAPSHOT_CHARS);
}


function recordInteraction(type, element) {

    contextState.lastEvent = type;

    contextState.lastEventTimestamp =
        Date.now();

    contextState.eventCount += 1;

    if (type === "click") {
        contextState.clickCount += 1;
    }

    if (type === "input") {
        contextState.inputCount += 1;
    }

    if (type === "focus") {
        contextState.focusCount += 1;
    }

    if (type === "change") {
        contextState.changeCount += 1;
    }

    if (element) {
        contextState.focusedElement =
            getElementIdentifier(element);
    }
}


function handleClick(event) {

    const element =
        event.target.closest
            ? event.target.closest(INTERACTIVE_SELECTOR)
            : null;

    recordInteraction(
        "click",
        element
    );
}


function handleInput(event) {

    const element =
        event.target.closest
            ? event.target.closest(INTERACTIVE_SELECTOR)
            : null;

    recordInteraction(
        "input",
        element
    );
}


function handleFocus(event) {

    const element =
        event.target.closest
            ? event.target.closest(INTERACTIVE_SELECTOR)
            : null;

    recordInteraction(
        "focus",
        element
    );
}


function handleChange(event) {

    const element =
        event.target.closest
            ? event.target.closest(INTERACTIVE_SELECTOR)
            : null;

    recordInteraction(
        "change",
        element
    );
}


function startContextCapture() {

    if (contextState.startedAt !== null) {
        return;
    }

    contextState.startedAt =
        Date.now();

    document.addEventListener(
        "click",
        handleClick,
        true
    );

    document.addEventListener(
        "input",
        handleInput,
        true
    );

    document.addEventListener(
        "focusin",
        handleFocus,
        true
    );

    document.addEventListener(
        "change",
        handleChange,
        true
    );

    console.log(
        "AuraGen context capture initialized."
    );
}


function stopContextCapture() {

    document.removeEventListener(
        "click",
        handleClick,
        true
    );

    document.removeEventListener(
        "input",
        handleInput,
        true
    );

    document.removeEventListener(
        "focusin",
        handleFocus,
        true
    );

    document.removeEventListener(
        "change",
        handleChange,
        true
    );

    contextState.startedAt = null;
}


function getUIContext() {

    contextState.fieldValues =
        captureFieldValues();

    const activeElement =
        document.activeElement;

    const focusedElement =
        activeElement &&
        activeElement.matches &&
        activeElement.matches(
            INTERACTIVE_SELECTOR
        )
            ? getElementIdentifier(activeElement)
            : contextState.focusedElement;

    const mouseTelemetry =
        typeof window.getMouseTelemetry === "function"
            ? window.getMouseTelemetry()
            : null;

    return {
        type: "ui_context",

        timestamp: Date.now(),

        domSnapshot:
            captureDomSnapshot(),

        focusedElement,

        fieldValues:
            contextState.fieldValues,

        interactionContext: {
            lastEvent:
                contextState.lastEvent,

            lastEventTimestamp:
                contextState.lastEventTimestamp,

            eventCount:
                contextState.eventCount,

            clickCount:
                contextState.clickCount,

            inputCount:
                contextState.inputCount,

            focusCount:
                contextState.focusCount,

            changeCount:
                contextState.changeCount
        },

        mouseTelemetry
    };
}


if (typeof window !== "undefined") {

    window.startContextCapture =
        startContextCapture;

    window.stopContextCapture =
        stopContextCapture;

    window.getUIContext =
        getUIContext;

    window.getElementIdentifier =
        getElementIdentifier;
}


if (
    typeof document !== "undefined" &&
    document.readyState === "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        startContextCapture
    );
} else if (
    typeof document !== "undefined"
) {
    startContextCapture();
}
