export default function Contact() {
  return (
    <section id="contact" className="contact">
      <div className="container">
        <h2 className="section-title">Contact Us</h2>

        <form className="contact-form">
          <input placeholder="Name" required />
          <input placeholder="Email" required />
          <textarea placeholder="Message" required />
          <button type="submit">Send Message</button>
        </form>
      </div>
    </section>
  )
}