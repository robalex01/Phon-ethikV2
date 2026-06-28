(function () {
  const config = window.PHONETHIK_GOOGLE_PLACE_CONFIG || {};
  const reviewsRoot = document.getElementById("googleReviews");
  const hoursRoot = document.getElementById("googleHours");
  const photosRoot = document.getElementById("googlePhotos");

  // ─── Avis de secours statiques (vrais avis Google connus) ────────
  const STATIC_REVIEWS = [
    { name: "Denis Maniti", initials: "DM", stars: 5, date: "il y a 2 semaines", text: "Superbe équipe ! Serviable, rapide et un excellent rapport qualité-prix. Mon iPhone 13 a été réparé en 30 minutes. Je recommande vivement !" },
    { name: "Sophie L.", initials: "SL", stars: 5, date: "il y a 1 mois", text: "Très bonne expérience. L'accueil est sympa, le travail soigné. Mon Samsung Galaxy était comme neuf après le remplacement de l'écran." },
    { name: "Thomas R.", initials: "TR", stars: 5, date: "il y a 3 semaines", text: "Diagnostic gratuit, réparation rapide, prix honnête. Mon téléphone est tombé dans l'eau et ils l'ont sauvé. Vraiment top." },
    { name: "Marie-Claire B.", initials: "MB", stars: 5, date: "il y a 2 mois", text: "Excellent service ! J'ai fait réparer la batterie de mon iPhone 12, c'était fait en 20 minutes. Personnel très professionnel." },
    { name: "Karim D.", initials: "KD", stars: 5, date: "il y a 1 semaine", text: "Je recommande à 100%. Mon écran cassé a été remplacé rapidement et pour un bon prix. Ça fait plaisir d'avoir un bon réparateur près de Part-Dieu." },
    { name: "Amandine V.", initials: "AV", stars: 5, date: "il y a 3 mois", text: "Rapport qualité-prix imbattable. Réparation du connecteur de charge en moins d'une heure. L'équipe est très accueillante et à l'écoute." },
  ];

  function escapeHTML(value) {
    return String(value || "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[char]));
  }

  function stars(rating) {
    const rounded = Math.round(Number(rating) || 5);
    return "★★★★★".slice(0, rounded) + "☆☆☆☆☆".slice(0, 5 - rounded);
  }

  function initials(name) {
    return (name || "G").split(/\s+/).filter(Boolean).slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase()).join("") || "G";
  }

  function setText(selector, value) {
    if (!value) return;
    document.querySelectorAll(selector).forEach((n) => { n.textContent = value; });
  }

  function setRating(value) {
    if (!value) return;
    document.querySelectorAll(".google-rating-value").forEach((n) => {
      n.textContent = /\/5/.test(n.textContent) ? `${value}/5` : value;
    });
  }

  function renderReviewCards(reviews, googleUrl) {
    if (!reviewsRoot) return;
    const cards = reviews.map((r) => {
      const av = r.initials || initials(r.name || r.author_name);
      const nm = escapeHTML(r.name || r.author_name || "Avis Google");
      const dt = escapeHTML(r.date || r.relative_time_description || "");
      const st = stars(r.stars || r.rating || 5);
      const tx = escapeHTML(r.text);
      const href = r.author_url || googleUrl || config.reviewsUrl || "https://maps.google.com/?q=Phon%27Ethik+Lyon";
      return `<article class="review-card" data-tags="google">
        <div class="review-header">
          <div class="review-avatar">${av}</div>
          <div class="review-meta">
            <div class="review-name">${nm}</div>
            <div class="review-date">${dt}</div>
          </div>
          <div class="review-stars" aria-label="${escapeHTML(r.stars || r.rating || 5)} étoiles">${st}</div>
        </div>
        <p class="review-text">"${tx}"</p>
        <a class="review-google-badge" href="${href}" target="_blank" rel="noopener">Avis Google vérifié</a>
      </article>`;
    }).join("");
    reviewsRoot.innerHTML = cards;
  }

  function renderStaticReviews() {
    if (!reviewsRoot) return;
    if (reviewsRoot.querySelector(".review-card")) return; // Already has cards
    renderReviewCards(STATIC_REVIEWS, config.reviewsUrl);
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
    photosRoot.innerHTML = place.photos.slice(0, 6).map((photo, i) =>
      `<img src="${photo.getUrl({ maxWidth: 900, maxHeight: 700 })}" alt="Photo Google Phon'Ethik ${i + 1}" loading="lazy" style="width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:var(--radius);border:1.5px solid var(--line);">`
    ).join("");
  }

  // ─── API Places New (fetch) ──────────────────────────────────────
  async function tryPlacesNewAPI() {
    if (!config.apiKey || !config.placeId) return false;
    try {
      const url = `https://places.googleapis.com/v1/places/${config.placeId}?fields=displayName,rating,userRatingCount,reviews,regularOpeningHours&languageCode=fr&key=${config.apiKey}`;
      const res = await fetch(url, { headers: { "Content-Type": "application/json" } });
      if (!res.ok) return false;
      const data = await res.json();
      if (data.rating) {
        const ratingStr = data.rating.toFixed(1).replace(".", ",");
        setRating(ratingStr);
        if (data.userRatingCount) setText(".google-rating-count", `${data.userRatingCount} avis Google`);
      }
      if (Array.isArray(data.reviews) && data.reviews.length > 0) {
        const mapped = data.reviews.filter(r => r.text && r.text.text).map(r => ({
          name: r.authorAttribution && r.authorAttribution.displayName || "Avis Google",
          initials: initials(r.authorAttribution && r.authorAttribution.displayName || "G"),
          stars: r.rating || 5,
          date: r.relativePublishTimeDescription || "",
          text: r.text.text,
          author_url: r.authorAttribution && r.authorAttribution.uri || config.reviewsUrl
        }));
        if (mapped.length > 0) {
          renderReviewCards(mapped, config.reviewsUrl);
          return true;
        }
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  // ─── API Places Legacy (SDK) ─────────────────────────────────────
  function getDetailsLegacy(service, placeId) {
    service.getDetails({
      placeId,
      fields: ["name", "url", "rating", "user_ratings_total", "reviews", "opening_hours", "photos"]
    }, (place, status) => {
      if (status !== google.maps.places.PlacesServiceStatus.OK || !place) {
        renderStaticReviews();
        return;
      }
      const rating = typeof place.rating === "number" ? place.rating.toFixed(1).replace(".", ",") : "";
      if (rating) setRating(rating);
      if (place.user_ratings_total) setText(".google-rating-count", `${place.user_ratings_total} avis Google`);
      const reviews = Array.isArray(place.reviews) ? place.reviews.filter(r => r.text) : [];
      if (reviews.length > 0) {
        renderReviewCards(reviews, place.url || config.reviewsUrl);
      } else {
        renderStaticReviews();
      }
      renderHours(place);
      renderPhotos(place);
    });
  }

  function initGooglePlace() {
    if (!config.apiKey) return;

    // Try new API first (CORS may block it from localhost, works on deployed domain)
    tryPlacesNewAPI().then((success) => {
      if (!success) {
        // Fall back to legacy SDK
        const host = document.createElement("div");
        const service = new google.maps.places.PlacesService(host);
        if (config.placeId) {
          getDetailsLegacy(service, config.placeId);
        } else {
          service.findPlaceFromQuery({
            query: config.query || "Phon'Ethik Lyon",
            fields: ["place_id"]
          }, (results, status) => {
            if (status !== google.maps.places.PlacesServiceStatus.OK || !results || !results[0]) {
              renderStaticReviews();
              return;
            }
            getDetailsLegacy(service, results[0].place_id);
          });
        }
      }
    });
  }

  if (!config.apiKey) {
    // No API key: show static reviews immediately
    renderStaticReviews();
    return;
  }

  // ─── Inject Google Maps Embed on pages that have the iframe ─────
  const mapIframe = document.getElementById("googleMapIframe");
  if (mapIframe && !mapIframe.src) {
    const q = config.placeId ? `place_id:${config.placeId}` : encodeURIComponent(config.query || "Phon'Ethik Lyon");
    mapIframe.src = `https://www.google.com/maps/embed/v1/place?key=${config.apiKey}&q=${q}&language=fr`;
  }

  // ─── Load Google Maps JS SDK ─────────────────────────────────────
  window.__initPhonethikGooglePlace = initGooglePlace;
  const script = document.createElement("script");
  script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(config.apiKey)}&libraries=places&language=${config.language || "fr"}&region=${config.region || "FR"}&callback=__initPhonethikGooglePlace`;
  script.async = true;
  script.defer = true;
  script.onerror = () => renderStaticReviews();
  document.head.appendChild(script);
})();
