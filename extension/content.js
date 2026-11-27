/**
 * EyeControl Content Script (Manifest V3)
 * Full implementation of:
 * - Part 1: Real-time Diagnostics HUD Panel
 * - Part 2: Real Webpage Scrolling Engine (YouTube, India Today, etc.)
 * - Part 3: Invisible Adaptive Gaze Grid (3x3 & 4x4, Normal & Debug Modes)
 * - Part 4: Hierarchical Grid Selection (Coarse -> Refined Sub-grid -> Confirmation)
 * - Part 5: Gaze-Zone Scrolling (Upper & Lower zones with intentional dwell threshold)
 * - Part 6: High-precision Blue Gaze Ring (#0088FF) & OneEuroFilter jitter filtering
 */

(function () {
  if (window.__EYECONTROL_INJECTED__) return;
  window.__EYECONTROL_INJECTED__ = true;

  console.log('[EyeControl Extension v1.1.0] Injected into:', window.location.href);

  // =========================================================================
  // 1. CONFIGURATION & STATE
  // =========================================================================
  const config = {
    dwellTimeMs: 900,
    gracePeriodMs: 450,
    decayRatePerSec: 1.2,
    navigationMode: 'gaze-zone', // 'gaze-zone' | 'grid' | 'manual'
    gridRows: 3,
    gridCols: 3,
    debugMode: false,
    scrollSpeed: 4.0,
    scrollThresholdMs: 350,
    magneticSnap: true,
    soundFeedback: true,
    highlightElements: true,
    isPaused: false,
  };

  const RING_RADIUS = 18;
  const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS; // ~113.1

  // Gaze & Filter State
  let rawGazeX = window.innerWidth / 2;
  let rawGazeY = window.innerHeight / 2;
  let filteredGazeX = window.innerWidth / 2;
  let filteredGazeY = window.innerHeight / 2;
  let gazeConfidence = 1.0;
  let lastGazeTimestamp = performance.now();
  let gazeHz = 0;
  let frameCounter = 0;
  let lastHzUpdateTime = performance.now();

  // Low-Pass OneEuroFilter State for content script jitter absorption
  let prevFilteredX = window.innerWidth / 2;
  let prevFilteredY = window.innerHeight / 2;
  let prevTimestamp = performance.now();
  const FIXATION_DEADBAND_PX = 3.5;

  // Dwell Engine State
  let currentTarget = null;
  let dwellStartTime = 0;
  let savedProgress = 0;
  let isDuringGracePeriod = false;
  let lastLeaveTime = 0;
  let lockedTarget = null;

  // Grid Navigation State
  let currentGridCell = -1;
  let currentSubGridCell = -1;
  let gridLevel = 1; // 1 = Coarse, 2 = Refined Sub-grid
  let activeCoarseCell = null;
  let coarseCellDwellStart = 0;

  // Gaze-Zone Scrolling State
  let activeScrollDirection = null; // 'up' | 'down' | null
  let zoneEntryTime = 0;
  let isZoneContinuousScrolling = false;
  let zoneScrollRafId = null;

  // Diagnostics Data
  const diagnostics = {
    cameraStatus: 'Awaiting EyeControl Stream',
    faceStatus: 'Unknown',
    gazeHz: 0,
    activeUrl: window.location.hostname,
    activeCellLabel: 'None',
    scrollContainerName: 'window',
    scrollPosBefore: 0,
    scrollPosAfter: 0,
    lastCommandResult: 'Initialized',
    lastCommandTime: new Date().toLocaleTimeString(),
  };

  // DOM Elements
  let cursorRoot = null;
  let cursorEl = null;
  let progressCircle = null;
  let gridRoot = null;
  let scrollZoneUp = null;
  let scrollZoneDown = null;
  let dockRoot = null;
  let hudRoot = null;

  // =========================================================================
  // 2. AUDIO FEEDBACK CHIME
  // =========================================================================
  const playAudioFeedback = (freq1 = 587.33, freq2 = 880) => {
    if (!config.soundFeedback) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq1, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq2, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {}
  };

  // =========================================================================
  // 3. JITTER FILTERING & ONE-EURO EQUIVALENT SMOOTHING
  // =========================================================================
  const filterGazePoint = (rawX, rawY, timestamp) => {
    const dt = Math.max(0.001, (timestamp - prevTimestamp) / 1000);
    prevTimestamp = timestamp;

    const dx = rawX - prevFilteredX;
    const dy = rawY - prevFilteredY;
    const dist = Math.hypot(dx, dy);

    // Micro-tremor fixation deadband: absorb tremors under 3.5px
    if (dist < FIXATION_DEADBAND_PX) {
      return { x: prevFilteredX, y: prevFilteredY };
    }

    // Velocity adaptive alpha (saccade detection)
    const velocity = dist / dt;
    const alpha = Math.min(0.85, Math.max(0.18, velocity / 1200));

    const smoothX = prevFilteredX + alpha * (rawX - prevFilteredX);
    const smoothY = prevFilteredY + alpha * (rawY - prevFilteredY);

    prevFilteredX = smoothX;
    prevFilteredY = smoothY;
    return { x: smoothX, y: smoothY };
  };

  // =========================================================================
  // 4. REAL SCROLL CONTAINER DETECTION & SCROLLING EXECUTION (PART 2)
  // =========================================================================
  const findScrollContainer = (targetElement, x, y) => {
    // 1. Check under target element ancestors for scrollable elements
    let el = targetElement;
    while (el && el !== document.body && el !== document.documentElement) {
      const style = window.getComputedStyle(el);
      const oy = style.overflowY;
      if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 10) {
        return el;
      }
      el = el.parentElement;
    }

    // 2. Check YouTube specific containers
    const ytPrimary = document.querySelector('#primary, ytd-app, #contents, ytd-watch-flexy');
    if (ytPrimary && ytPrimary.scrollHeight > ytPrimary.clientHeight + 10) {
      const style = window.getComputedStyle(ytPrimary);
      if (style.overflowY === 'auto' || style.overflowY === 'scroll') return ytPrimary;
    }

    // 3. Check element directly under gaze point
    const elUnderGaze = document.elementFromPoint(x, y);
    if (elUnderGaze) {
      let p = elUnderGaze;
      while (p && p !== document.body && p !== document.documentElement) {
        const style = window.getComputedStyle(p);
        if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && p.scrollHeight > p.clientHeight + 10) {
          return p;
        }
        p = p.parentElement;
      }
    }

    // 4. Fallback to native viewport scrolling element
    return document.scrollingElement || document.documentElement || document.body || window;
  };

  const getContainerScrollPos = (container) => {
    if (container === window) return window.scrollY;
    return container.scrollTop !== undefined ? container.scrollTop : window.scrollY;
  };

  const executeRealScroll = (container, deltaY, smooth = false) => {
    const before = getContainerScrollPos(container);
    diagnostics.scrollPosBefore = Math.round(before);

    if (container === window || container === document.documentElement || container === document.body) {
      window.scrollBy({ top: deltaY, behavior: smooth ? 'smooth' : 'auto' });
      if (document.scrollingElement && document.scrollingElement !== container) {
        document.scrollingElement.scrollBy({ top: deltaY, behavior: smooth ? 'smooth' : 'auto' });
      }
    } else {
      container.scrollBy({ top: deltaY, behavior: smooth ? 'smooth' : 'auto' });
    }

    const after = getContainerScrollPos(container);
    diagnostics.scrollPosAfter = Math.round(after);
    diagnostics.scrollContainerName = container.id ? `#${container.id}` : container.tagName || 'window';
    diagnostics.lastCommandResult = `Scrolled ${deltaY > 0 ? 'Down' : 'Up'} (${Math.round(before)} → ${Math.round(after)})`;
    diagnostics.lastCommandTime = new Date().toLocaleTimeString();

    return { before, after, changed: before !== after };
  };

  // =========================================================================
  // 5. GAZE-ZONE SCROLLING ENGINE (PART 5)
  // =========================================================================
  const updateGazeZoneScrolling = (y, now) => {
    if (config.navigationMode !== 'gaze-zone' || config.isPaused) {
      stopZoneScrolling();
      return;
    }

    const vh = window.innerHeight;
    const upThreshold = vh * 0.18; // Top 18%
    const downThreshold = vh * 0.72; // Bottom zone starts earlier to account for calibrated gaze compression

    let detectedDirection = null;
    if (y <= upThreshold) {
      detectedDirection = 'up';
    } else if (y >= downThreshold) {
      detectedDirection = 'down';
    }

    if (detectedDirection) {
      if (activeScrollDirection !== detectedDirection) {
        // Gaze newly entered zone
        activeScrollDirection = detectedDirection;
        zoneEntryTime = now;
        isZoneContinuousScrolling = false;

        if (detectedDirection === 'up' && scrollZoneUp) {
          scrollZoneUp.classList.add('is-zone-dwelling');
        } else if (detectedDirection === 'down' && scrollZoneDown) {
          scrollZoneDown.classList.add('is-zone-dwelling');
        }
      } else {
        // Gaze lingering in zone — check intentional dwell threshold (350ms)
        const timeInZone = now - zoneEntryTime;
        if (timeInZone >= config.scrollThresholdMs && !isZoneContinuousScrolling) {
          isZoneContinuousScrolling = true;
          startContinuousZoneScroll();
        }
      }
    } else {
      // Gaze in central area
      stopZoneScrolling();
    }
  };

  const startContinuousZoneScroll = () => {
    if (zoneScrollRafId) cancelAnimationFrame(zoneScrollRafId);

    const step = () => {
      if (!isZoneContinuousScrolling || !activeScrollDirection || config.isPaused) return;

      const container = findScrollContainer(null, filteredGazeX, filteredGazeY);
      const speed = config.scrollSpeed || 4.0;
      const deltaY = activeScrollDirection === 'up' ? -speed : speed;

      executeRealScroll(container, deltaY, false);
      updateHUD();

      zoneScrollRafId = requestAnimationFrame(step);
    };

    zoneScrollRafId = requestAnimationFrame(step);
  };

  const stopZoneScrolling = () => {
    activeScrollDirection = null;
    isZoneContinuousScrolling = false;
    zoneEntryTime = 0;

    if (zoneScrollRafId) {
      cancelAnimationFrame(zoneScrollRafId);
      zoneScrollRafId = null;
    }

    if (scrollZoneUp) scrollZoneUp.classList.remove('is-zone-dwelling');
    if (scrollZoneDown) scrollZoneDown.classList.remove('is-zone-dwelling');
  };

  // =========================================================================
  // 6. ADAPTIVE INVISIBLE GAZE GRID (PART 3 & 4)
  // =========================================================================
  const updateGridClassification = (x, y, now) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cols = config.gridCols || 3;
    const rows = config.gridRows || 3;

    const colWidth = vw / cols;
    const rowHeight = vh / rows;

    const colIndex = Math.min(cols - 1, Math.max(0, Math.floor(x / colWidth)));
    const rowIndex = Math.min(rows - 1, Math.max(0, Math.floor(y / rowHeight)));
    const cellIdx = rowIndex * cols + colIndex;

    const cellNames = ['Top-Left', 'Top-Center', 'Top-Right', 'Mid-Left', 'Center', 'Mid-Right', 'Bottom-Left', 'Bottom-Center', 'Bottom-Right'];
    const cellLabel = cellNames[cellIdx] || `Cell ${cellIdx + 1}`;
    diagnostics.activeCellLabel = `Cell ${cellIdx + 1} (${cellLabel})`;

    if (cellIdx !== currentGridCell) {
      // Gaze moved to different cell
      if (gridRoot) {
        const prevCell = gridRoot.querySelector(`.eyecontrol-grid-cell[data-cell="${currentGridCell}"]`);
        if (prevCell) prevCell.classList.remove('is-active-cell');

        const newCell = gridRoot.querySelector(`.eyecontrol-grid-cell[data-cell="${cellIdx}"]`);
        if (newCell) newCell.classList.add('is-active-cell');
      }
      currentGridCell = cellIdx;
      coarseCellDwellStart = now;

      // Reset Level 2 subgrid on coarse cell departure
      if (gridLevel === 2 && activeCoarseCell !== cellIdx) {
        resetSubGrid();
      }
    } else if (config.navigationMode === 'grid') {
      // linger in coarse cell for 600ms -> activate Level 2 Refined Sub-Grid
      if (gridLevel === 1 && now - coarseCellDwellStart > 600) {
        activateSubGrid(cellIdx, colIndex, rowIndex, colWidth, rowHeight);
      }
    }
  };

  const activateSubGrid = (cellIdx, colIdx, rowIdx, colW, rowH) => {
    gridLevel = 2;
    activeCoarseCell = cellIdx;
    playAudioFeedback(440, 659.25); // Feedback chime on sub-grid expansion

    if (!gridRoot) return;
    const targetCellEl = gridRoot.querySelector(`.eyecontrol-grid-cell[data-cell="${cellIdx}"]`);
    if (targetCellEl && !targetCellEl.querySelector('.eyecontrol-subgrid')) {
      const sub = document.createElement('div');
      sub.className = 'eyecontrol-subgrid';
      sub.innerHTML = `
        <div class="eyecontrol-subgrid-cell" data-sub="0">1</div>
        <div class="eyecontrol-subgrid-cell" data-sub="1">2</div>
        <div class="eyecontrol-subgrid-cell" data-sub="2">3</div>
        <div class="eyecontrol-subgrid-cell" data-sub="3">4</div>
      `;
      targetCellEl.appendChild(sub);
    }
  };

  const resetSubGrid = () => {
    gridLevel = 1;
    activeCoarseCell = null;
    currentSubGridCell = -1;
    if (gridRoot) {
      gridRoot.querySelectorAll('.eyecontrol-subgrid').forEach(el => el.remove());
    }
  };

  // =========================================================================
  // 7. INTERACTIVE ELEMENT DETECTION & ADAPTIVE DWELL (PART 6)
  // =========================================================================
  const findInteractiveTarget = (x, y) => {
    // 1. Check floating dock buttons first
    const dockEl = document.elementFromPoint(x, y);
    if (dockEl) {
      const dockBtn = dockEl.closest('.eyecontrol-dock-btn');
      if (dockBtn) return dockBtn;
    }

    // 2. Query elements under point
    const elements = document.elementsFromPoint(x, y);
    for (const el of elements) {
      if (el === cursorRoot || el.closest('#eyecontrol-cursor-root')) continue;
      if (el.closest('#eyecontrol-dock-root') || el.closest('#eyecontrol-diagnostics-hud')) continue;

      // YouTube Specific Targets
      const ytCard = el.closest('ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer, a#thumbnail, a#video-title');
      if (ytCard) return ytCard;

      const ytBtn = el.closest('button, yt-icon-button, [role="button"], #play-button, .ytp-play-button');
      if (ytBtn) return ytBtn;

      // News & General Web Targets
      const link = el.closest('a[href]');
      if (link) return link;

      const btn = el.closest('button, input[type="button"], input[type="submit"], [role="button"]');
      if (btn) return btn;

      const input = el.closest('input[type="text"], input[type="search"], textarea');
      if (input) return input;
    }

    return null;
  };

  const updateDwell = (hoveredEl, now) => {
    if (config.isPaused || isZoneContinuousScrolling) {
      updateCursorRing(0);
      return;
    }

    // 1. Gaze departed target
    if (!hoveredEl) {
      if (lockedTarget) {
        lockedTarget = null; // Gaze left locked element; release lockout
      }

      if (currentTarget) {
        if (!isDuringGracePeriod) {
          isDuringGracePeriod = true;
          lastLeaveTime = now;
        } else {
          const timeAway = now - lastLeaveTime;
          if (timeAway > config.gracePeriodMs) {
            const decaySec = (timeAway - config.gracePeriodMs) / 1000;
            const decayed = Math.max(0, savedProgress - decaySec * config.decayRatePerSec);
            updateCursorRing(decayed);
            if (decayed <= 0) {
              resetDwell();
            }
          }
        }
      }
      return;
    }

    // 2. Gaze hovering same target
    if (hoveredEl === currentTarget) {
      if (lockedTarget === hoveredEl) return; // Keep locked

      if (isDuringGracePeriod) {
        const elapsedSoFar = savedProgress * config.dwellTimeMs;
        dwellStartTime = now - elapsedSoFar;
        isDuringGracePeriod = false;
        lastLeaveTime = 0;
      }

      const elapsed = now - dwellStartTime;
      const progress = Math.min(1.0, elapsed / config.dwellTimeMs);
      savedProgress = progress;
      updateCursorRing(progress);

      if (progress >= 1.0) {
        // Dwell Complete! Trigger element
        triggerSelection(hoveredEl);
        lockedTarget = hoveredEl;
        isDuringGracePeriod = false;
        resetDwell();
      }
      return;
    }

    // 3. New target
    resetDwell();
    if (lockedTarget === hoveredEl) return;

    currentTarget = hoveredEl;
    dwellStartTime = now;
    savedProgress = 0;
    isDuringGracePeriod = false;

    if (config.highlightElements && !currentTarget.closest('#eyecontrol-dock-root')) {
      currentTarget.classList.add('eyecontrol-target-active');
    }
  };

  const resetDwell = () => {
    if (currentTarget) {
      currentTarget.classList.remove('eyecontrol-target-active');
    }
    currentTarget = null;
    savedProgress = 0;
    dwellStartTime = 0;
    isDuringGracePeriod = false;
    lastLeaveTime = 0;
    updateCursorRing(0);
  };

  const updateCursorRing = (progress) => {
    if (progressCircle) {
      const offset = RING_CIRCUMFERENCE * (1 - progress);
      progressCircle.style.strokeDashoffset = offset.toFixed(1);
    }
  };

  // =========================================================================
  // 8. ELEMENT SELECTION & DOCK ACTIONS
  // =========================================================================
  const triggerSelection = (element) => {
    playAudioFeedback(587.33, 880);

    const dockAction = element.getAttribute('data-eye-action');
    if (dockAction) {
      executeDockAction(dockAction);
      return;
    }

    // YouTube Player Toggle
    const ytVideo = document.querySelector('video.html5-main-video');
    if (element.closest('.html5-video-player') && ytVideo) {
      if (ytVideo.paused) {
        ytVideo.play();
        diagnostics.lastCommandResult = 'YouTube: Played Video';
      } else {
        ytVideo.pause();
        diagnostics.lastCommandResult = 'YouTube: Paused Video';
      }
      updateHUD();
      return;
    }

    // Input focus or standard click
    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      element.focus();
      diagnostics.lastCommandResult = `Focused input: ${element.placeholder || element.name || 'Search'}`;
    } else {
      element.click();
      diagnostics.lastCommandResult = `Selected: ${element.innerText?.slice(0, 24) || element.tagName}`;
    }
    diagnostics.lastCommandTime = new Date().toLocaleTimeString();
    updateHUD();
  };

  const executeDockAction = (action) => {
    const container = findScrollContainer(null, filteredGazeX, filteredGazeY);

    switch (action) {
      case 'scroll-up':
        executeRealScroll(container, -380, true);
        break;

      case 'scroll-down':
        executeRealScroll(container, 380, true);
        break;

      case 'stop-scroll':
        stopZoneScrolling();
        diagnostics.lastCommandResult = 'Stopped All Scrolling';
        diagnostics.lastCommandTime = new Date().toLocaleTimeString();
        break;

      case 'toggle-mode':
        cycleNavigationMode();
        break;

      case 'toggle-debug':
        config.debugMode = !config.debugMode;
        if (gridRoot) {
          gridRoot.className = config.debugMode ? 'eyecontrol-grid-debug' : '';
        }
        if (hudRoot) {
          hudRoot.classList.toggle('is-minimized', !config.debugMode);
        }
        diagnostics.lastCommandResult = `Debug Mode: ${config.debugMode ? 'ON' : 'OFF'}`;
        break;

      case 'nav-back':
        window.history.back();
        diagnostics.lastCommandResult = 'Navigated Back';
        break;

      case 'nav-forward':
        window.history.forward();
        diagnostics.lastCommandResult = 'Navigated Forward';
        break;

      case 'nav-home':
        window.open('http://localhost:5173', 'EyeControlApp');
        diagnostics.lastCommandResult = 'Returning to EyeControl';
        break;

      case 'toggle-pause':
        config.isPaused = !config.isPaused;
        const pLabel = document.getElementById('eye-pause-label');
        if (pLabel) pLabel.textContent = config.isPaused ? 'Resume Gaze' : 'Pause Gaze';
        if (cursorEl) cursorEl.style.opacity = config.isPaused ? '0.2' : '1';
        diagnostics.lastCommandResult = config.isPaused ? 'Tracking Paused' : 'Tracking Resumed';
        break;
    }
    updateHUD();
  };

  const cycleNavigationMode = () => {
    const modes = ['gaze-zone', 'grid', 'manual'];
    const nextIdx = (modes.indexOf(config.navigationMode) + 1) % modes.length;
    config.navigationMode = modes[nextIdx];

    const modeBtnLabel = document.getElementById('eye-mode-label');
    if (modeBtnLabel) {
      modeBtnLabel.textContent = config.navigationMode === 'gaze-zone' ? 'Zone Scroll' : config.navigationMode === 'grid' ? 'Grid Mode' : 'Pointer Only';
    }
    diagnostics.lastCommandResult = `Switched Mode: ${config.navigationMode}`;
    updateHUD();
  };

  // =========================================================================
  // 9. UI CREATION: CURSOR, GRID, SCROLL ZONES, HUD & DOCK
  // =========================================================================
  const buildUI = () => {
    // 1. Cursor
    cursorRoot = document.createElement('div');
    cursorRoot.id = 'eyecontrol-cursor-root';
    cursorEl = document.createElement('div');
    cursorEl.className = 'eyecontrol-cursor';
    cursorEl.innerHTML = `
      <svg class="eyecontrol-cursor-ring-svg" viewBox="0 0 44 44">
        <circle class="eyecontrol-cursor-bg-circle" cx="22" cy="22" r="${RING_RADIUS}"></circle>
        <circle class="eyecontrol-cursor-progress-circle" cx="22" cy="22" r="${RING_RADIUS}"
          stroke-dasharray="${RING_CIRCUMFERENCE}" stroke-dashoffset="${RING_CIRCUMFERENCE}">
        </circle>
      </svg>
      <div class="eyecontrol-cursor-inner-dot"></div>
    `;
    cursorRoot.appendChild(cursorEl);
    document.documentElement.appendChild(cursorRoot);
    progressCircle = cursorEl.querySelector('.eyecontrol-cursor-progress-circle');

    // 2. Adaptive Grid
    gridRoot = document.createElement('div');
    gridRoot.id = 'eyecontrol-grid-root';
    gridRoot.style.gridTemplateColumns = `repeat(${config.gridCols}, 1fr)`;
    gridRoot.style.gridTemplateRows = `repeat(${config.gridRows}, 1fr)`;

    const totalCells = config.gridCols * config.gridRows;
    for (let i = 0; i < totalCells; i++) {
      const cell = document.createElement('div');
      cell.className = 'eyecontrol-grid-cell';
      cell.setAttribute('data-cell', String(i));
      cell.innerHTML = `<span class="eyecontrol-cell-badge">${i + 1}</span>`;
      gridRoot.appendChild(cell);
    }
    document.documentElement.appendChild(gridRoot);

    // 3. Scrolling Zones
    scrollZoneUp = document.createElement('div');
    scrollZoneUp.className = 'eyecontrol-scroll-zone eyecontrol-scroll-zone-up';
    scrollZoneUp.innerHTML = `<div class="eyecontrol-scroll-zone-indicator">▲ Hold Gaze to Scroll Up</div>`;

    scrollZoneDown = document.createElement('div');
    scrollZoneDown.className = 'eyecontrol-scroll-zone eyecontrol-scroll-zone-down';
    scrollZoneDown.innerHTML = `<div class="eyecontrol-scroll-zone-indicator">▼ Hold Gaze to Scroll Down</div>`;

    document.documentElement.appendChild(scrollZoneUp);
    document.documentElement.appendChild(scrollZoneDown);

    // 4. Diagnostics HUD Panel
    hudRoot = document.createElement('div');
    hudRoot.id = 'eyecontrol-diagnostics-hud';
    hudRoot.className = 'is-minimized';
    hudRoot.innerHTML = `
      <div class="eyecontrol-hud-header" style="cursor: pointer;" title="Click to expand/collapse diagnostics">
        <span>EyeControl Diagnostics</span>
        <span id="hud-toggle-btn" style="font-size: 10px; color: #94A3B8;">[HUD]</span>
      </div>
      <div class="eyecontrol-hud-body">
        <div class="eyecontrol-hud-row"><span class="eyecontrol-hud-label">Camera Stream:</span><span class="eyecontrol-hud-val good" id="hud-cam-status">Active</span></div>
        <div class="eyecontrol-hud-row"><span class="eyecontrol-hud-label">Gaze Frequency:</span><span class="eyecontrol-hud-val" id="hud-hz-val">0 Hz</span></div>
        <div class="eyecontrol-hud-row"><span class="eyecontrol-hud-label">Gaze Position:</span><span class="eyecontrol-hud-val" id="hud-gaze-pos">0, 0</span></div>
        <div class="eyecontrol-hud-row"><span class="eyecontrol-hud-label">Active Grid Cell:</span><span class="eyecontrol-hud-val good" id="hud-grid-cell">Cell 5 (Center)</span></div>
        <div class="eyecontrol-hud-row"><span class="eyecontrol-hud-label">Scroll Target:</span><span class="eyecontrol-hud-val" id="hud-scroll-target">window</span></div>
        <div class="eyecontrol-hud-row"><span class="eyecontrol-hud-label">Scroll Position:</span><span class="eyecontrol-hud-val" id="hud-scroll-pos">0 px</span></div>
        <div class="eyecontrol-hud-row"><span class="eyecontrol-hud-label">Last Command:</span><span class="eyecontrol-hud-val" id="hud-last-cmd">Ready</span></div>
      </div>
    `;
    hudRoot.querySelector('.eyecontrol-hud-header')?.addEventListener('click', () => {
      hudRoot.classList.toggle('is-minimized');
    });
    document.documentElement.appendChild(hudRoot);

    // 5. Accessible Floating Dock
    dockRoot = document.createElement('div');
    dockRoot.id = 'eyecontrol-dock-root';
    dockRoot.innerHTML = `
      <div class="eyecontrol-dock-header">
        <div class="eyecontrol-dock-brand">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0088FF" stroke-width="2.5"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
          <span>EyeControl</span>
        </div>
        <span style="font-size: 10px; color: #94A3B8;">Real Web</span>
      </div>
      <div class="eyecontrol-dock-buttons-grid">
        <button class="eyecontrol-dock-btn" data-eye-action="scroll-up">▲ Scroll Up</button>
        <button class="eyecontrol-dock-btn" data-eye-action="scroll-down">▼ Scroll Down</button>
        <button class="eyecontrol-dock-btn" data-eye-action="stop-scroll" style="background-color: rgba(220, 38, 38, 0.25); border-color: #DC2626;">⏹ Stop Scroll</button>
        <button class="eyecontrol-dock-btn" data-eye-action="toggle-mode"><span id="eye-mode-label">Zone Scroll</span></button>
        <button class="eyecontrol-dock-btn" data-eye-action="toggle-debug">Toggle HUD</button>
        <button class="eyecontrol-dock-btn" data-eye-action="nav-back">Back</button>
        <button class="eyecontrol-dock-btn" data-eye-action="nav-home" style="grid-column: span 2;">EyeControl Home</button>
        <button class="eyecontrol-dock-btn" data-eye-action="toggle-pause" style="grid-column: span 2; font-size: 11px;"><span id="eye-pause-label">Pause Gaze</span></button>
      </div>
    `;
    document.documentElement.appendChild(dockRoot);
  };

  const updateHUD = () => {
    if (!hudRoot) return;
    const camEl = document.getElementById('hud-cam-status');
    const hzEl = document.getElementById('hud-hz-val');
    const posEl = document.getElementById('hud-gaze-pos');
    const cellEl = document.getElementById('hud-grid-cell');
    const scrollTargetEl = document.getElementById('hud-scroll-target');
    const scrollPosEl = document.getElementById('hud-scroll-pos');
    const cmdEl = document.getElementById('hud-last-cmd');

    if (camEl) camEl.textContent = diagnostics.cameraStatus;
    if (hzEl) hzEl.textContent = `${diagnostics.gazeHz} Hz`;
    if (posEl) posEl.textContent = `${Math.round(filteredGazeX)}, ${Math.round(filteredGazeY)}`;
    if (cellEl) cellEl.textContent = diagnostics.activeCellLabel;
    if (scrollTargetEl) scrollTargetEl.textContent = diagnostics.scrollContainerName;
    if (scrollPosEl) scrollPosEl.textContent = `${diagnostics.scrollPosAfter || diagnostics.scrollPosBefore} px`;
    if (cmdEl) cmdEl.textContent = diagnostics.lastCommandResult;
  };

  // =========================================================================
  // 10. GAZE STREAM INGESTION & PIPELINE COORDINATION
  // =========================================================================
  const handleGazeInput = (x, y, confidence = { isReliable: true }) => {
    const now = performance.now();
    frameCounter++;

    if (now - lastHzUpdateTime >= 1000) {
      gazeHz = Math.round((frameCounter * 1000) / (now - lastHzUpdateTime));
      diagnostics.gazeHz = gazeHz;
      frameCounter = 0;
      lastHzUpdateTime = now;
    }

    rawGazeX = x;
    rawGazeY = y;
    diagnostics.cameraStatus = 'Streaming Gaze';

    // 1. Filter gaze jitter
    const smoothed = filterGazePoint(x, y, now);
    filteredGazeX = Math.max(0, Math.min(window.innerWidth, smoothed.x));
    filteredGazeY = Math.max(0, Math.min(window.innerHeight, smoothed.y));

    // 2. Classify Grid Cell
    updateGridClassification(filteredGazeX, filteredGazeY, now);

    // 3. Update Gaze Zone Scrolling (Upper / Lower zones)
    updateGazeZoneScrolling(filteredGazeY, now);

    // 4. Target element detection & magnetic snapping
    const target = findInteractiveTarget(filteredGazeX, filteredGazeY);
    let displayX = filteredGazeX;
    let displayY = filteredGazeY;

    if (target && config.magneticSnap && !target.closest('#eyecontrol-dock-root')) {
      const rect = target.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      displayX = filteredGazeX * 0.72 + centerX * 0.28;
      displayY = filteredGazeY * 0.72 + centerY * 0.28;
    }

    if (cursorEl) {
      cursorEl.style.transform = `translate3d(${displayX}px, ${displayY}px, 0)`;
    }

    // 5. Update Dwell Engine
    updateDwell(target, now);
    updateHUD();
  };

  // Listen for messages from background service worker
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'GAZE_POINT_UPDATE' && message.payload) {
      handleGazeInput(message.payload.x, message.payload.y, message.payload.confidence);
    } else if (message.type === 'SETTINGS_CHANGED' && message.settings) {
      Object.assign(config, message.settings);
      if (gridRoot) {
        gridRoot.className = config.debugMode ? 'eyecontrol-grid-debug' : '';
      }
      if (hudRoot) {
        hudRoot.classList.toggle('is-minimized', !config.debugMode);
      }
    }
  });

  // Direct mouse fallback for local debugging without camera
  window.addEventListener('mousemove', (e) => {
    handleGazeInput(e.clientX, e.clientY, { isReliable: true });
  });

  // Initialize UI
  if (document.body) {
    buildUI();
  } else {
    document.addEventListener('DOMContentLoaded', buildUI);
  }
})();
