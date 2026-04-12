import { initLayout } from '../layout.js'
import { init } from '../modules/categories.js'

document.addEventListener('DOMContentLoaded', () => {
  const session = initLayout('categories')
  if (session) {
    init(document.getElementById('page-content'))
  }
})
