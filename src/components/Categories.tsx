export default function Categories() {
  return (
    <section id="shop" className="categories">
      <div className="container">
        <h2 className="section-title">
          Categories
        </h2>

        <div className="category-grid">
          <div className="category-card">
            <img src="/refri.jpeg" alt="Refrigerators" />
            <h3>Refrigerators</h3>
          </div>

          <div className="category-card">
            <img src="/wash.jpeg" alt="Washers" />
            <h3>Washers & Dryers</h3>
          </div>

          <div className="category-card">
            <img src="/estufa.jpeg" alt="Stoves" />
            <h3>Stoves & Ovens</h3>
          </div>
        </div>
      </div>
    </section>
  )
}