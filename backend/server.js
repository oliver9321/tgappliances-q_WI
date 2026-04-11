import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import swaggerUi from 'swagger-ui-express'
import { swaggerSpec } from './swagger.js'

import authRoutes from './routes/auth.routes.js'
import categoriesRoutes from './routes/categories.routes.js'
import productsRoutes from './routes/products.routes.js'
import usersRoutes from './routes/users.routes.js'
import uploadRoutes from './routes/upload.routes.js'

const app = express()

// Middleware
app.use(cors())
app.use(express.json())

// Swagger UI — available at /api-docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

// Routes
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/categories', categoriesRoutes)
app.use('/api/v1/products', productsRoutes)
app.use('/api/v1/users', usersRoutes)
app.use('/api/v1/upload', uploadRoutes)

// MongoDB connection, check if ENVIROMENT is dev or prod
const uri = process.env.ENVIROMENT == "dev"
    ? process.env.MONGO_PUBLIC_URL
    : process.env.MONGO_URL;

mongoose
  .connect(uri, { dbName: process.env.ENVIROMENT == "dev" ? 'tgappliances-dev' : "tgappliances-production" })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err))

// Start server
const PORT = process.env.PORT || 3000
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`)
  console.log(`Swagger docs: http://localhost:${PORT}/api-docs`)
})

export { app }
