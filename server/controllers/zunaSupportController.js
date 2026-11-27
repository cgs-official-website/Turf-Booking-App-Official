const { z } = require('zod');
const zunaSupportService = require('../services/zunaSupportService');
const { sendSuccess } = require('../utils/response');

const createSchema = z.object({
    subject: z.string().trim().min(3, 'Subject must be at least 3 characters').max(255),
    description: z.string().trim().min(5, 'Description must be at least 5 characters').max(5000),
    priority: z
        .string()
        .optional()
        .transform((v) => (v ? v.toUpperCase() : 'MEDIUM'))
        .pipe(z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])),
});

const listSchema = z.object({
    status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(50),
});

const idSchema = z.string().trim().min(1).max(64);

const messageSchema = z.object({
    text: z.string().trim().min(1, 'Message cannot be empty').max(5000),
});

// express-async-errors forwards thrown errors (including ZodError) to middleware/errorHandler.js
const zunaSupportController = {
    async listTickets(req, res) {
        const query = listSchema.parse(req.query);
        const result = await zunaSupportService.listTickets(req.user, query);
        return sendSuccess(res, result);
    },

    async createTicket(req, res) {
        const body = createSchema.parse(req.body);
        const result = await zunaSupportService.createTicket(req.user, body);
        return sendSuccess(res, result, 201);
    },

    async getTicket(req, res) {
        const id = idSchema.parse(req.params.id);
        const ticket = await zunaSupportService.getTicket(req.user, id);
        return sendSuccess(res, ticket);
    },

    async addMessage(req, res) {
        const id = idSchema.parse(req.params.id);
        const body = messageSchema.parse(req.body);
        const message = await zunaSupportService.addMessage(req.user, id, body);
        return sendSuccess(res, message, 201);
    },
};

module.exports = zunaSupportController;
