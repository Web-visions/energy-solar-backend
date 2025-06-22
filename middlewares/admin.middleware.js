module.exports = function isAdmin(req, res, next) {

    try {
        const { role } = req.user;

        if (role === "admin") {
            next()
        } else {
            return
        }
    } catch (error) {
        console.log(error)
    }
}