import { useState, useEffect } from 'react'

const slides = [
  {
    img: '/banner2.jpeg',
    title: 'Quality Pre-Owned Appliances',
    text: 'Save money without sacrificing performance',
  },
  {
    img: 'https://images.pexels.com/photos/4686822/pexels-photo-4686822.jpeg',
    title: 'Tested & Guaranteed Appliances',
    text: 'Every item inspected for quality and reliability',
  },
  {
    img: 'https://images.pexels.com/photos/4686830/pexels-photo-4686830.jpeg',
    title: 'Affordable Prices, Excellent Service',
    text: 'Fast delivery and personalized attention',
  },
]

export default function Hero() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  return (
    <section id="home" className="hero">
      <div className="slideshow">
        {slides.map((slide, i) => (
          <div
            key={i}
            className={`slide ${i === index ? 'active' : ''}`}
          >
            <img src={slide.img} alt={slide.title} />
            <div className="slide-content">
              <h1>{slide.title}</h1>
              <p>{slide.text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}