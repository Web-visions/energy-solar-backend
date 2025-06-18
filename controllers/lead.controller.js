const Lead = require('../models/lead.model');

// Submit a new lead
exports.submitLead = async (req, res) => {
    try {
        const {
            projectType,
            name,
            contact,
            email,
            loadInKW,
            backupTime,
            rooftopSpace,
            sanctionLoad,
            investmentAmount
        } = req.body;

        // Validate required fields
        if (!projectType || !name || !contact) {
            return res.status(400).json({
                message: 'Project type, name, and contact are required'
            });
        }

        // Validate project type
        const validProjectTypes = ['off-grid-lead', 'on-grid-lead', 'hybrid-lead'];
        if (!validProjectTypes.includes(projectType)) {
            return res.status(400).json({
                message: 'Invalid project type'
            });
        }

        // Validate phone number
        const phoneRegex = /^[6-9]\d{9}$/;
        if (!phoneRegex.test(contact)) {
            return res.status(400).json({
                message: 'Please enter a valid 10-digit phone number'
            });
        }

        // Validate email if provided
        if (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({
                    message: 'Please enter a valid email address'
                });
            }
        }

        // Create new lead
        const lead = new Lead({
            projectType,
            name,
            contact,
            email,
            loadInKW,
            backupTime,
            rooftopSpace,
            sanctionLoad,
            investmentAmount
        });

        await lead.save();

        res.status(201).json({
            message: 'Lead submitted successfully',
            leadId: lead._id
        });

    } catch (error) {
        console.error('Error submitting lead:', error);
        res.status(500).json({
            message: 'Failed to submit lead. Please try again.'
        });
    }
};

// Get all leads (admin only)
exports.getAllLeads = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, projectType, search } = req.query;

        const query = {};

        // Filter by status
        if (status && status !== 'all') {
            query.status = status;
        }

        // Filter by project type
        if (projectType && projectType !== 'all') {
            query.projectType = projectType;
        }

        // Search functionality
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { contact: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            sort: { createdAt: -1 },
            populate: {
                path: 'assignedTo',
                select: 'name email'
            }
        };

        const leads = await Lead.paginate(query, options);

        res.json(leads);

    } catch (error) {
        console.error('Error fetching leads:', error);
        res.status(500).json({
            message: 'Failed to fetch leads'
        });
    }
};

// Get lead by ID
exports.getLeadById = async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.id)
            .populate('assignedTo', 'name email');

        if (!lead) {
            return res.status(404).json({
                message: 'Lead not found'
            });
        }

        res.json(lead);

    } catch (error) {
        console.error('Error fetching lead:', error);
        res.status(500).json({
            message: 'Failed to fetch lead'
        });
    }
};

// Update lead status
exports.updateLeadStatus = async (req, res) => {
    try {
        const { status, notes, assignedTo } = req.body;

        const updateData = {};
        if (status) updateData.status = status;
        if (notes !== undefined) updateData.notes = notes;
        if (assignedTo) updateData.assignedTo = assignedTo;

        const lead = await Lead.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        ).populate('assignedTo', 'name email');

        if (!lead) {
            return res.status(404).json({
                message: 'Lead not found'
            });
        }

        res.json(lead);

    } catch (error) {
        console.error('Error updating lead:', error);
        res.status(500).json({
            message: 'Failed to update lead'
        });
    }
};

// Delete lead
exports.deleteLead = async (req, res) => {
    try {
        const lead = await Lead.findByIdAndDelete(req.params.id);

        if (!lead) {
            return res.status(404).json({
                message: 'Lead not found'
            });
        }

        res.json({
            message: 'Lead deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting lead:', error);
        res.status(500).json({
            message: 'Failed to delete lead'
        });
    }
};

// Get lead statistics
exports.getLeadStats = async (req, res) => {
    try {
        const stats = await Lead.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        const projectTypeStats = await Lead.aggregate([
            {
                $group: {
                    _id: '$projectType',
                    count: { $sum: 1 }
                }
            }
        ]);

        const totalLeads = await Lead.countDocuments();
        const newLeads = await Lead.countDocuments({ status: 'new' });

        res.json({
            statusStats: stats,
            projectTypeStats,
            totalLeads,
            newLeads
        });

    } catch (error) {
        console.error('Error fetching lead stats:', error);
        res.status(500).json({
            message: 'Failed to fetch lead statistics'
        });
    }
}; 