const Review = require('../models/Review');
const { saveFile, deleteFile } = require('../utils/fileUpload');

// Create a new review
exports.createReview = async (req, res) => {
    try {
        const { product, productType, rating, comment } = req.body;
        const userId = req.user._id;

        // Check if user has already reviewed this product
        const existingReview = await Review.findOne({ user: userId, product: product });
        if (existingReview) {
            return res.status(400).json({ message: 'You have already reviewed this product' });
        }

        // Handle image uploads if any
        let images = [];
        if (req.files && req.files.length > 0) {
            if (req.files.length > 4) {
                return res.status(400).json({ message: 'You can upload a maximum of 4 images.' });
            }
            images = await Promise.all(
                req.files.map(file => saveFile(file))
            );
        }

        const review = new Review({
            user: userId,
            product: product,
            productType,
            rating,
            comment,
            images
        });

        await review.save();

        res.status(201).json({
            success: true,
            data: review,
            message: 'Review submitted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get reviews for a product
exports.getProductReviews = async (req, res) => {
    try {
        const { productId } = req.params;
        const { page = 1, limit = 10 } = req.query;

        const options = {
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
            populate: {
                path: 'user',
                select: 'name email'
            },
            sort: { createdAt: -1 }
        };

        const reviews = await Review.paginate({ product: productId }, options);

        res.status(200).json({
            success: true,
            data: reviews.docs,
            pagination: {
                total: reviews.totalDocs,
                limit: reviews.limit,
                page: reviews.page,
                totalPages: reviews.totalPages,
                hasNextPage: reviews.hasNextPage,
                nextPage: reviews.nextPage,
                hasPrevPage: reviews.hasPrevPage,
                prevPage: reviews.prevPage
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Update a review
exports.updateReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const { rating, comment } = req.body;
        const userId = req.user._id;

        const review = await Review.findOne({ _id: reviewId, user: userId });
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        // Handle new image uploads if any
        if (req.files && req.files.length > 0) {
            if ((review.images.length + req.files.length) > 4) {
                return res.status(400).json({ message: 'You can upload a maximum of 4 images in total.' });
            }
            const newImages = await Promise.all(
                req.files.map(file => saveFile(file))
            );
            review.images = [...review.images, ...newImages];
        }

        review.rating = rating || review.rating;
        review.comment = comment || review.comment;

        await review.save();

        res.status(200).json({
            success: true,
            data: review,
            message: 'Review updated successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Delete a review
exports.deleteReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const userId = req.user._id;

        const review = await Review.findOne({ _id: reviewId, user: userId });
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        // Delete associated images
        if (review.images && review.images.length > 0) {
            await Promise.all(review.images.map(imagePath => deleteFile(imagePath)));
        }

        await review.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Review deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get user's reviews
exports.getUserReviews = async (req, res) => {
    try {
        const userId = req.user._id;
        const reviews = await Review.find({ user: userId })
            .populate('product', 'name image')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: reviews
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}; 