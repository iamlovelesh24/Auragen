// ============================================================
// AuraGen - Contextual Awareness
// Member 2 - Week 3
//
// Captures the current UI state and user-entered values so
// generated UI can preserve the user's existing progress.
// ============================================================


// ============================================================
// CAPTURE USER INPUT
// ============================================================

function captureUserInput() {

    const inputs = {};

    const fields = document.querySelectorAll(
        "input, textarea, select"
    );

    fields.forEach(function (field, index) {

        const key =
            field.name ||
            field.id ||
            "field-" + index;

        if (field.type === "checkbox" ||
            field.type === "radio") {

            inputs[key] = {
                type: field.type,
                value: field.value,
                checked: field.checked
            };

        } else {

            inputs[key] = {
                type: field.type || field.tagName.toLowerCase(),
                value: field.value
            };
        }
    });

    return inputs;
}


// ============================================================
// CAPTURE ACTIVE ELEMENT
// ============================================================

function captureActiveElement() {

    const activeElement =
        document.activeElement;

    if (!activeElement ||
        activeElement === document.body) {

        return null;
    }

    return {
        tagName:
            activeElement.tagName,

        id:
            activeElement.id || null,

        name:
            activeElement.name || null,

        type:
            activeElement.type || null
    };
}


// ============================================================
// CAPTURE DOM CONTEXT
// ============================================================

function captureDOMContext() {

    const body =
        document.body;

    return {

        title:
            document.title,

        url:
            window.location.href,

        bodyClass:
            body ? body.className : "",

        elementCount:
            document.querySelectorAll("*").length,

        forms:
            document.querySelectorAll("form").length,

        inputs:
            document.querySelectorAll(
                "input, textarea, select"
            ).length
    };
}


// ============================================================
// CAPTURE COMPLETE AURAGEN CONTEXT
// ============================================================

function captureAuraGenContext() {

    return {

        timestamp:
            new Date().toISOString(),

        userInput:
            captureUserInput(),

        activeElement:
            captureActiveElement(),

        dom:
            captureDOMContext()
    };
}


// ============================================================
// RESTORE USER INPUT
// ============================================================

function restoreUserInput(userInput) {

    if (!userInput) {
        return;
    }

    Object.keys(userInput).forEach(function (key) {

        const data =
            userInput[key];

        const field =
            document.getElementById(key) ||
            document.querySelector(
                '[name="' + key + '"]'
            );

        if (!field) {
            return;
        }

        if (data.type === "checkbox" ||
            data.type === "radio") {

            field.checked =
                Boolean(data.checked);

        } else if (
            Object.prototype.hasOwnProperty.call(
                data,
                "value"
            )
        ) {

            field.value =
                data.value;
        }
    });
}


// ============================================================
// GLOBAL ACCESS
// ============================================================

window.getAuraGenContext =
    captureAuraGenContext;

window.restoreAuraGenInput =
    restoreUserInput;


// ============================================================
// INITIALIZATION
// ============================================================

console.log(
    "AuraGen contextual awareness initialized."
);