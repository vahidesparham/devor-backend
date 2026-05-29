function redactValue(value) {
    if (typeof value === "bigint") {
        return value.toString();
    }

    if (Array.isArray(value)) {
        return value.map(redactValue);
    }

    if (value && typeof value === "object") {
        if (value instanceof Date) {
            return value.toISOString();
        }

        if (
            typeof value.toString === "function" &&
            typeof value.s === "number" &&
            typeof value.e === "number" &&
            Array.isArray(value.d)
        ) {
            return Number(value.toString());
        }

        const output = {};
        for (const [key, val] of Object.entries(value)) {
            if (typeof val === "function") {
                continue;
            }

            const lowered = key.toLowerCase();
            if (lowered.includes("password") || lowered.includes("token") || lowered.includes("secret") || lowered.includes("authorization")) {
                output[key] = "[REDACTED]";
            } else {
                output[key] = redactValue(val);
            }
        }
        return output;
    }

    return value;
}

module.exports = { redactValue };
