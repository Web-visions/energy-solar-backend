const Manufacturer = require('../models/manufacturer.model');

exports.createManufacturer = async (req, res) => {
    try {
        const { name, category } = req.body;

        if (!name || !category) {
            return res.status(400).json({ success: false, message: 'Name and category are required' });
        }

        if (name.length < 2) {
            return res.status(400).json({ success: false, message: 'Manufacturer name must be at least 2 characters' });
        }

        const existingManufacturer = await Manufacturer.findOne({ name: name.trim(), category });
        if (existingManufacturer) {
            return res.status(400).json({ success: false, message: 'Manufacturer with this name already exists in this category' });
        }

        const manufacturer = await Manufacturer.create({ name: name.trim(), category });

        res.status(201).json({ success: true, message: 'Manufacturer created successfully', manufacturer });
    } catch (error) {
        console.error(error);
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'Manufacturer already exists' });
        }
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

exports.getManufacturerById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ success: false, message: 'Invalid manufacturer ID' });
        }

        const manufacturer = await Manufacturer.findById(id);
        if (!manufacturer) {
            return res.status(404).json({ success: false, message: 'Manufacturer not found' });
        }

        res.status(200).json({ success: true, manufacturer });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

exports.getAllManufacturers = async (req, res) => {
    try {
        const { category } = req.query;
        const filter = category ? { category } : {};
        const manufacturers = await Manufacturer.find(filter).sort({ name: 1 });

        res.status(200).json({ success: true, count: manufacturers.length, manufacturers });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

exports.updateManufacturer = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, category } = req.body;

        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ success: false, message: 'Invalid manufacturer ID' });
        }

        if (!name || !category) {
            return res.status(400).json({ success: false, message: 'Name and category are required' });
        }

        if (name.length < 2) {
            return res.status(400).json({ success: false, message: 'Manufacturer name must be at least 2 characters' });
        }

        const existingManufacturer = await Manufacturer.findOne({ name: name.trim(), category, _id: { $ne: id } });
        if (existingManufacturer) {
            return res.status(400).json({ success: false, message: 'Manufacturer already exists in this category' });
        }

        const manufacturer = await Manufacturer.findByIdAndUpdate(id, { name: name.trim(), category }, { new: true, runValidators: true });
        if (!manufacturer) {
            return res.status(404).json({ success: false, message: 'Manufacturer not found' });
        }

        res.status(200).json({ success: true, message: 'Manufacturer updated successfully', manufacturer });
    } catch (error) {
        console.error(error);
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'Manufacturer already exists' });
        }
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
