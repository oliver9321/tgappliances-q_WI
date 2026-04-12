import { Router } from 'express'
import authMiddleware from '../middleware/auth.middleware.js'
import { getProducts, getPublicProducts, getProductsByCategory, createProduct, updateProduct, getProductById } from '../controllers/products.controller.js'

const router = Router()

// Public — catalog for the website
router.get('/public', getPublicProducts)
router.get('/by-category/:category', getProductsByCategory)
router.get('/:id', getProductById)

// Admin — protected
router.get('/', authMiddleware, getProducts)
router.post('/', authMiddleware, createProduct)
router.put('/:id', authMiddleware, updateProduct)

export default router
