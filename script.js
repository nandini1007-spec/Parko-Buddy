/**
 * PARK-O-BUDDY - CORE INTERACTIVE JAVASCRIPT (script.js)
 * Handles navigation, booking flow, slot selection, earnings calculator, and mock auth.
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Mobile Menu Toggle
  const mobileToggle = document.getElementById('mobileToggle');
  const navMenu = document.getElementById('navMenu');

  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener('click', () => {
      navMenu.classList.toggle('open');
    });
  }

  // 2. Interactive Map Pins and Filter Chips (search.html)
  setupSearchPage();

  // 3. Interactive Parking Slot Matrix (slot.html)
  setupSlotPage();

  // 4. Host Earnings Calculator (host.html)
  setupHostPage();

  // 5. Authentication & Role Switcher (auth.html)
  setupAuthPage();
});

/* ==========================================================================
   GLOBAL UTILITIES: TOAST NOTIFICATIONS
   ========================================================================== */
function showToast(message, type = 'info') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }

  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  toast.style.display = 'flex';

  setTimeout(() => {
    toast.style.display = 'none';
  }, 3500);
}
window.showToast = showToast;

/* ==========================================================================
   SEARCH & MAP INTERACTIONS
   ========================================================================== */
function setupSearchPage() {
  const searchForm = document.getElementById('searchForm');
  const destInput = document.getElementById('destInput');
  const dateInput = document.getElementById('dateInput');
  const checkinInput = document.getElementById('checkinInput');
  const checkoutInput = document.getElementById('checkoutInput');
  const locationLabel = document.getElementById('locationLabel');
  const spotsCount = document.getElementById('spotsCount');
  const listingsContainer = document.getElementById('listingsContainer');
  const noResultsMessage = document.getElementById('noResultsMessage');
  const noResultsText = document.getElementById('noResultsText');
  const resetSearchBtn = document.getElementById('resetSearchBtn');
  const filterChips = document.querySelectorAll('.filter-chip');
  const pins = Array.from(document.querySelectorAll('.map-price-pin'));
  const cards = Array.from(document.querySelectorAll('.parking-card'));

  // If not on search page, exit cleanly
  if (!listingsContainer || cards.length === 0) {
    return;
  }

  // 1. Read URL query parameters on initial page load (e.g., from home page quick search)
  const urlParams = new URLSearchParams(window.location.search);
  const paramLocation = urlParams.get('location');
  const paramDate = urlParams.get('date');
  const paramCheckin = urlParams.get('checkin');
  const paramCheckout = urlParams.get('checkout');

  if (paramLocation && destInput) {
    destInput.value = paramLocation;
  }
  if (paramDate && dateInput) {
    dateInput.value = paramDate;
  }
  if (paramCheckin && checkinInput) {
    checkinInput.value = paramCheckin;
  }
  if (paramCheckout && checkoutInput) {
    checkoutInput.value = paramCheckout;
  }

  let activeFilter = 'all';

  // Helper: Escape HTML in user-entered query strings
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Helper: Check if card matches destination query
  function matchesDestination(card, query) {
    if (!query || !query.trim()) return true;

    const cleanQuery = query.trim().toLowerCase();
    const dataLocation = (card.getAttribute('data-location') || '').toLowerCase();
    const cardTitle = (card.querySelector('h4')?.textContent || '').toLowerCase();
    const cardMuted = (card.querySelector('.text-muted')?.textContent || '').toLowerCase();
    const fullText = (card.textContent || '').toLowerCase();
    const searchable = `${dataLocation} ${cardTitle} ${cardMuted} ${fullText}`;

    // Direct whole phrase match
    if (searchable.includes(cleanQuery)) {
      return true;
    }

    // Comma-separated query parts (e.g. "Cyber City, Tech Park")
    const commaParts = cleanQuery.split(',').map(p => p.trim()).filter(Boolean);
    for (const part of commaParts) {
      if (searchable.includes(part)) {
        return true;
      }
    }

    // Significant keywords (>= 3 chars)
    const ignoreWords = ['the', 'and', 'for', 'near', 'with', 'from', 'into', 'area'];
    const words = cleanQuery.split(/[\s,]+/).filter(w => w.length >= 3 && !ignoreWords.includes(w));
    if (words.length > 0 && words.some(w => searchable.includes(w))) {
      return true;
    }

    return false;
  }

  // Helper: Check if card matches filter chip criteria
  function matchesFilter(card, filter) {
    const price = parseFloat(card.getAttribute('data-price') || '0');
    const distance = parseFloat(card.getAttribute('data-distance') || '0');
    const isCovered = card.getAttribute('data-covered') === 'true' || card.textContent.includes('Covered') || card.textContent.includes('Underground');
    const hasEv = card.getAttribute('data-ev') === 'true' || card.textContent.includes('EV Charging');
    const rating = parseFloat(card.getAttribute('data-rating') || '0');

    switch (filter) {
      case 'distance':
        return distance < 0.5;
      case 'covered':
        return isCovered;
      case 'ev':
        return hasEv;
      case 'rating':
        return rating >= 4.5;
      case 'all':
      case 'price':
      default:
        return true;
    }
  }

  // Core filter & render execution
  function filterAndDisplaySpots(isUserAction = false) {
    const rawDest = destInput ? destInput.value.trim() : '';
    const displayDest = rawDest || 'All Locations';

    // 1. Update Destination Label
    if (locationLabel) {
      locationLabel.textContent = displayDest;
    }

    // 2. Filter Cards by Destination and Filter Chip
    const matchingCards = [];
    cards.forEach(card => {
      const matchDest = matchesDestination(card, rawDest);
      const matchChip = matchesFilter(card, activeFilter);

      if (matchDest && matchChip) {
        card.style.display = 'flex';
        matchingCards.push(card);
      } else {
        card.style.display = 'none';
      }
    });

    // 3. Sorting by Price (if price chip selected)
    if (activeFilter === 'price' && matchingCards.length > 0) {
      matchingCards.sort((a, b) => {
        const priceA = parseFloat(a.getAttribute('data-price') || '0');
        const priceB = parseFloat(b.getAttribute('data-price') || '0');
        return priceA - priceB;
      });
      matchingCards.forEach(c => listingsContainer.appendChild(c));
    }

    // 4. Update Spots Count
    const count = matchingCards.length;
    if (spotsCount) {
      spotsCount.textContent = count;
    }

    // 5. Toggle "No parking spaces found" message
    if (noResultsMessage) {
      if (count === 0) {
        noResultsMessage.style.display = 'block';
        if (noResultsText) {
          if (rawDest) {
            noResultsText.innerHTML = `We couldn't find any verified parking spaces matching "<strong>${escapeHtml(rawDest)}</strong>". Try searching for <em>Cyber City</em>, <em>Metro Mall</em>, or <em>Tech Park</em>.`;
          } else {
            noResultsText.textContent = `No parking spaces match the selected filter. Try choosing "All Spots".`;
          }
        }
      } else {
        noResultsMessage.style.display = 'none';
      }
    }

    // 6. Synchronize Map Price Pins with Visible Cards
    let activePinSet = false;
    pins.forEach(pin => {
      const pinId = pin.getAttribute('data-pin-id');
      const isVisible = matchingCards.some(c => c.getAttribute('data-spot-id') === pinId);

      if (isVisible) {
        pin.style.display = 'block';
        if (!activePinSet) {
          pin.classList.add('active');
          activePinSet = true;
        } else {
          pin.classList.remove('active');
        }
      } else {
        pin.style.display = 'none';
        pin.classList.remove('active');
      }
    });

    // 7. Update booking link parameters with date, check-in, and check-out
    const currentDate = dateInput?.value || '';
    const currentCheckin = checkinInput?.value || '';
    const currentCheckout = checkoutInput?.value || '';

    matchingCards.forEach(card => {
      const selectBtn = card.querySelector('a.btn');
      if (selectBtn) {
        const href = selectBtn.getAttribute('href');
        const [basePath] = href.split('?');
        const params = new URLSearchParams(href.includes('?') ? href.split('?')[1] : '');
        if (currentDate) params.set('date', currentDate);
        if (currentCheckin) params.set('checkin', currentCheckin);
        if (currentCheckout) params.set('checkout', currentCheckout);
        selectBtn.setAttribute('href', `${basePath}?${params.toString()}`);
      }
    });

    // 8. User feedback notification toast
    if (isUserAction) {
      if (count > 0) {
        showToast(`Showing ${count} spot${count > 1 ? 's' : ''} for "${displayDest}"`, 'success');
      } else {
        showToast(`No parking spaces found for "${displayDest}"`, 'error');
      }
    }
  }

  // Prevent double execution flag for inline onsubmit vs addEventListener
  let lastSubmitTime = 0;
  function handleSearchUpdate() {
    const now = Date.now();
    if (now - lastSubmitTime < 200) return;
    lastSubmitTime = now;
    filterAndDisplaySpots(true);
  }

  // Expose to window.searchSpots for existing HTML inline onsubmit
  window.searchSpots = handleSearchUpdate;

  // Form submit handler with e.preventDefault() to guarantee no page reloads
  if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleSearchUpdate();
    });
  }

  // Filter chips click handler
  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeFilter = chip.getAttribute('data-filter') || 'all';
      filterAndDisplaySpots(true);
    });
  });

  // Reset button in "No Results" state
  if (resetSearchBtn) {
    resetSearchBtn.addEventListener('click', () => {
      if (destInput) destInput.value = '';
      activeFilter = 'all';
      filterChips.forEach(c => c.classList.remove('active'));
      const allChip = document.querySelector('.filter-chip[data-filter="all"]');
      if (allChip) allChip.classList.add('active');
      filterAndDisplaySpots(true);
    });
  }

  // Interactive map pin clicks
  pins.forEach(pin => {
    pin.addEventListener('click', () => {
      const pinId = pin.getAttribute('data-pin-id');
      pins.forEach(p => p.classList.remove('active'));
      pin.classList.add('active');

      const targetCard = cards.find(card => card.getAttribute('data-spot-id') === pinId);
      if (targetCard && targetCard.style.display !== 'none') {
        targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        targetCard.style.borderColor = 'var(--primary-green)';
        setTimeout(() => {
          targetCard.style.borderColor = 'var(--border-color)';
        }, 1500);
      }
    });
  });

  // Run initial filter on load without loud toast
  filterAndDisplaySpots(false);
}

/* ==========================================================================
   SLOT SELECTION & BOOKING FLOW
   ========================================================================== */
function setupSlotPage() {
  const slotButtons = document.querySelectorAll('.slot-btn:not(.occupied)');
  const summarySlot = document.getElementById('summarySlot');
  const slotIndicator = document.getElementById('slotIndicator');
  const summaryBasePrice = document.getElementById('summaryBasePrice');
  const summaryTotal = document.getElementById('summaryTotal');
  const btnConfirmPay = document.getElementById('btnConfirmPay');
  const ticketModal = document.getElementById('ticketModal');

  let selectedSlot = 'A3';
  const hourlyRate = 40;
  const hours = 4;
  const convenienceFee = 15;

  slotButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      slotButtons.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedSlot = btn.getAttribute('data-slot');

      if (summarySlot) summarySlot.textContent = `Slot ${selectedSlot}`;
      if (slotIndicator) slotIndicator.textContent = selectedSlot;

      const basePrice = hourlyRate * hours;
      const total = basePrice + convenienceFee;

      if (summaryBasePrice) summaryBasePrice.textContent = `₹${basePrice}`;
      if (summaryTotal) summaryTotal.textContent = `₹${total}`;
      if (btnConfirmPay) btnConfirmPay.textContent = `Confirm & Pay ₹${total}`;

      showToast(`Selected Slot ${selectedSlot}`, 'info');
    });
  });

  if (btnConfirmPay && ticketModal) {
    btnConfirmPay.addEventListener('click', () => {
      const plate = document.getElementById('vehiclePlate')?.value.trim() || 'DL 01 AB 1234';
      const randomTicketNum = Math.floor(10000 + Math.random() * 90000);

      const ticketId = document.getElementById('ticketId');
      const ticketSlot = document.getElementById('ticketSlot');
      const ticketPlate = document.getElementById('ticketPlate');

      if (ticketId) ticketId.textContent = `POB-${randomTicketNum}`;
      if (ticketSlot) ticketSlot.textContent = selectedSlot;
      if (ticketPlate) ticketPlate.textContent = plate;

      ticketModal.style.display = 'flex';
      showToast('Booking Confirmed! Entry QR Generated.', 'success');
    });
  }
}

/* ==========================================================================
   HOST EARNINGS CALCULATOR & LISTING
   ========================================================================== */
function setupHostPage() {
  const hoursSlider = document.getElementById('hoursSlider');
  const rateSlider = document.getElementById('rateSlider');
  const hoursVal = document.getElementById('hoursVal');
  const rateVal = document.getElementById('rateVal');
  const projectedEarnings = document.getElementById('projectedEarnings');

  function calculateEarnings() {
    if (!hoursSlider || !rateSlider) return;
    const hrs = parseInt(hoursSlider.value, 10);
    const rate = parseInt(rateSlider.value, 10);
    const daysPerMonth = 26; // avg estimated active occupancy days
    const total = hrs * rate * daysPerMonth;

    if (hoursVal) hoursVal.textContent = `${hrs} hrs / day`;
    if (rateVal) rateVal.textContent = `₹${rate} / hr`;
    if (projectedEarnings) projectedEarnings.textContent = `₹${total.toLocaleString('en-IN')}`;
  }

  if (hoursSlider && rateSlider) {
    hoursSlider.addEventListener('input', calculateEarnings);
    rateSlider.addEventListener('input', calculateEarnings);
    calculateEarnings();
  }

  const photoInput = document.getElementById('photoInput');
  const photoStatus = document.getElementById('photoStatus');
  if (photoInput && photoStatus) {
    photoInput.addEventListener('change', () => {
      if (photoInput.files.length > 0) {
        photoStatus.textContent = `✓ ${photoInput.files[0].name} uploaded`;
        photoStatus.style.display = 'block';
      }
    });
  }

  window.submitListing = function() {
    const title = document.getElementById('hostTitle')?.value;
    showToast(`Success! Your space "${title}" has been submitted for verification.`, 'success');
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1500);
  };
}

/* ==========================================================================
   AUTHENTICATION & ROLE SELECTOR
   ========================================================================== */
let currentRole = 'parker';
let currentAuthTab = 'register';

function setupAuthPage() {
  window.setRole = function(role) {
    currentRole = role;
    const roleParker = document.getElementById('roleParker');
    const roleHost = document.getElementById('roleHost');
    const authSubmitBtn = document.getElementById('authSubmitBtn');

    if (role === 'parker') {
      roleParker?.classList.add('selected');
      roleHost?.classList.remove('selected');
      if (authSubmitBtn && currentAuthTab === 'register') {
        authSubmitBtn.textContent = 'Create Parker Account →';
      }
    } else {
      roleHost?.classList.add('selected');
      roleParker?.classList.remove('selected');
      if (authSubmitBtn && currentAuthTab === 'register') {
        authSubmitBtn.textContent = 'Create Host Account →';
      }
    }
  };

  window.setAuthTab = function(tab) {
    currentAuthTab = tab;
    const tabRegister = document.getElementById('tabRegister');
    const tabLogin = document.getElementById('tabLogin');
    const groupName = document.getElementById('groupName');
    const groupPhone = document.getElementById('groupPhone');
    const groupTerms = document.getElementById('groupTerms');
    const forgotPassLink = document.getElementById('forgotPassLink');
    const authSubmitBtn = document.getElementById('authSubmitBtn');
    const authTitle = document.getElementById('authTitle');

    if (tab === 'login') {
      tabLogin.style.borderBottom = '2px solid var(--primary-green)';
      tabLogin.style.color = 'var(--primary-green)';
      tabLogin.style.fontWeight = '700';

      tabRegister.style.borderBottom = 'none';
      tabRegister.style.color = 'var(--text-muted)';
      tabRegister.style.fontWeight = '600';

      if (groupName) groupName.style.display = 'none';
      if (groupPhone) groupPhone.style.display = 'none';
      if (groupTerms) groupTerms.style.display = 'none';
      if (forgotPassLink) forgotPassLink.style.display = 'inline';
      if (authTitle) authTitle.textContent = 'Sign In to PARK-O-BUDDY';
      if (authSubmitBtn) authSubmitBtn.textContent = 'Log In →';
    } else {
      tabRegister.style.borderBottom = '2px solid var(--primary-green)';
      tabRegister.style.color = 'var(--primary-green)';
      tabRegister.style.fontWeight = '700';

      tabLogin.style.borderBottom = 'none';
      tabLogin.style.color = 'var(--text-muted)';
      tabLogin.style.fontWeight = '600';

      if (groupName) groupName.style.display = 'flex';
      if (groupPhone) groupPhone.style.display = 'flex';
      if (groupTerms) groupTerms.style.display = 'block';
      if (forgotPassLink) forgotPassLink.style.display = 'none';
      if (authTitle) authTitle.textContent = 'Welcome to PARK-O-BUDDY';
      window.setRole(currentRole);
    }
  };

  window.handleAuthSubmit = function() {
    showToast(currentAuthTab === 'login' ? 'Logging in...' : 'Account created successfully!', 'success');
    setTimeout(() => {
      window.location.href = currentRole === 'host' ? 'host.html' : 'dashboard.html';
    }, 1200);
  };
}

/* ==========================================================================
   DASHBOARD TABS
   ========================================================================== */
window.switchDashTab = function(btnElement, tabName) {
  document.querySelectorAll('.sidebar-menu button').forEach(btn => btn.classList.remove('active'));
  btnElement.classList.add('active');
  showToast(`Switched view to: ${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`, 'info');
};
