/**
 * Custom API Error Classes
 * 
 * Provides structured error handling for the Balance API
 */

export class ApiError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;

    constructor(statusCode: number, message: string, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;

        // Maintains proper stack trace for where error was thrown
        Error.captureStackTrace(this, this.constructor);

        // Set the prototype explicitly
        Object.setPrototypeOf(this, ApiError.prototype);
    }
}

export class BadRequestError extends ApiError {
    constructor(message: string) {
        super(400, message);
        Object.setPrototypeOf(this, BadRequestError.prototype);
    }
}

export class UnauthorizedError extends ApiError {
    constructor(message = 'Unauthorized access') {
        super(401, message);
        Object.setPrototypeOf(this, UnauthorizedError.prototype);
    }
}

export class ForbiddenError extends ApiError {
    constructor(message = 'Access forbidden') {
        super(403, message);
        Object.setPrototypeOf(this, ForbiddenError.prototype);
    }
}

export class NotFoundError extends ApiError {
    constructor(message: string) {
        super(404, message);
        Object.setPrototypeOf(this, NotFoundError.prototype);
    }
}

export class ConflictError extends ApiError {
    constructor(message: string) {
        super(409, message);
        Object.setPrototypeOf(this, ConflictError.prototype);
    }
}

export class ValidationError extends ApiError {
    public readonly errors: any[];

    constructor(message: string, errors: any[] = []) {
        super(422, message);
        this.errors = errors;
        Object.setPrototypeOf(this, ValidationError.prototype);
    }
}

export class InternalServerError extends ApiError {
    constructor(message = 'Internal server error') {
        super(500, message, false);
        Object.setPrototypeOf(this, InternalServerError.prototype);
    }
}
