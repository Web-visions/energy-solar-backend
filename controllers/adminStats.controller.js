const fs = require('fs');
const path = require('path');
const Order = require('../models/order.model');

// Dynamically load all models in /models
const modelsDir = path.join(__dirname, '../models');
const modelFiles = fs.readdirSync(modelsDir).filter(f => f.endsWith('.js'));
const models = {};
modelFiles.forEach(file => {
    const model = require(path.join(modelsDir, file));
    // Use model.modelName if available, else filename
    const name = model.modelName || file.replace(/\.js$/, '');
    models[name] = model;
});

exports.getAllStats = async (req, res) => {
    try {
        const stats = {};
        for (const [name, model] of Object.entries(models)) {
            // Only countDocuments if model has it (skip non-mongoose files)
            if (typeof model.countDocuments === 'function') {
                stats[name] = await model.countDocuments();
            }
        }
        res.json({ success: true, stats });
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch stats' });
    }
};

// GET /admin-stats/orders-graph?range=7d|1m|6m|1y|all
exports.getOrderGraph = async (req, res) => {
    try {
        const { range = '7d' } = req.query;
        let group, match = {}, dateFormat, startDate;
        const now = new Date();
        if (range === '1d') {
            // Last 24 hours, group by hour
            startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            group = { $hour: '$createdAt' };
            dateFormat = '%H:00';
        } else if (range === '7d') {
            // Last 7 days, group by day
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            group = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
            dateFormat = '%Y-%m-%d';
        } else if (range === '1m') {
            // Last 1 month, group by day
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            group = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
            dateFormat = '%Y-%m-%d';
        } else if (range === '6m') {
            // Last 6 months, group by month
            startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
            group = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
            dateFormat = '%Y-%m';
        } else if (range === '1y') {
            // Last 1 year, group by month
            startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            group = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
            dateFormat = '%Y-%m';
        } else {
            // All time, group by year
            group = { $dateToString: { format: '%Y', date: '$createdAt' } };
            dateFormat = '%Y';
        }
        if (startDate) match.createdAt = { $gte: startDate };
        const data = await Order.aggregate([
            { $match: match },
            { $group: { _id: group, count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);
        res.json({ success: true, data: data.map(d => ({ label: d._id, count: d.count })) });
    } catch (error) {
        console.error('Error fetching order graph:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch order graph' });
    }
}; 