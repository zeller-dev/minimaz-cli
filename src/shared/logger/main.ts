import {
    emit
} from "./core.js"

/* =========================
   PUBLIC API
========================= */

export const log = {
    debug(message: string | string[]) {
        emit("debug", message, false, true)
    },

    default(message: string | string[]) {
        emit("info", message, true)
    },

    error(message: string | string[]) {
        emit("error", message)
    },

    info(message: string | string[]) {
        emit("info", message)
    },

    success(message: string | string[]) {
        emit("success", message, false)
    },

    verbose(message: string | string[]) {
        emit("info", message, true, true)
    },

    warn(message: string | string[]) {
        emit("warn", message)
    }
}