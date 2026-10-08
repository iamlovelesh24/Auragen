// ============================================================
// AuraGen - UI Morphing
// Member 2 - Week 3
//
// Provides a smooth transition from the existing static UI
// to a generated/adaptive UI while preserving user context.
// ============================================================


// ============================================================
// MORPH CONFIGURATION
// ============================================================

const AURAGEN_MORPH_DURATION = 500;


// ============================================================
// CREATE GENERATED UI
// ============================================================

function createGeneratedUI(context) {

    const container =
        document.createElement("div");

    container.id =
        "auraGenGeneratedUI";

    container.style.opacity = "0";

    container.style.transform =
        "translateY(15px) scale(0.98)";

    container.style.transition =
        "opacity " +
        AURAGEN_MORPH_DURATION +
        "ms ease, transform " +
        AURAGEN_MORPH_DURATION +
        "ms ease";

    container.style.padding =
        "20px";

    container.style.marginTop =
        "20px";

    container.style.border =
        "2px solid #444";

    container.style.borderRadius =
        "10px";


    const heading =
        document.createElement("h2");

    heading.textContent =
        "AuraGen Adaptive UI";

    container.appendChild(heading);


    const message =
        document.createElement("p");

    message.textContent =
        "Your interface has been adapted while preserving your entered information.";

    container.appendChild(message);


    const name =
        document.createElement("p");

    name.textContent =
        "User Name: " +
        (
            context.userInput.userName?.value ||
            ""
        );

    container.appendChild(name);


    const account =
        document.createElement("p");

    account.textContent =
        "Account Type: " +
        (
            context.userInput.accountType?.value ||
            ""
        );

    container.appendChild(account);


    const request =
        document.createElement("p");

    request.textContent =
        "Request: " +
        (
            context.userInput.userRequest?.value ||
            ""
        );

    container.appendChild(request);


    return container;
}


// ============================================================
// MORPH STATIC UI → GENERATED UI
// ============================================================

function morphToGeneratedUI() {

    const context =
        typeof window.getAuraGenContext === "function"
            ? window.getAuraGenContext()
            : null;


    if (!context) {

        console.warn(
            "AuraGen context is not available."
        );

        return;
    }


    const existingUI =
        document.body;


    const generatedUI =
        createGeneratedUI(context);


    existingUI.appendChild(
        generatedUI
    );


    // Allow browser to render initial state
    requestAnimationFrame(function () {

        generatedUI.style.opacity =
            "1";

        generatedUI.style.transform =
            "translateY(0) scale(1)";
    });


    console.log(
        "AuraGen UI morph completed.",
        context
    );
}


// ============================================================
// RESTORE ORIGINAL USER INPUT
// ============================================================

function restoreAuraGenContext() {

    if (
        typeof window.getAuraGenContext !==
        "function"
    ) {
        return;
    }


    const context =
        window.getAuraGenContext();


    if (
        typeof window.restoreAuraGenInput ===
        "function"
    ) {

        window.restoreAuraGenInput(
            context.userInput
        );
    }


    console.log(
        "AuraGen user context restored."
    );
}


// ============================================================
// GLOBAL ACCESS
// ============================================================

window.morphToGeneratedUI =
    morphToGeneratedUI;

window.restoreAuraGenContext =
    restoreAuraGenContext;


console.log(
    "AuraGen UI morphing module initialized."
);