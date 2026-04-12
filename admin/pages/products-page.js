import { initLayout } from '../layout.js'
import { init } from '../modules/products.js'

document.addEventListener('DOMContentLoaded', () => {
  const session = initLayout('products')
  if (session) {
    init(document.getElementById('page-content'))
  }
})
