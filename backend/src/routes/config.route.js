import express from "express";

const router = express.Router();

router.get("/", (req, res) => {
    res.status(200).json({ storeUrl: process.env.STORE_URL || "" });
});

export default router;
