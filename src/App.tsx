
import './App.css'
import About from './components/About'
import Categories from './components/Categories'
import Contact from './components/Contact'
import Footer from './components/Footer'
import Hero from './components/Hero'
import Navbar from './components/Navbar'
import Policies from './components/Policies'
import TopBar from './components/TopBar'

function App() {
  return (
    <>
      <TopBar />
      <Navbar />
      <Hero />
      <Categories />
      <About />
      <Policies />
      <Contact />
      <Footer />
    </>
  )
}

export default App