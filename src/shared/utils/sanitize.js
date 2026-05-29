function redactValue(value) {
    if (Array.isArray(value)) {
        return value.map(redactValue);
    }

    if (value && typeof value === "object") {
        const output = {};
        for (const [key, val] of Object.entries(value)) {
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
