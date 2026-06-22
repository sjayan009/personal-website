(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  var toggle = document.getElementById("menu-toggle");
  var menu = document.getElementById("mobile-menu");

  function setMenu(open) {
    if (!toggle || !menu) return;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    menu.classList.toggle("is-open", open);
    document.body.classList.toggle("nav-open", open);
  }

  if (toggle && menu) {
    toggle.addEventListener("click", function () {
      setMenu(toggle.getAttribute("aria-expanded") !== "true");
    });

    menu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        setMenu(false);
      });
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") setMenu(false);
    });
  }

  var reveals = document.querySelectorAll(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    reveals.forEach(function (el) {
      el.classList.add("in");
    });
  } else {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );

    reveals.forEach(function (el) {
      observer.observe(el);
    });
  }

  var search = document.getElementById("project-search");
  var filters = document.querySelectorAll(".filter");
  var cards = document.querySelectorAll(".project-card");
  var activeFilter = "all";

  function applyProjectFilters() {
    var term = search ? search.value.trim().toLowerCase() : "";

    cards.forEach(function (card) {
      var title = (card.dataset.title || card.textContent || "").toLowerCase();
      var category = card.dataset.category || "";
      var matchesText = !term || title.indexOf(term) !== -1;
      var matchesFilter = activeFilter === "all" || category.indexOf(activeFilter) !== -1;
      card.classList.toggle("is-hidden", !(matchesText && matchesFilter));
    });
  }

  if (search) {
    search.addEventListener("input", applyProjectFilters);
  }

  filters.forEach(function (button) {
    button.addEventListener("click", function () {
      activeFilter = button.dataset.filter || "all";
      filters.forEach(function (b) {
        b.classList.toggle("is-active", b === button);
      });
      applyProjectFilters();
    });
  });

  var contactForm = document.getElementById("contact-form");
  var contactStatus = document.getElementById("contact-status");

  function setContactStatus(message, type) {
    if (!contactStatus) return;
    contactStatus.textContent = message;
    contactStatus.classList.toggle("is-success", type === "success");
    contactStatus.classList.toggle("is-error", type === "error");
  }

  if (contactForm) {
    contactForm.addEventListener("submit", function (event) {
      event.preventDefault();

      var submit = contactForm.querySelector('button[type="submit"]');
      var formData = new FormData(contactForm);
      var payload = {
        name: String(formData.get("name") || "").trim(),
        email: String(formData.get("email") || "").trim(),
        message: String(formData.get("message") || "").trim(),
        website: String(formData.get("website") || "").trim()
      };

      if (submit) {
        submit.disabled = true;
        submit.textContent = "Sending...";
      }
      setContactStatus("", "");

      fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      })
        .then(function (response) {
          if (!response.ok) throw new Error("Contact request failed");
          return response.json();
        })
        .then(function () {
          contactForm.reset();
          setContactStatus("Thanks - your message was sent.", "success");
        })
        .catch(function () {
          setContactStatus("Something went wrong. Please try again in a moment.", "error");
        })
        .finally(function () {
          if (submit) {
            submit.disabled = false;
            submit.textContent = "Send Message";
          }
        });
    });
  }

  var canvas = document.getElementById("lightfield");
  if (canvas && canvas.getContext) {
    var ctx = canvas.getContext("2d");
    var width = 0;
    var height = 0;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var particles = [];
    var raf = null;

    function resize() {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      if (!width || !height) return;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      var count = Math.min(120, Math.max(48, Math.round((width * height) / 13000)));
      particles = [];
      for (var i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          r: Math.random() * 1.6 + 0.4,
          v: Math.random() * 0.24 + 0.08,
          alpha: Math.random() * 0.55 + 0.18
        });
      }
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "rgba(8, 152, 183, 0.28)";

      particles.forEach(function (p) {
        p.y += p.v;
        if (p.y > height + 6) {
          p.y = -6;
          p.x = Math.random() * width;
        }

        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener("resize", function () {
      window.clearTimeout(canvas._resizeTimer);
      canvas._resizeTimer = window.setTimeout(resize, 150);
    });

    if (!reduceMotion) {
      raf = requestAnimationFrame(draw);
      document.addEventListener("visibilitychange", function () {
        if (document.hidden && raf) {
          cancelAnimationFrame(raf);
          raf = null;
        } else if (!document.hidden && !raf) {
          raf = requestAnimationFrame(draw);
        }
      });
    } else {
      draw();
      if (raf) cancelAnimationFrame(raf);
    }
  }
})();
