import { Router } from 'express'
import authMiddleware from '../middleware/auth.middleware.js'
import { getProducts, getProductsByCategory, createProduct, updateProduct } from '../controllers/products.controller.js'

const router = Router()

// Public — catalog for the website
router.get('/by-category/:category', getProductsByCategory)

// Admin — protected
router.get('/', authMiddleware, getProducts)
router.post('/', authMiddleware, createProduct)
router.put('/:id', authMiddleware, updateProduct)

export default router
