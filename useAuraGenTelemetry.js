import { useEffect, useState } from "react";

/**
 * AuraGen React Telemetry Hook
 *
 * Connects a React component to the existing
 * AuraGen browser telemetry API.
 */
export function useAuraGenTelemetry(refreshInterval = 1000) {
    const [telemetry, setTelemetry] = useState(null);

    useEffect(() => {
        const readTelemetry = () => {
            if (
                typeof window !== "undefined" &&
                typeof window.getAuraGenTelemetry === "function"
            ) {
                const data = window.getAuraGenTelemetry();

                setTelemetry(data);
            }
        };

        readTelemetry();

        const timer = setInterval(
            readTelemetry,
            refreshInterval
        );

        return () => {
            clearInterval(timer);
        };
    }, [refreshInterval]);

    return telemetry;
}

export default useAuraGenTelemetry;