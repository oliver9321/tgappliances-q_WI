import { Router } from 'express'
import authMiddleware from '../middleware/auth.middleware.js'
import { getCategories, createCategory, updateCategory } from '../controllers/categories.controller.js'

const router = Router()

router.get('/', authMiddleware, getCategories)
router.post('/', authMiddleware, createCategory)
router.put('/:id', authMiddleware, updateCategory)

export default router
