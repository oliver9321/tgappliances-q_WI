import Product from '../models/Product.js'

export async function getProducts(req, res) {
  try {
    const products = await Product.find()
    res.json(products)
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener productos', error: err.message })
  }
}

export async function getProductsByCategory(req, res) {
  try {
    const { category } = req.params

    const query = { active: true }
    if (category !== 'all') {
      query.category = category
    }

    const products = await Product.find(query).sort({ category: 1, priority: -1 })
    res.json(products)
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener productos', error: err.message })
  }
}

export async function createProduct(req, res) {
  try {
    const { title, category } = req.body

    if (!title || !category) {
      return res.status(400).json({ message: 'Los campos title y category son obligatorios' })
    }

    const { dateCreation: _dc, createdBy: _cb, ...rest } = req.body

    const product = new Product({
      ...rest,
      dateCreation: new Date().toISOString(),
      createdBy: req.user.username,
    })

    const saved = await product.save()
    res.status(201).json(saved)
  } catch (err) {
    res.status(500).json({ message: 'Error al crear producto', error: err.message })
  }
}

export async function updateProduct(req, res) {
  try {
    const { dateCreation: _dc, createdBy: _cb, ...allowedFields } = req.body

    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      allowedFields,
      { new: true, runValidators: true }
    )

    if (!updated) {
      return res.status(404).json({ message: 'Producto no encontrado' })
    }

    res.json(updated)
  } catch (err) {
    res.status(500).json({ message: 'Error al actualizar producto', error: err.message })
  }
}
