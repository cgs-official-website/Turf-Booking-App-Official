const prisma = require('../config/prisma');

/**
 * Zuna Central Support Desk client.
 *
 * The Turf platform (Super Admin) talks to Zuna ONLY through Zuna's external product API,
 * authenticated by the secret x-api-key of the "Turf Booking System" product.
 * The key lives in this server's environment and never reaches the browser.
 *
 * Tickets are tied to the logged-in Super Admin by clientEmail (taken from the verified JWT,
 * never from request input), so one admin cannot read another admin's tickets.
 */

const REQUEST_TIMEOUT_MS = 10000;

const httpError = (message, statusCode, code) => {
    const err = new Error(message);
    err.statusCode = statusCode;
    err.code = code;
    return err;
};

const ensureConfigured = () => {
    if (!process.env.ZUNA_API_URL || !process.env.ZUNA_API_KEY) {
        throw httpError(
            'Zuna support desk is not configured. Set ZUNA_API_URL and ZUNA_API_KEY on the server.',
            503,
            'ZUNA_NOT_CONFIGURED'
        );
    }
};

const zunaRequest = async (method, path, { query, body } = {}) => {
    ensureConfigured();

    const baseUrl = String(process.env.ZUNA_API_URL).replace(/\/+$/, '');
    const params = new URLSearchParams(
        Object.entries(query || {}).filter(([, v]) => v !== undefined && v !== null && v !== '')
    ).toString();
    const url = `${baseUrl}/api/public/tickets${path}${params ? `?${params}` : ''}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response;
    try {
        response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.ZUNA_API_KEY,
            },
            body: body ? JSON.stringify(body) : undefined,
            signal: controller.signal,
        });
    } catch (err) {
        if (err && err.name === 'AbortError') {
            throw httpError('Zuna support desk timed out. Please try again.', 504, 'ZUNA_TIMEOUT');
        }
        throw httpError('Zuna support desk is unreachable. Please try again later.', 502, 'ZUNA_UNREACHABLE');
    } finally {
        clearTimeout(timer);
    }

    const json = await response.json().catch(() => null);

    if (!response.ok || !json || !json.success) {
        const message =
            (json && json.error && json.error.message) ||
            `Zuna support desk responded with HTTP ${response.status}`;
        if (response.status === 404) throw httpError('Ticket not found', 404, 'TICKET_NOT_FOUND');
        if (response.status === 400) throw httpError(message, 400, 'ZUNA_VALIDATION_ERROR');
        if (response.status === 409) throw httpError(message, 409, 'ZUNA_CONFLICT');
        if (response.status === 429) throw httpError(message, 429, 'ZUNA_RATE_LIMITED');
        // 401 = our API key is wrong/inactive: a server configuration problem, not the admin's fault
        throw httpError(
            response.status === 401
                ? 'Support desk credentials are invalid. Please contact the Zuna team.'
                : message,
            502,
            'ZUNA_BAD_GATEWAY'
        );
    }

    return json;
};

/** Identity sent to Zuna, always derived from the verified admin token. */
const buildIdentity = async (user) => {
    const email = String((user && user.email) || '').toLowerCase().trim();
    if (!email) {
        throw httpError('Your admin account has no email, so a support ticket cannot be raised.', 400, 'ADMIN_EMAIL_MISSING');
    }

    let adminName = '';
    try {
        const admin = await prisma.superAdmin.findUnique({
            where: { email },
            select: { name: true },
        });
        adminName = (admin && admin.name) || '';
    } catch (_) {
        adminName = '';
    }

    const platform = 'Turf Booking Platform';
    return { email, displayName: adminName ? `${adminName} (${platform})` : platform };
};

const listTickets = async (user, { status, page, limit } = {}) => {
    const { email } = await buildIdentity(user);
    const json = await zunaRequest('GET', '', { query: { clientEmail: email, status, page, limit } });
    return json.data;
};

const createTicket = async (user, { subject, description, priority }) => {
    const { email, displayName } = await buildIdentity(user);
    const json = await zunaRequest('POST', '', {
        body: { clientName: displayName, clientEmail: email, subject, description, priority },
    });
    return json.data; // { ticketId }
};

const getTicket = async (user, ticketId) => {
    const { email } = await buildIdentity(user);
    const json = await zunaRequest('GET', `/${encodeURIComponent(ticketId)}`, { query: { clientEmail: email } });
    return json.data;
};

const addMessage = async (user, ticketId, { text }) => {
    const { email, displayName } = await buildIdentity(user);
    const json = await zunaRequest('POST', `/${encodeURIComponent(ticketId)}/messages`, {
        body: { authorName: displayName, clientEmail: email, text },
    });
    return json.data;
};

module.exports = { listTickets, createTicket, getTicket, addMessage };
