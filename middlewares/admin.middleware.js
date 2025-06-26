const isAdmin = async (req, res, next) => {
    try {
        const { role } = req.user;
        if (role === "admin") {
            return next();
        } else {
            return res.status(403).json({
                success: false,
                message: "Forbidden: Admins only",
            });
        }
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

const isStaffOrAdmin = async (req, res, next) => {
    try {
        const { role } = req.user;
        if (role === "admin" || role === "staff") {
            return next();
        } else {
            return res.status(403).json({
                success: false,
                message: "Forbidden: Only staff or admin can access this resource",
            });
        }
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

module.exports = { isAdmin, isStaffOrAdmin }
