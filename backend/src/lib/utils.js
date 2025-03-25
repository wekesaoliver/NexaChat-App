import jwt from "jsonwebtoken";
export const generateToken = (userId, res) => {
    const token = jwt.sign({userId}, process.env.JWT_SECRET, {
        expiresIn: "7d",
    })
    res.cookie("jwt", token, {
        maxAge: 7 * 24 * 60 * 60 * 1000, //Microseconds
        httpOnly: true, // prevent XSS attacks cross-site scripting attacks
        sameSite: "strict", // prevent CRSF attacks cross-site forgery attacks
        secure: process.env.Node_ENV !== "development",
    });
    return token;
}
