const BulkLead = require('../models/bulkLead.model');

// Submit a new bulk lead
exports.submitBulkLead = async (req, res) => {
    try {
        const { name, email, phone, message } = req.body;
        if (!name || !email || !phone || !message) {
            return res.status(400).json({ message: 'All fields are required.' });
        }
        // Basic email and phone validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Invalid email address.' });
        }
        const phoneRegex = /^[6-9]\d{9}$/;
        if (!phoneRegex.test(phone)) {
            return res.status(400).json({ message: 'Invalid phone number.' });
        }
        const lead = new BulkLead({ name, email, phone, message });
        await lead.save();
        res.status(201).json({ message: 'Bulk order inquiry submitted successfully.' });
    } catch (error) {
        console.error('Error submitting bulk lead:', error);
        res.status(500).json({ message: 'Failed to submit bulk order inquiry.' });
    }
};

// Get all bulk leads (admin only)
exports.getAllBulkLeads = async (req, res) => {
    try {
        const { page = 1, limit = 20, search } = req.query;
        const query = {};
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
                { message: { $regex: search, $options: 'i' } }
            ];
        }
        const leads = await BulkLead.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));
        const total = await BulkLead.countDocuments(query);
        res.json({ data: leads, total });
    } catch (error) {
        console.error('Error fetching bulk leads:', error);
        res.status(500).json({ message: 'Failed to fetch bulk order inquiries.' });
    }
}; 