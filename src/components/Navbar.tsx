import { useState } from 'react'

export default function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <nav className="navbar">
      <div className="container nav-container">
        <div className="logo">
          <img src="/logo2.png" alt="TG Appliances" />
        </div>

        <button
          className="mobile-menu-toggle"
          onClick={() => setOpen(!open)}
        >
          ☰
        </button>

        <ul className={`nav-menu ${open ? 'active' : ''}`}>
          <li><a href="#home">Home</a></li>
          <li><a href="#shop">Shop</a></li>
          <li><a href="#about">About</a></li>
          <li><a href="#policies">Policies</a></li>
          <li><a href="#contact">Contact</a></li>
          <li>
            <a href="tel:+18602617084" className="book-now-btn">
              Call Now
            </a>
          </li>
        </ul>
      </div>
    </nav>
  )
}