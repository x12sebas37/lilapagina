require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Configurar Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configurar `multer` para subir a Cloudinary
const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: "productos",
        format: async (req, file) => "png",
        public_id: (req, file) => file.originalname.split(".")[0]
    }
});
const upload = multer({ storage });

// Conectar a MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("Conectado a MongoDB"))
    .catch(error => console.error("Error al conectar MongoDB:", error));

const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true },
    price: { type: Number, required: true },
    description: { type: String, required: true },
    imageUrl: { type: String, required: true }
});

const Product = mongoose.model("Product", ProductSchema);

// Ruta para agregar productos
app.post("/api/products", upload.single("image"), async (req, res) => {
    try {
        const { name, phone, price, description } = req.body;
        if (!req.file || !name || !phone || !price || !description) {
            return res.status(400).json({ error: "Todos los campos son obligatorios" });
        }

        const imageUrl = req.file.path;
        const product = new Product({ name, phone, price, description, imageUrl });
        await product.save();
        res.status(201).json(product);
    } catch (error) {
        res.status(500).json({ error: "Error al guardar el producto", details: error.message });
    }
});

// Ruta para obtener productos
app.get("/api/products", async (_, res) => res.json(await Product.find()));

// Ruta para eliminar productos
app.delete("/api/products/:id", async (req, res) => {
    try {
        const productId = req.params.id;
        console.log("Intentando eliminar producto con ID:", productId);

        const deletedProduct = await Product.findByIdAndDelete(productId);
        if (!deletedProduct) {
            return res.status(404).json({ error: "Producto no encontrado" });
        }

        res.json({ message: "Producto eliminado correctamente" });
    } catch (error) {
        res.status(500).json({ error: "Error al eliminar el producto", details: error.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
