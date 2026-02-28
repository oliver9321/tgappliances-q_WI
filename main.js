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

// Menú móvil unificado (reemplaza la función initMobileMenu anterior)
// Menú móvil
function initMobileMenu() {
  const mobileMenuToggle = document.getElementById("mobileMenuToggle");
  const navMenu = document.getElementById("navMenu");
  const body = document.body;
  
  // Verificar si ya existe un overlay, si no, crearlo
  let overlay = document.querySelector('.menu-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'menu-overlay';
    body.appendChild(overlay);
  }
  
  // Función para abrir/cerrar menú
  function toggleMenu() {
    mobileMenuToggle.classList.toggle('active');
    navMenu.classList.toggle('active');
    overlay.classList.toggle('active');
    body.classList.toggle('menu-open');
    
    // Cambiar el atributo aria-expanded para accesibilidad
    const isExpanded = navMenu.classList.contains('active');
    mobileMenuToggle.setAttribute('aria-expanded', isExpanded);
  }
  
  // Abrir/cerrar al hacer click en el botón
  mobileMenuToggle.addEventListener('click', toggleMenu);
  
  // Cerrar al hacer click en overlay
  overlay.addEventListener('click', toggleMenu);
  
  // Cerrar al hacer click en cualquier enlace
  const navLinks = document.querySelectorAll('.nav-link, .book-now-btn');
  navLinks.forEach(link => {
    link.addEventListener('click', function() {
      if (navMenu.classList.contains('active')) {
        toggleMenu();
      }
    });
  });
  
  // Cerrar al redimensionar a pantalla grande
  window.addEventListener('resize', function() {
    if (window.innerWidth > 768 && navMenu.classList.contains('active')) {
      toggleMenu();
    }
  });
  
  // Prevenir que el click dentro del menú cierre el menú
  navMenu.addEventListener('click', function(e) {
    e.stopPropagation();
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

  // Bloquear caracteres inválidos en teléfono
  if (phoneInput) {
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
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const rawPhone = document.getElementById("phone")?.value.replace(/\D/g, "") || "";

    const formDataObj = {
      name: document.getElementById("name").value.trim(),
      email: document.getElementById("email").value.trim(),
      phone: rawPhone,
      message: document.getElementById("message").value.trim(),
    };

    // required fields
    if (!formDataObj.name || !formDataObj.email || !formDataObj.message) {
      showMessage("Please fill in all required fields.", "error");
      return;
    }

    // email validation (más estricta)
    if (!isValidEmail(formDataObj.email)) {
      showMessage("Please enter a valid email address.", "error");
      return;
    }

    // phone validation (solo si escribieron algo)
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
  });

  function formatUSPhone(value) {
    if (value.length === 0) return value;
    if (value.length < 4) return `(${value}`;
    if (value.length < 7) return `(${value.slice(0, 3)}) ${value.slice(3)}`;
    return `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6)}`;
  }

  function showMessage(message, type) {
    if (!formMessage) return;
    
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
  const yearElement = document.getElementById("currentYear");
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }
}

// Inicialización única
document.addEventListener("DOMContentLoaded", () => {
  initSlideshow();
  initMobileMenu(); // Esta es la función unificada que reemplaza la anterior
  initSmoothScroll();
  initNavbarScroll();
  initActiveNavLink();
  initContactForm();
  initFooterYear();
});