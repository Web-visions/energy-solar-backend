const Order = require('../models/order.model');
const puppeteer = require('puppeteer');
const Battery = require('../models/battery');
const UPS = require('../models/ups.model');
const Inverter = require('../models/inverter.model.js');
const SolarPV = require('../models/solor-pv.model.js');
const SolarPCU = require('../models/solor-pcu.model.js');
const SolarStreetLight = require('../models/solor-street-light.model.js');

// --- Data Access Helpers ---
const getStatus = (ord) => ord.orderStatus ?? ord.status;
const getTotal = (ord) => ord.totalAmount ?? ord.pricing?.total;
const getDeliveryCharge = (ord) => ord.deliveryCharge ?? ord.pricing?.deliveryCharge ?? 0;
const getTax = (ord) => ord.pricing?.tax ?? 0;
const getShippingInfo = (ord) => ord.shippingInfo ?? ord.shippingDetails;
const getPaymentInfo = (ord) => ord.paymentInfo ?? ord.paymentDetails;
const getItemProduct = (item) => item.product ?? item.productId;
const getItemTotalPrice = (item) => {
    // Battery price logic
    const product = getItemProduct(item);
    if (item.productType === 'battery') {
        const price = item.withOldBattery ? product?.priceWithOldBattery : product?.priceWithoutOldBattery;
        return (price || 0) * (item.quantity ?? 1);
    }
    return (item.price || 0) * (item.quantity ?? 1);
};
const getSubtotal = (ord) => {
    return (ord.items || []).reduce((sum, item) => sum + getItemTotalPrice(item), 0);
};

// Get order by ID with populated product details
const getOrderWithProducts = async (orderId) => {
    let order = null;

    // Check if orderId looks like an ObjectId (24 character hex string)
    const objectIdPattern = /^[0-9a-fA-F]{24}$/;

    if (objectIdPattern.test(orderId)) {
        // It's an ObjectId, try to find by _id
        order = await Order.findById(orderId).populate('user');
    }

    // If not found by ObjectId or orderId is not an ObjectId, try by orderNumber
    if (!order) {
        order = await Order.findOne({ orderNumber: orderId }).populate('user');
    }

    if (!order) {
        return null;
    }

    // Populate product details for each item
    const populatedItems = await Promise.all(
        order.items.map(async (item) => {
            let product;
            // The product ID is in item.product, not item.productId for orders
            const productId = item.product || item.productId;

            switch (item.productType) {
                case 'battery':
                    product = await Battery.findById(productId).populate('brand');
                    break;
                case 'ups':
                    product = await UPS.findById(productId).populate('brand');
                    break;
                case 'inverter':
                    product = await Inverter.findById(productId).populate('brand');
                    break;
                case 'solar-pv':
                    product = await SolarPV.findById(productId).populate('brand');
                    break;
                case 'solar-pcu':
                    product = await SolarPCU.findById(productId).populate('brand');
                    break;
                case 'solar-street-light':
                    product = await SolarStreetLight.findById(productId).populate('brand');
                    break;
                default:
                    product = null;
            }
            return {
                ...item.toObject(),
                product: product
            };
        })
    );

    return {
        ...order.toObject(),
        items: populatedItems
    };
};

// Generate invoice HTML
const generateInvoiceHTML = (order) => {
    const shipping = getShippingInfo(order);
    const payment = getPaymentInfo(order);
    const user = order.user || {};
    const customerName = shipping?.fullName || user.name || user.email || 'N/A';

    const formatDate = (date) => new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice - ${order.orderNumber}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8f9fa;
        }
        
        .invoice-container {
            max-width: 800px;
            margin: 20px auto;
            background: white;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
            border-radius: 8px;
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #008246 0%, #009c55 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .company-logo {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        
        .company-tagline {
            font-size: 14px;
            opacity: 0.9;
        }
        
        .invoice-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding: 30px;
            border-bottom: 2px solid #f0f0f0;
        }
        
        .invoice-info {
            flex: 1;
        }
        
        .invoice-number {
            font-size: 24px;
            font-weight: bold;
            color: #008246;
            margin-bottom: 5px;
        }
        
        .invoice-date {
            color: #666;
            font-size: 14px;
        }
        
        .address-section {
            display: flex;
            justify-content: space-between;
            padding: 30px;
            border-bottom: 2px solid #f0f0f0;
        }
        
        .bill-to, .ship-to {
            flex: 1;
        }
        
        .section-title {
            font-weight: bold;
            color: #008246;
            margin-bottom: 15px;
            font-size: 16px;
        }
        
        .address-details {
            line-height: 1.8;
            color: #555;
        }
        
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 30px 0;
        }
        
        .items-table th {
            background-color: #f8f9fa;
            padding: 15px;
            text-align: left;
            font-weight: bold;
            color: #333;
            border-bottom: 2px solid #e9ecef;
        }
        
        .items-table td {
            padding: 15px;
            border-bottom: 1px solid #e9ecef;
            vertical-align: top;
        }
        
        .product-name {
            font-weight: bold;
            color: #333;
        }
        
        .product-details {
            font-size: 12px;
            color: #666;
            margin-top: 5px;
        }
        
        .quantity {
            text-align: center;
        }
        
        .price {
            text-align: right;
        }
        
        .total-section {
            padding: 30px;
            background-color: #f8f9fa;
        }
        
        .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            font-size: 14px;
        }
        
        .total-row.final {
            font-size: 18px;
            font-weight: bold;
            color: #008246;
            border-top: 2px solid #e9ecef;
            padding-top: 15px;
            margin-top: 15px;
        }
        
        .footer {
            padding: 30px;
            text-align: center;
            background-color: #f8f9fa;
            border-top: 1px solid #e9ecef;
        }
        
        .footer-content {
            color: #666;
            font-size: 12px;
            line-height: 1.6;
        }
        
        .status-badge {
            display: inline-block;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
        }
        
        .status-pending { background-color: #fff3cd; color: #856404; }
        .status-confirmed { background-color: #d1ecf1; color: #0c5460; }
        .status-processing { background-color: #d4edda; color: #155724; }
        .status-shipped { background-color: #cce5ff; color: #004085; }
        .status-delivered { background-color: #d4edda; color: #155724; }
        .status-cancelled { background-color: #f8d7da; color: #721c24; }
        
        @media print {
            body { background-color: white; }
            .invoice-container { box-shadow: none; margin: 0; }
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <!-- Header -->
        <div class="header">
            <div class="company-logo">Solar Energy Store</div>
            <div class="company-tagline">Your Trusted Solar Energy Partner</div>
        </div>
        
        <!-- Invoice Header -->
        <div class="invoice-header">
            <div class="invoice-info">
                <div class="invoice-number">Invoice #${order.orderNumber || 'N/A'}</div>
                <div class="invoice-date">Date: ${order.createdAt ? formatDate(order.createdAt) : 'N/A'}</div>
                <div style="margin-top: 10px;">
                    <span class="status-badge status-${getStatus(order)}">${getStatus(order) || 'N/A'}</span>
                </div>
            </div>
            <div style="text-align: right;">
                <div style="font-weight: bold; margin-bottom: 5px;">Order Details</div>
                <div>Order Date: ${order.createdAt ? formatDate(order.createdAt) : 'N/A'}</div>
                <div>Payment: ${(payment?.method || 'N/A').toUpperCase()}</div>
                ${payment?.transactionId ? `<div>Transaction ID: ${payment.transactionId}</div>` : ''}
            </div>
        </div>
        
        <!-- Address Section -->
        <div class="address-section">
            <div class="bill-to">
                <div class="section-title">Bill To:</div>
                <div class="address-details">
                    <div style="font-weight: bold;">${customerName}</div>
                    <div>${shipping?.address || 'N/A'}</div>
                    <div>${shipping?.city || 'N/A'}, ${shipping?.state || ''}</div>
                    <div>${shipping?.phone || 'N/A'}</div>
                    <div>${shipping?.email || 'N/A'}</div>
                </div>
            </div>
            <div class="ship-to">
                <div class="section-title">Ship To:</div>
                <div class="address-details">
                    <div style="font-weight: bold;">${customerName}</div>
                    <div>${shipping?.address || 'N/A'}</div>
                    <div>${shipping?.city || 'N/A'}, ${shipping?.state || ''}</div>
                    ${shipping?.landmark ? `<div>Landmark: ${shipping.landmark}</div>` : ''}
                </div>
            </div>
        </div>
        
        <!-- Items Table -->
        <div style="padding: 0 30px;">
            <table class="items-table">
                <thead>
                    <tr>
                        <th style="width: 40%;">Product</th>
                        <th style="width: 15%; text-align: center;">Qty</th>
                        <th style="width: 20%; text-align: right;">Unit Price</th>
                        <th style="width: 25%; text-align: right;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${order.items.map(item => {
        console.log(item, "ITEM")
        const product = getItemProduct(item);
        console.log(product, "product")
        let unitPrice = item.price || 0;
        let mrp = product?.mrp;
        if (item.productType === 'battery') {
            unitPrice = item.withOldBattery ? product?.priceWithOldBattery : product?.priceWithoutOldBattery;
        }
        const hasMRP = mrp && mrp > unitPrice;
        const discount = hasMRP ? mrp - unitPrice : 0;
        return `
                        <tr>
                            <td>
                                <div class="product-name">${product?.name || 'N/A'}</div>
                                <div class="product-details">
                                    Brand: ${product?.brand?.name || 'N/A'}
                                    ${product?.modelName ? `<br>Model: ${product.modelName}` : ''}
                                    ${product?.capacity ? `<br>Capacity: ${product.capacity}VA` : ''}
                                    ${product?.AH ? `<br>Capacity: ${product.AH}Ah` : ''}
                                    ${product?.wattage ? `<br>Wattage: ${product.wattage}W` : ''}
                                    ${product?.power ? `<br>Power: ${product.power}W` : ''}
                                    ${product?.batteryType ? `<br>Type: ${product.batteryType}` : ''}
                                    ${product?.warranty ? `<br>Warranty: ${product.warranty}` : ''}
                                    ${hasMRP ? `<br><span style="color: #dc2626; font-weight: bold;">Save ₹${formatCurrency(discount)}</span>` : ''}
                                </div>
                            </td>
                            <td class="quantity">${item.quantity}</td>
                            <td class="price">
                                ${hasMRP ? `<div style="text-decoration: line-through; color: #6b7280; font-size: 12px;">${formatCurrency(mrp)}</div>` : ''}
                                <div>${formatCurrency(unitPrice)}</div>
                            </td>
                            <td class="price">${formatCurrency((unitPrice || 0) * (item.quantity || 1))}</td>
                        </tr>
                        `;
    }).join('')}
                </tbody>
            </table>
        </div>
        
        <!-- Total Section -->
        <div class="total-section">
            <div class="total-row">
                <span>Subtotal:</span>
                <span>${formatCurrency(getSubtotal(order))}</span>
            </div>
            <div class="total-row">
                <span>Delivery Charges:</span>
                <span>${formatCurrency(getDeliveryCharge(order))}</span>
            </div>
           
            <div class="total-row final">
                <span>Total Amount:</span>
                <span>${formatCurrency(getTotal(order))}</span>
            </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <div class="footer-content">
                <div style="font-weight: bold; margin-bottom: 10px;">Thank you for your business!</div>
                <div>Energy storage system </div>
                <div>24/7 Support: +91-8929490346 | Email: connect@energystoragesystem.in</div>
                <div style="margin-top: 15px; font-size: 10px; color: #999;">
                    This is a computer generated invoice. No signature required.
                </div>
            </div>
        </div>
    </div>
</body>
</html>
    `;
};

// Generate invoice for order
exports.generateInvoice = async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await getOrderWithProducts(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        const invoiceHTML = generateInvoiceHTML(order);

        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Content-Disposition', `attachment; filename="invoice-${order.orderNumber}.html"`);
        res.send(invoiceHTML);

    } catch (error) {
        console.error('Error generating invoice:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate invoice'
        });
    }
};

// Get invoice data (for frontend)
exports.getInvoiceData = async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await getOrderWithProducts(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        res.json({
            success: true,
            data: order
        });

    } catch (error) {
        console.error('Error fetching invoice data:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch invoice data'
        });
    }
}; 