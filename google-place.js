(function () {
  const config = window.PHONETHIK_GOOGLE_PLACE_CONFIG || {};
  const reviewsRoot = document.getElementById("googleReviews");
  const hoursRoot = document.getElementById("googleHours");
  const photosRoot = document.getElementById("googlePhotos");

  function setText(selector, value) {
    if (value === undefined || value === null || value === "") return;
    document.querySelectorAll(selector).forEach((node) => {
      node.textContent = value;
    });
  }

  function setRating(value) {
    if (!value) return;
    document.querySelectorAll(".google-rating-value").forEach((node) => {
      node.textContent = /\/5/.test(node.textContent) ? `${value}/5` : value;
    });
  }

  function escapeHTML(value) {
    return String(value || "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char]));
  }

  function fallbackReviews(message) {
    if (!reviewsRoot) return;
    if (reviewsRoot.querySelector(".review-card")) return;
    reviewsRoot.innerHTML = `
      <article class="review-card review-card-empty">
        <div class="review-header">
          <div class="review-avatar">G</div>
          <div class="review-meta">
            <div class="review-name">Avis Google</div>
            <div class="review-date">Données réelles uniquement</div>
          </div>
        </div>
        <p class="review-text">${message}</p>
        <a class="review-google-badge" href="${config.reviewsUrl || "https://maps.google.com/?q=Phon%27Ethik+Lyon"}" target="_blank" rel="noopener">Voir les avis sur Google</a>
      </article>`;
  }

  function stars(rating) {
    const rounded = Math.round(Number(rating) || 0);
    return "★★★★★".slice(0, rounded) + "☆☆☆☆☆".slice(0, 5 - rounded);
  }

  function initials(name) {
    return (name || "Avis Google")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "G";
  }

  function renderReviews(place) {
    const rating = typeof place.rating === "number" ? place.rating.toFixed(1).replace(".", ",") : "";
    const count = place.user_ratings_total ? `${place.user_ratings_total} avis Google` : "";
    setRating(rating);
    setText(".google-rating-count", count);

    if (!reviewsRoot) return;
    const reviews = Array.isArray(place.reviews) ? place.reviews.filter((review) => review.text) : [];
    if (!reviews.length) {
      fallbackReviews("La fiche Google a bien été trouvée, mais Google ne renvoie aucun texte d'avis exploitable pour le moment.");
      return;
    }

    reviewsRoot.innerHTML = reviews.map((review) => `
      <article class="review-card" data-tags="google">
        <div class="review-header">
          <div class="review-avatar">${escapeHTML(initials(review.author_name))}</div>
          <div class="review-meta">
            <div class="review-name">${escapeHTML(review.author_name || "Avis Google")}</div>
            <div class="review-date">${escapeHTML(review.relative_time_description || "")}</div>
          </div>
          <div class="review-stars" aria-label="${escapeHTML(review.rating || 5)} étoiles">${stars(review.rating || 5)}</div>
        </div>
        <p class="review-text">"${escapeHTML(review.text)}"</p>
        <a class="review-google-badge" href="${review.author_url || place.url || config.reviewsUrl}" target="_blank" rel="noopener">Avis Google vérifié</a>
      </article>
    `).join("");
  }

  function renderHours(place) {
    if (!hoursRoot || !place.opening_hours || !Array.isArray(place.opening_hours.weekday_text)) return;
    hoursRoot.innerHTML = place.opening_hours.weekday_text.map((line) => {
      const parts = line.split(": ");
      const day = parts.shift();
      const hours = parts.join(": ");
      const closed = /fermé|closed/i.test(hours);
      return `<li><span class="day">${day}</span><span class="hours${closed ? " closed" : ""}">${hours}</span></li>`;
    }).join("");
  }

  function renderPhotos(place) {
    if (!photosRoot || !Array.isArray(place.photos) || !place.photos.length) return;
    photosRoot.innerHTML = place.photos.slice(0, 6).map((photo, index) => `
      <img src="${photo.getUrl({ maxWidth: 900, maxHeight: 700 })}" alt="Photo Google Phon'Ethik ${index + 1}" loading="lazy" style="width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:var(--radius);border:1.5px solid var(--line);">
    `).join("");
  }

  function getDetails(service, placeId) {
    service.getDetails({
      placeId,
      fields: ["name", "url", "rating", "user_ratings_total", "reviews", "opening_hours", "photos"]
    }, (place, status) => {
      if (status !== google.maps.places.PlacesServiceStatus.OK || !place) {
        fallbackReviews("Impossible de charger les avis Google pour le moment. Vérifiez la clé API, la facturation Google Maps Platform et les restrictions de domaine.");
        return;
      }
      renderReviews(place);
      renderHours(place);
      renderPhotos(place);
    });
  }

  function initGooglePlace() {
    if (!config.apiKey) {
      return;
    }

    const host = document.createElement("div");
    const service = new google.maps.places.PlacesService(host);

    if (config.placeId) {
      getDetails(service, config.placeId);
      return;
    }

    service.findPlaceFromQuery({
      query: config.query || "Phon'Ethik Lyon",
      fields: ["place_id"]
    }, (results, status) => {
      if (status !== google.maps.places.PlacesServiceStatus.OK || !results || !results[0]) {
        fallbackReviews("Google n'a pas trouvé automatiquement la fiche. Renseignez le placeId dans google-place-config.js.");
        return;
      }
      getDetails(service, results[0].place_id);
    });
  }

  if (!config.apiKey) {
    return;
  }

  window.__initPhonethikGooglePlace = initGooglePlace;
  const script = document.createElement("script");
  script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(config.apiKey)}&libraries=places&language=${config.language || "fr"}&region=${config.region || "FR"}&callback=__initPhonethikGooglePlace`;
  script.async = true;
  script.defer = true;
  script.onerror = () => fallbackReviews("Le script Google Maps n'a pas pu être chargé. Vérifiez la clé API et les restrictions de domaine.");
  document.head.appendChild(script);
})();
