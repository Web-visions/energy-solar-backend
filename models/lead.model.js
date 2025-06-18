const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const leadSchema = new mongoose.Schema({
    projectType: {
        type: String,
        enum: ['off-grid-lead', 'on-grid-lead', 'hybrid-lead'],
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    contact: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    loadInKW: {
        type: String,
        trim: true
    },
    backupTime: {
        type: String,
        trim: true
    },
    rooftopSpace: {
        type: String,
        trim: true
    },
    sanctionLoad: {
        type: String,
        trim: true
    },
    investmentAmount: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['new', 'contacted', 'qualified', 'converted', 'lost'],
        default: 'new'
    },
    notes: {
        type: String,
        trim: true
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Add pagination plugin
leadSchema.plugin(mongoosePaginate);

// Index for better query performance
leadSchema.index({ projectType: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Lead', leadSchema); 