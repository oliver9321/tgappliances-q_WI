import { initLayout } from '../layout.js'
import { init } from '../modules/users.js'

document.addEventListener('DOMContentLoaded', () => {
  const session = initLayout('users')
  if (session) {
    init(document.getElementById('page-content'))
  }
})
