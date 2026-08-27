export const FLEET_ERROR_CODES = {
    NO_TARGETS: 'FLEET_NO_TARGETS',
    TOO_MANY_TARGETS: 'FLEET_TOO_MANY_TARGETS',
    NOT_FOUND: 'FLEET_NOT_FOUND',
} as const;

export type FleetErrorCode = typeof FLEET_ERROR_CODES[keyof typeof FLEET_ERROR_CODES];

export const FLEET_ERRORS = {
    [FLEET_ERROR_CODES.NO_TARGETS]: 'Kamida bitta device tanlanishi kerak',
    [FLEET_ERROR_CODES.TOO_MANY_TARGETS]: 'Bitta fleet run uchun ko\'pi bilan 1000 ta device',
    [FLEET_ERROR_CODES.NOT_FOUND]: 'Fleet run topilmadi',
} as const;
