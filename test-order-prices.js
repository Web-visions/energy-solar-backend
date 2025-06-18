const mongoose = require('mongoose');
const Order = require('./models/order.model');
const Cart = require('./models/cart.model');
const Battery = require('./models/battery');
const UPS = require('./models/ups.model');
const Inverter = require('./models/invertor.model..js');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/solar-energy', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

async function testOrderCreation() {
    try {
        console.log('Testing order creation with proper prices...');

        // Check all product types
        const battery = await Battery.findOne();
        const ups = await UPS.findOne();
        const inverter = await Inverter.findOne();

        console.log('Available products:');
        console.log('Battery:', battery ? 'Found' : 'Not found');
        console.log('UPS:', ups ? 'Found' : 'Not found');
        console.log('Inverter:', inverter ? 'Found' : 'Not found');

        if (battery) {
            console.log('Battery details:', {
                name: battery.name,
                sellingPrice: battery.sellingPrice,
                mrp: battery.mrp,
                price: battery.price
            });
        }

        if (ups) {
            console.log('UPS details:', {
                name: ups.name,
                sellingPrice: ups.sellingPrice,
                mrp: ups.mrp,
                price: ups.price
            });
        }

        if (inverter) {
            console.log('Inverter details:', {
                name: inverter.name,
                sellingPrice: inverter.sellingPrice,
                mrp: inverter.mrp,
                price: inverter.price
            });
        }

        // Test price calculation logic
        if (battery) {
            console.log('\nTesting battery price calculation:');
            let price = 0;
            if ('battery'.startsWith('solar-')) {
                price = battery.price || 0;
            } else {
                price = battery.sellingPrice || battery.mrp || 0;
            }
            console.log('Calculated price:', price);
        }

        console.log('Test completed successfully!');
    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        mongoose.connection.close();
    }
}

testOrderCreation(); 