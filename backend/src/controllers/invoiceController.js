const { Invoice, Patient, AuditLog } = require('../models');
const { generateInvoiceNumber } = require('../utils/helpers');
const { generateInvoicePdf } = require('../utils/pdf');

const invoiceController = {
  async list(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;

      let doctorId = null;
      if (req.user.role === 'doctor') {
        const doctor = await require('../models').Doctor.findByUserId(req.user.id);
        doctorId = doctor?.id;
      } else if (req.user.role === 'assistant' || req.user.role === 'nurse') {
        const user = await require('../models').User.findById(req.user.id);
        doctorId = user?.doctor_id;
      }

      if (doctorId) {
        const { rows } = await require('../config/db').query(
          `SELECT i.*, u.first_name, u.last_name FROM invoices i
           JOIN patients p ON i.patient_id = p.id
           JOIN users u ON p.user_id = u.id
           WHERE i.doctor_id = $1
            ORDER BY CASE WHEN i.status = 'unpaid' THEN 0 ELSE 1 END, i.created_at DESC LIMIT $2 OFFSET $3`,
          [doctorId, limit, (page - 1) * limit]
        );
        const count = await require('../config/db').query(
          'SELECT COUNT(*) FROM invoices WHERE doctor_id = $1', [doctorId]
        );
        return res.json({ data: rows, total: parseInt(count.rows[0].count), page, limit });
      }

      const result = await Invoice.findAll({ page, limit });
      res.json(result);
    } catch (error) {
      console.error('List invoices error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async create(req, res) {
    try {
      const { patientId, items } = req.body;
      if (!patientId || !items || !items.length) {
        return res.status(400).json({ error: 'patientId and items are required.' });
      }

      let doctorId = null;
      if (req.user.role === 'doctor') {
        const doctor = await require('../models').Doctor.findByUserId(req.user.id);
        doctorId = doctor.id;
      }

      const amount = items.reduce((sum, item) => sum + parseFloat(item.total), 0);
      const tax = amount * 0.0; // Tax rate can be configured
      const total = amount + tax;

      const invoice = await Invoice.create({
        patientId,
        doctorId,
        assistantId: req.user.role === 'assistant' ? req.user.id : null,
        invoiceNumber: generateInvoiceNumber(),
        amount,
        tax,
        total,
        items,
      });

      await AuditLog.create({
        userId: req.user.id,
        action: 'CREATE_INVOICE',
        entityType: 'invoice',
        entityId: invoice.id,
        ipAddress: req.ip,
      });

      res.status(201).json(invoice);
    } catch (error) {
      console.error('Create invoice error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async getById(req, res) {
    try {
      const invoice = await Invoice.findById(req.params.id);
      if (!invoice) return res.status(404).json({ error: 'Invoice not found.' });

      const items = await Invoice.getItems(req.params.id);
      res.json({ ...invoice, items });
    } catch (error) {
      console.error('Get invoice error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async generatePdf(req, res) {
    try {
      const invoice = await Invoice.findById(req.params.id);
      if (!invoice) return res.status(404).json({ error: 'Invoice not found.' });

      const items = await Invoice.getItems(req.params.id);
      const patient = await Patient.findById(invoice.patient_id);

      let doctor = null;
      if (invoice.doctor_id) {
        doctor = await require('../models').Doctor.findById(invoice.doctor_id);
      }

      const pdfPath = await generateInvoicePdf(invoice, items, patient, doctor);

      res.json({ pdfPath, message: 'PDF generated.' });
    } catch (error) {
      console.error('Generate invoice PDF error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async updateStatus(req, res) {
    try {
      const { status } = req.body;
      if (!['unpaid', 'paid', 'cancelled'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status.' });
      }

      const invoice = await Invoice.updateStatus(req.params.id, status);
      if (!invoice) return res.status(404).json({ error: 'Invoice not found.' });

      if (status === 'paid') {
        await AuditLog.create({
          userId: req.user.id,
          action: 'MARK_INVOICE_PAID',
          entityType: 'invoice',
          entityId: req.params.id,
          ipAddress: req.ip,
        });
      }

      res.json(invoice);
    } catch (error) {
      console.error('Update invoice status error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async split(req, res) {
    try {
      const { amount, description, promisedPaymentDate } = req.body;
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Split amount must be positive.' });
      }

      const invoice = await Invoice.findById(req.params.id);
      if (!invoice) return res.status(404).json({ error: 'Invoice not found.' });
      if (invoice.status === 'paid') {
        return res.status(400).json({ error: 'Cannot split a paid invoice.' });
      }
      if (parseFloat(amount) >= parseFloat(invoice.total)) {
        return res.status(400).json({ error: 'Split amount must be less than the invoice total.' });
      }

      const result = await Invoice.split(req.params.id, { amount: parseFloat(amount), description, promisedPaymentDate });

      await AuditLog.create({
        userId: req.user.id,
        action: 'SPLIT_INVOICE',
        entityType: 'invoice',
        entityId: req.params.id,
        details: { splitAmount: amount, newInvoiceId: result.newInvoice.id },
        ipAddress: req.ip,
      });

      res.json(result);
    } catch (error) {
      console.error('Split invoice error:', error);
      res.status(500).json({ error: error.message || 'Server error.' });
    }
  },
};

module.exports = invoiceController;
