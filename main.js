import "./style.css";

let currentSlide = 0;
let slideInterval;

function initSlideshow() {
  const slides = document.querySelectorAll(".slide");
  const indicatorsContainer = document.getElementById("slideIndicators");

  slides.forEach((_, index) => {
    const indicator = document.createElement("div");
    indicator.classList.add("indicator");
    if (index === 0) indicator.classList.add("active");
    indicator.addEventListener("click", () => goToSlide(index));
    indicatorsContainer.appendChild(indicator);
  });

  document.getElementById("prevSlide").addEventListener("click", () => {
    goToSlide(currentSlide - 1);
  });

  document.getElementById("nextSlide").addEventListener("click", () => {
    goToSlide(currentSlide + 1);
  });

  startAutoPlay();
}

function goToSlide(n) {
  const slides = document.querySelectorAll(".slide");
  const indicators = document.querySelectorAll(".indicator");

  slides[currentSlide].classList.remove("active");
  indicators[currentSlide].classList.remove("active");

  currentSlide = (n + slides.length) % slides.length;

  slides[currentSlide].classList.add("active");
  indicators[currentSlide].classList.add("active");

  resetAutoPlay();
}

function startAutoPlay() {
  slideInterval = setInterval(() => {
    goToSlide(currentSlide + 1);
  }, 5000);
}

function resetAutoPlay() {
  clearInterval(slideInterval);
  startAutoPlay();
}

function initMobileMenu() {
  const mobileMenuToggle = document.getElementById("mobileMenuToggle");
  const navMenu = document.getElementById("navMenu");

  mobileMenuToggle.addEventListener("click", () => {
    navMenu.classList.toggle("active");
  });

  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", () => {
      navMenu.classList.remove("active");
    });
  });
}

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();
      const targetId = this.getAttribute("href");
      if (targetId === "#") return;

      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        const navbarHeight = document.querySelector(".navbar").offsetHeight;
        const targetPosition = targetElement.offsetTop - navbarHeight;

        window.scrollTo({
          top: targetPosition,
          behavior: "smooth",
        });
      }
    });
  });
}

function initNavbarScroll() {
  const navbar = document.getElementById("navbar");
  let lastScroll = 0;

  window.addEventListener("scroll", () => {
    const currentScroll = window.pageYOffset;

    if (currentScroll > 100) {
      navbar.style.boxShadow = "0 4px 20px rgba(0,0,0,0.15)";
    } else {
      navbar.style.boxShadow = "0 2px 10px rgba(0,0,0,0.1)";
    }

    lastScroll = currentScroll;
  });
}

function initActiveNavLink() {
  const sections = document.querySelectorAll("section[id]");
  const navLinks = document.querySelectorAll(".nav-link");

  window.addEventListener("scroll", () => {
    let current = "";
    const navbarHeight = document.querySelector(".navbar").offsetHeight;

    sections.forEach((section) => {
      const sectionTop = section.offsetTop - navbarHeight - 100;
      const sectionHeight = section.clientHeight;

      if (
        window.pageYOffset >= sectionTop &&
        window.pageYOffset < sectionTop + sectionHeight
      ) {
        current = section.getAttribute("id");
      }
    });

    navLinks.forEach((link) => {
      link.classList.remove("active");
      if (link.getAttribute("href") === `#${current}`) {
        link.classList.add("active");
      }
    });
  });
}

function initContactForm() {
  const form = document.getElementById("contactForm");
  const formMessage = document.getElementById("formMessage");
  const phoneInput = document.getElementById("phone");

  if (!form) return;

  // ✅ Bloquear caracteres inválidos en teléfono
  phoneInput.addEventListener("input", (e) => {
    let value = e.target.value;

    // quitar todo lo que no sea número
    value = value.replace(/\D/g, "");

    // limitar a 10 dígitos US
    value = value.substring(0, 10);

    // formatear estilo US (860) 123-4567
    const formatted = formatUSPhone(value);
    e.target.value = formatted;
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const rawPhone = document.getElementById("phone").value.replace(/\D/g, "");

    const formDataObj = {
      name: document.getElementById("name").value.trim(),
      email: document.getElementById("email").value.trim(),
      phone: rawPhone,
      message: document.getElementById("message").value.trim(),
    };

    // ✅ required fields
    if (!formDataObj.name || !formDataObj.email || !formDataObj.message) {
      showMessage("Please fill in all required fields.", "error");
      return;
    }

    // ✅ email validation (más estricta)
    if (!isValidEmail(formDataObj.email)) {
      showMessage("Please enter a valid email address.", "error");
      return;
    }

    // ✅ phone validation (solo si escribieron algo)
    if (formDataObj.phone && formDataObj.phone.length !== 10) {
      showMessage("Please enter a valid 10-digit phone number.", "error");
      return;
    }

    try {
      showMessage("Sending message...", "info");

      const formData = new FormData();
      formData.append("name", formDataObj.name);
      formData.append("email", formDataObj.email);
      formData.append("phone", formDataObj.phone);
      formData.append("message", formDataObj.message);
      formData.append(
        "_subject",
        "New Website Inquiry - TG Pre-Owned Appliances",
      );

      const response = await fetch("https://formspree.io/f/xkoveqyo", {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" },
      });

      if (response.ok) {
        showMessage(
          "✅ Thank you! Your message has been sent successfully.",
          "success",
        );
        form.reset();
      } else {
        showMessage(
          "❌ Oops! Something went wrong. Please try again.",
          "error",
        );
      }
    } catch (error) {
      console.error("Form error:", error);
      showMessage("❌ Network error. Please try again later.", "error");
    }

    console.log("Form submitted:", formDataObj);
  });

  function formatUSPhone(value) {
    if (value.length === 0) return value;
    if (value.length < 4) return `(${value}`;
    if (value.length < 7) return `(${value.slice(0, 3)}) ${value.slice(3)}`;
    return `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6)}`;
  }

  function showMessage(message, type) {
    formMessage.style.display = "block";
    formMessage.textContent = message;
    formMessage.className = `form-message ${type}`;

    setTimeout(() => {
      formMessage.style.display = "none";
      formMessage.className = "form-message";
    }, 5000);
  }

  function isValidEmail(email) {
    // regex más estricta estilo producción
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}$/;
    return emailRegex.test(email);
  }
}

function initFooterYear() {
  document.getElementById("currentYear").textContent = new Date().getFullYear();
}

document.addEventListener("DOMContentLoaded", () => {
  initSlideshow();
  initMobileMenu();
  initSmoothScroll();
  initNavbarScroll();
  initActiveNavLink();
  initContactForm();
  initFooterYear();
});
