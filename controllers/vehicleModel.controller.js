const VehicleModel = require('../models/vehicleModel');
const Manufacturer = require('../models/manufacturer.model');

exports.createVehicleModel = async (req, res) => {
    try {
        const { name, manufacturer, category } = req.body;

        if (!name || !manufacturer || !category) {
            return res.status(400).json({ success: false, message: 'Name, category and manufacturer are required' });
        }

        if (name.length < 2) {
            return res.status(400).json({ success: false, message: 'Vehicle model name must be at least 2 characters' });
        }

        if (!manufacturer.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ success: false, message: 'Invalid manufacturer ID' });
        }

        const manufacturerExists = await Manufacturer.findById(manufacturer);
        if (!manufacturerExists) {
            return res.status(400).json({ success: false, message: 'Manufacturer not found' });
        }

        if (manufacturerExists.category !== category) {
            return res.status(400).json({ success: false, message: `Manufacturer belongs to ${manufacturerExists.category}, but you provided ${category}` });
        }

        const existingModel = await VehicleModel.findOne({ name: name.trim(), manufacturer });
        if (existingModel) {
            return res.status(400).json({ success: false, message: 'Vehicle model already exists for this manufacturer' });
        }

        const vehicleModel = await VehicleModel.create({ name: name.trim(), manufacturer, category });
        await vehicleModel.populate('manufacturer', 'name category');

        res.status(201).json({ success: true, message: 'Vehicle model created successfully', vehicleModel });
    } catch (error) {
        console.error(error);
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'Vehicle model already exists' });
        }
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

exports.getVehicleModelById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ success: false, message: 'Invalid vehicle model ID' });
        }

        const vehicleModel = await VehicleModel.findById(id).populate('manufacturer', 'name category');
        if (!vehicleModel) {
            return res.status(404).json({ success: false, message: 'Vehicle model not found' });
        }

        res.status(200).json({ success: true, vehicleModel });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

exports.getAllVehicleModels = async (req, res) => {
    try {
        const { manufacturer, category } = req.query;
        const filter = {};
        if (manufacturer) filter.manufacturer = manufacturer;
        if (category) filter.category = category;

        const vehicleModels = await VehicleModel.find(filter).populate('manufacturer', 'name category').sort({ name: 1 });
        res.status(200).json({ success: true, count: vehicleModels.length, vehicleModels });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

exports.getVehicleModelsByManufacturer = async (req, res) => {
    try {
        const { manufacturerId } = req.params;
        if (!manufacturerId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ success: false, message: 'Invalid manufacturer ID' });
        }

        const manufacturer = await Manufacturer.findById(manufacturerId);
        if (!manufacturer) {
            return res.status(404).json({ success: false, message: 'Manufacturer not found' });
        }

        const vehicleModels = await VehicleModel.find({ manufacturer: manufacturerId }).populate('manufacturer', 'name category').sort({ name: 1 });

        res.status(200).json({ success: true, manufacturer: manufacturer.name, count: vehicleModels.length, vehicleModels });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

exports.updateVehicleModel = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, manufacturer, category } = req.body;

        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ success: false, message: 'Invalid vehicle model ID' });
        }

        if (!name || !manufacturer || !category) {
            return res.status(400).json({ success: false, message: 'Name, category and manufacturer are required' });
        }

        if (name.length < 2) {
            return res.status(400).json({ success: false, message: 'Vehicle model name must be at least 2 characters' });
        }

        if (!manufacturer.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ success: false, message: 'Invalid manufacturer ID' });
        }

        const manufacturerExists = await Manufacturer.findById(manufacturer);
        if (!manufacturerExists) {
            return res.status(400).json({ success: false, message: 'Manufacturer not found' });
        }

        if (manufacturerExists.category !== category) {
            return res.status(400).json({ success: false, message: `Manufacturer belongs to ${manufacturerExists.category}, but you provided ${category}` });
        }

        const existingModel = await VehicleModel.findOne({ name: name.trim(), manufacturer, _id: { $ne: id } });
        if (existingModel) {
            return res.status(400).json({ success: false, message: 'Vehicle model already exists for this manufacturer' });
        }

        const vehicleModel = await VehicleModel.findByIdAndUpdate(id, { name: name.trim(), manufacturer, category }, { new: true, runValidators: true }).populate('manufacturer', 'name category');
        if (!vehicleModel) {
            return res.status(404).json({ success: false, message: 'Vehicle model not found' });
        }

        res.status(200).json({ success: true, message: 'Vehicle model updated successfully', vehicleModel });
    } catch (error) {
        console.error(error);
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'Vehicle model already exists' });
        }
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
