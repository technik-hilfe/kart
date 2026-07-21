(() => {
  "use strict";

  const THREE = window.THREE;
  const gameShell = document.getElementById("gameShell");
  const canvas = document.getElementById("gameCanvas");
  const startScreen = document.getElementById("startScreen");
  const resultScreen = document.getElementById("resultScreen");
  const startButton = document.getElementById("startButton");
  const restartButton = document.getElementById("restartButton");
  const menuButton = document.getElementById("menuButton");
  const hud = document.getElementById("hud");
  const countdown = document.getElementById("countdown");
  const trackToast = document.getElementById("trackToast");
  const touchControls = document.getElementById("touchControls");
  const lapValue = document.getElementById("lapValue");
  const positionValue = document.getElementById("positionValue");
  const timeValue = document.getElementById("timeValue");
  const speedValue = document.getElementById("speedValue");
  const speedBar = document.getElementById("speedBar");
  const standings = document.getElementById("standings");
  const resultBadge = document.getElementById("resultBadge");
  const resultEyebrow = document.getElementById("resultEyebrow");
  const resultTitle = document.getElementById("resultTitle");
  const resultTime = document.getElementById("resultTime");
  const resultRows = document.getElementById("resultRows");
  const lapSummary = document.getElementById("lapSummary");

  if (!THREE) {
    showFatalError("Die lokale 3D-Laufzeit konnte nicht geladen werden.");
    return;
  }

  const TRACK_WIDTH = 7.8;
  const TRACK_HALF = TRACK_WIDTH / 2;
  // A deliberately over-the-top technical layout: about 600 units per lap,
  // packed into a compact area with six hairpins and constant switchbacks.
  const TRACK_SCALE = 0.90;
  const TRACK_SAMPLES = 2520;
  const GATE_COUNT = 96;
  const LAPS_TO_WIN = 3;
  const FIXED_STEP = 1 / 60;
  const METERS_PER_UNIT = 1;
  const MAX_DUST = 140;

  const controls = { up: false, down: false, left: false, right: false };
  const controlPoints = [
    [-70, -22],
    [-70, -42],
    [-68.928, -46],
    [-66, -48.928],
    [-62, -50],
    [-58, -50],
    [-54, -48.928],
    [-51.072, -46],
    [-50, -42],
    [-50, -33.8],
    [-48.821, -29.4],
    [-45.6, -26.179],
    [-41.2, -25],
    [-36.8, -25],
    [-32.4, -26.179],
    [-29.179, -29.4],
    [-28, -33.8],
    [-28, -40],
    [-26.66, -45],
    [-23, -48.66],
    [-18, -50],
    [-10, -50],
    [-5, -48.66],
    [-1.34, -45],
    [0, -40],
    [0, -33.8],
    [1.179, -29.4],
    [4.4, -26.179],
    [8.8, -25],
    [13.2, -25],
    [17.6, -26.179],
    [20.821, -29.4],
    [22, -33.8],
    [22, -40],
    [23.34, -45],
    [27, -48.66],
    [32, -50],
    [60, -50],
    [65, -48.66],
    [68.66, -45],
    [70, -40],
    [70, -35],
    [68.66, -30],
    [65, -26.34],
    [60, -25],
    [53.8, -25],
    [49.4, -23.821],
    [46.179, -20.6],
    [45, -16.2],
    [45, -11.8],
    [46.179, -7.4],
    [49.4, -4.179],
    [53.8, -3],
    [60, -3],
    [65, -1.66],
    [68.66, 2],
    [70, 7],
    [70, 40],
    [68.66, 45],
    [65, 48.66],
    [60, 50],
    [55, 50],
    [50, 48.66],
    [46.34, 45],
    [45, 40],
    [45, 33.8],
    [43.821, 29.4],
    [40.6, 26.179],
    [36.2, 25],
    [31.8, 25],
    [27.4, 26.179],
    [24.179, 29.4],
    [23, 33.8],
    [23, 40],
    [21.66, 45],
    [18, 48.66],
    [13, 50],
    [5, 50],
    [0, 48.66],
    [-3.66, 45],
    [-5, 40],
    [-5, 33.8],
    [-6.179, 29.4],
    [-9.4, 26.179],
    [-13.8, 25],
    [-18.2, 25],
    [-22.6, 26.179],
    [-25.821, 29.4],
    [-27, 33.8],
    [-27, 40],
    [-28.34, 45],
    [-32, 48.66],
    [-37, 50],
    [-60, 50],
    [-65, 48.66],
    [-68.66, 45],
    [-70, 40],
    [-70, 35],
    [-68.66, 30],
    [-65, 26.34],
    [-60, 25],
    [-53.8, 25],
    [-49.4, 23.821],
    [-46.179, 20.6],
    [-45, 16.2],
    [-45, 11.8],
    [-46.179, 7.4],
    [-49.4, 4.179],
    [-53.8, 3],
    [-60, 3],
    [-65, 1.66],
    [-68.66, -2],
    [-70, -7]
  ];

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance"
    });
  } catch (error) {
    showFatalError("WebGL ist in diesem Browser nicht verfügbar.");
    return;
  }

  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.04;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x90d5f4);
  scene.fog = new THREE.Fog(0x90cfe9, 105, 310);

  const camera = new THREE.PerspectiveCamera(59, 16 / 9, 0.1, 420);
  const cameraLook = new THREE.Vector3();
  let cameraReady = false;

  const track = buildTrack();
  const world = new THREE.Group();
  scene.add(world);
  const scenery = buildWorld();
  const dust = buildDustSystem();
  const kartMeshes = new Map();

  let phase = "menu";
  let player;
  let bots = [];
  let cars = [];
  let raceTime = 0;
  let sceneTime = 0;
  let countdownLeft = 0;
  let lastCountdownLabel = "";
  let lastTimestamp = performance.now();
  let accumulator = 0;
  let toastTimer = 0;
  let countdownHideTimer = 0;
  let debugTimeScale = 1;
  let resizeObserver;

  function buildTrack() {
    const curvePoints = controlPoints.map(([x, z]) => new THREE.Vector3(x * TRACK_SCALE, 0, z * TRACK_SCALE));
    const curve = new THREE.CatmullRomCurve3(curvePoints, true, "centripetal", 0.5);
    curve.arcLengthDivisions = 2200;
    const length = curve.getLength();
    const spaced = curve.getSpacedPoints(TRACK_SAMPLES);
    spaced.pop();
    const step = length / spaced.length;
    const nodes = spaced.map((point, index) => ({ x: point.x, z: point.z, s: index * step }));

    nodes.forEach((node, index) => {
      const previous = nodes[(index - 1 + nodes.length) % nodes.length];
      const next = nodes[(index + 1) % nodes.length];
      const tangentLength = Math.hypot(next.x - previous.x, next.z - previous.z) || 1;
      node.tx = (next.x - previous.x) / tangentLength;
      node.tz = (next.z - previous.z) / tangentLength;
      node.nx = -node.tz;
      node.nz = node.tx;
    });

    const model = { curve, length, step, nodes, gates: [], roadGeometry: null };
    for (let index = 0; index < GATE_COUNT; index += 1) {
      const p = sampleTrack(model, index * length / GATE_COUNT);
      model.gates.push({
        index,
        s: index * length / GATE_COUNT,
        x: p.x,
        z: p.z,
        tx: p.tx,
        tz: p.tz,
        nx: p.nx,
        nz: p.nz
      });
    }
    return model;
  }

  function sampleTrack(targetTrack, s, lateral = 0) {
    const wrapped = mod(s, targetTrack.length);
    const precise = wrapped / targetTrack.step;
    const index = Math.floor(precise) % targetTrack.nodes.length;
    const nextIndex = (index + 1) % targetTrack.nodes.length;
    const mix = precise - Math.floor(precise);
    const a = targetTrack.nodes[index];
    const b = targetTrack.nodes[nextIndex];
    let tx = lerp(a.tx, b.tx, mix);
    let tz = lerp(a.tz, b.tz, mix);
    const tangentLength = Math.hypot(tx, tz) || 1;
    tx /= tangentLength;
    tz /= tangentLength;
    const nx = -tz;
    const nz = tx;
    return {
      x: lerp(a.x, b.x, mix) + nx * lateral,
      z: lerp(a.z, b.z, mix) + nz * lateral,
      tx,
      tz,
      nx,
      nz,
      s: wrapped
    };
  }

  function pointAtDistance(s, lateral = 0) {
    return sampleTrack(track, s, lateral);
  }

  function projectToTrack(x, z) {
    let nearestIndex = 0;
    let bestSquared = Infinity;
    for (let index = 0; index < track.nodes.length; index += 1) {
      const node = track.nodes[index];
      const dx = x - node.x;
      const dz = z - node.z;
      const squared = dx * dx + dz * dz;
      if (squared < bestSquared) {
        bestSquared = squared;
        nearestIndex = index;
      }
    }

    const nearest = track.nodes[nearestIndex];
    const next = track.nodes[(nearestIndex + 1) % track.nodes.length];
    const previous = track.nodes[(nearestIndex - 1 + track.nodes.length) % track.nodes.length];
    const ahead = projectToSegment(x, z, nearest, next, nearest.s);
    const behind = projectToSegment(x, z, previous, nearest, previous.s);
    const projection = ahead.distanceSquared < behind.distanceSquared ? ahead : behind;
    projection.s = mod(projection.s, track.length);
    return projection;
  }

  function projectToSegment(x, z, a, b, startS) {
    const abx = b.x - a.x;
    const abz = b.z - a.z;
    const lengthSquared = abx * abx + abz * abz || 1;
    const mix = clamp(((x - a.x) * abx + (z - a.z) * abz) / lengthSquared, 0, 1);
    const px = a.x + abx * mix;
    const pz = a.z + abz * mix;
    const dx = x - px;
    const dz = z - pz;
    const segmentLength = Math.sqrt(lengthSquared);
    const tx = abx / segmentLength;
    const tz = abz / segmentLength;
    const nx = -tz;
    const nz = tx;
    return {
      x: px,
      z: pz,
      s: startS + segmentLength * mix,
      tx,
      tz,
      nx,
      nz,
      lateral: dx * nx + dz * nz,
      distance: Math.hypot(dx, dz),
      distanceSquared: dx * dx + dz * dz
    };
  }

  function buildWorld() {
    const hemi = new THREE.HemisphereLight(0xdaf4ff, 0x3f6b3c, 2.2);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff0cb, 3.25);
    sun.position.set(-32, 45, -28);
    const sunTarget = new THREE.Object3D();
    sun.target = sunTarget;
    scene.add(sunTarget);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -34;
    sun.shadow.camera.right = 34;
    sun.shadow.camera.top = 30;
    sun.shadow.camera.bottom = -30;
    sun.shadow.camera.near = 8;
    sun.shadow.camera.far = 100;
    sun.shadow.bias = -0.00045;
    scene.add(sun);

    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x61a94f, roughness: 1, flatShading: true });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(420, 300, 34, 26), groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.055;
    ground.receiveShadow = true;
    world.add(ground);

    addMownGrass();
    addHills();
    addRoadsideMounds();

    const shoulderMaterial = new THREE.MeshStandardMaterial({ color: 0xd1b77c, roughness: 1 });
    const shoulder = new THREE.Mesh(createFullRibbon(TRACK_HALF + 1.18, 0.015), shoulderMaterial);
    shoulder.receiveShadow = true;
    world.add(shoulder);

    const roadBaseMaterial = new THREE.MeshStandardMaterial({ color: 0x2e343b, roughness: 0.95 });
    const roadBase = new THREE.Mesh(createFullRibbon(TRACK_HALF + 0.14, 0.038), roadBaseMaterial);
    roadBase.receiveShadow = true;
    world.add(roadBase);

    const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x454c55, roughness: 0.92, metalness: 0.01 });
    const road = new THREE.Mesh(createFullRibbon(TRACK_HALF, 0.055), roadMaterial);
    road.receiveShadow = true;
    track.roadGeometry = road.geometry;
    world.add(road);

    const curb = new THREE.Mesh(
      createCurbGeometry(),
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.86, side: THREE.DoubleSide })
    );
    curb.receiveShadow = true;
    world.add(curb);

    const tyreMaterial = new THREE.MeshStandardMaterial({ color: 0x1d242a, roughness: 1, transparent: true, opacity: 0.13 });
    [-1.22, 1.22].forEach((offset) => {
      const mark = new THREE.Mesh(createOffsetRibbon(offset, 0.055, 0.069), tyreMaterial);
      mark.receiveShadow = true;
      world.add(mark);
    });

    const startLine = createStartLine();
    world.add(startLine);
    const startArch = createStartArch();
    world.add(startArch);
    addTrackSigns();
    const trees = createTrees();

    return { ground, road, curb, trees, treeCount: trees.count, sun, sunTarget };
  }

  function createFullRibbon(halfWidth, y) {
    const positions = [];
    const indices = [];
    track.nodes.forEach((node) => {
      positions.push(node.x + node.nx * halfWidth, y, node.z + node.nz * halfWidth);
      positions.push(node.x - node.nx * halfWidth, y, node.z - node.nz * halfWidth);
    });
    for (let index = 0; index < track.nodes.length; index += 1) {
      const next = (index + 1) % track.nodes.length;
      const a = index * 2;
      const b = a + 1;
      const c = next * 2;
      const d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    return geometry;
  }

  function createOffsetRibbon(offset, width, y) {
    const positions = [];
    const indices = [];
    track.nodes.forEach((node) => {
      positions.push(node.x + node.nx * (offset + width), y, node.z + node.nz * (offset + width));
      positions.push(node.x + node.nx * (offset - width), y, node.z + node.nz * (offset - width));
    });
    for (let index = 0; index < track.nodes.length; index += 1) {
      const next = (index + 1) % track.nodes.length;
      const a = index * 2;
      const b = a + 1;
      const c = next * 2;
      const d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }

  function createCurbGeometry() {
    const positions = [];
    const colors = [];
    const indices = [];
    const red = new THREE.Color(0xd94845);
    const white = new THREE.Color(0xf8f1df);
    let vertex = 0;

    for (let index = 0; index < track.nodes.length; index += 1) {
      const nextIndex = (index + 1) % track.nodes.length;
      const a = track.nodes[index];
      const b = track.nodes[nextIndex];
      const segmentColor = Math.floor(index / 8) % 2 === 0 ? red : white;
      [-1, 1].forEach((side) => {
        const inner = TRACK_HALF;
        const outer = TRACK_HALF + 0.68;
        positions.push(
          a.x + a.nx * side * inner, 0.082, a.z + a.nz * side * inner,
          a.x + a.nx * side * outer, 0.082, a.z + a.nz * side * outer,
          b.x + b.nx * side * inner, 0.082, b.z + b.nz * side * inner,
          b.x + b.nx * side * outer, 0.082, b.z + b.nz * side * outer
        );
        for (let colorIndex = 0; colorIndex < 4; colorIndex += 1) {
          colors.push(segmentColor.r, segmentColor.g, segmentColor.b);
        }
        indices.push(vertex, vertex + 1, vertex + 2, vertex + 1, vertex + 3, vertex + 2);
        vertex += 4;
      });
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }

  function createStartLine() {
    const group = new THREE.Group();
    const cellWidth = TRACK_WIDTH / 10;
    const cellLength = 0.46;
    const white = new THREE.MeshStandardMaterial({ color: 0xfffdf0, roughness: 0.9 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x172027, roughness: 0.9 });
    const geometry = new THREE.BoxGeometry(cellWidth + 0.012, 0.045, cellLength + 0.012);
    for (let row = 0; row < 10; row += 1) {
      for (let column = 0; column < 2; column += 1) {
        const tile = new THREE.Mesh(geometry, (row + column) % 2 === 0 ? white : dark);
        tile.position.set(-TRACK_HALF + cellWidth * (row + 0.5), 0.088, (column - 0.5) * cellLength);
        tile.receiveShadow = true;
        group.add(tile);
      }
    }
    placeAlongTrack(group, 0);
    return group;
  }

  function createStartArch() {
    const group = new THREE.Group();
    const dark = new THREE.MeshStandardMaterial({ color: 0x24333d, roughness: 0.7 });
    const yellow = new THREE.MeshStandardMaterial({ color: 0xffd33f, roughness: 0.75 });
    const white = new THREE.MeshStandardMaterial({ color: 0xfff8e5, roughness: 0.75 });
    const poleGeometry = new THREE.BoxGeometry(0.38, 4.8, 0.38);
    [-1, 1].forEach((side) => {
      const pole = new THREE.Mesh(poleGeometry, dark);
      pole.position.set(side * (TRACK_HALF + 1.05), 2.38, 0);
      pole.castShadow = true;
      group.add(pole);
    });
    const beam = new THREE.Mesh(new THREE.BoxGeometry(TRACK_WIDTH + 2.5, 0.72, 0.52), yellow);
    beam.position.y = 4.62;
    beam.castShadow = true;
    group.add(beam);
    for (let index = 0; index < 9; index += 1) {
      const square = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.22, 0.54), index % 2 === 0 ? dark : white);
      square.position.set(-1.92 + index * 0.48, 4.62, -0.04);
      group.add(square);
    }
    placeAlongTrack(group, 0);
    return group;
  }

  function placeAlongTrack(object, s, lateral = 0) {
    const p = pointAtDistance(s, lateral);
    object.position.x = p.x;
    object.position.z = p.z;
    object.rotation.y = Math.atan2(p.tx, p.tz);
  }

  function addMownGrass() {
    const stripeMaterialA = new THREE.MeshBasicMaterial({ color: 0x78bb5d, transparent: true, opacity: 0.12, depthWrite: false });
    const stripeMaterialB = new THREE.MeshBasicMaterial({ color: 0x3c8d45, transparent: true, opacity: 0.08, depthWrite: false });
    for (let index = -25; index <= 25; index += 1) {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 280), index % 2 === 0 ? stripeMaterialA : stripeMaterialB);
      stripe.rotation.x = -Math.PI / 2;
      stripe.rotation.z = -0.18;
      stripe.position.set(index * 7.2, -0.047, 0);
      world.add(stripe);
    }
  }

  function addHills() {
    const random = mulberry32(30113);
    const materials = [
      new THREE.MeshStandardMaterial({ color: 0x4d934e, roughness: 1, flatShading: true }),
      new THREE.MeshStandardMaterial({ color: 0x5a9d54, roughness: 1, flatShading: true }),
      new THREE.MeshStandardMaterial({ color: 0x438447, roughness: 1, flatShading: true })
    ];
    for (let index = 0; index < 25; index += 1) {
      const angle = index / 25 * Math.PI * 2;
      const radius = 154 + random() * 22;
      const width = 18 + random() * 22;
      const height = 9 + random() * 15;
      const hill = new THREE.Mesh(new THREE.ConeGeometry(width, height, 7), materials[index % materials.length]);
      hill.position.set(Math.cos(angle) * radius, height / 2 - 1.2, Math.sin(angle) * radius * 0.78);
      hill.rotation.y = random() * Math.PI;
      hill.receiveShadow = true;
      world.add(hill);
    }
  }

  function addRoadsideMounds() {
    const random = mulberry32(91327);
    const geometry = new THREE.SphereGeometry(1, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2);
    const materials = [
      new THREE.MeshStandardMaterial({ color: 0x5b9e4e, roughness: 1, flatShading: true }),
      new THREE.MeshStandardMaterial({ color: 0x6aaa53, roughness: 1, flatShading: true }),
      new THREE.MeshStandardMaterial({ color: 0x4f9148, roughness: 1, flatShading: true })
    ];

    for (let index = 0; index < 28; index += 1) {
      const side = random() > 0.5 ? 1 : -1;
      const p = pointAtDistance(
        (index + 0.35 + random() * 0.35) / 28 * track.length,
        side * (TRACK_HALF + 10 + random() * 15)
      );
      const scaleX = 3.2 + random() * 4.8;
      const scaleY = 1.25 + random() * 1.65;
      const scaleZ = 3.8 + random() * 5.4;
      const clearance = projectToTrack(p.x, p.z).distance;
      if (clearance < TRACK_HALF + Math.max(scaleX, scaleZ) + 1.2) continue;
      const mound = new THREE.Mesh(geometry, materials[index % materials.length]);
      mound.position.set(p.x, -0.04, p.z);
      mound.scale.set(scaleX, scaleY, scaleZ);
      mound.rotation.y = random() * Math.PI;
      mound.castShadow = true;
      mound.receiveShadow = true;
      world.add(mound);
    }
  }

  function addTrackSigns() {
    const yellow = new THREE.MeshStandardMaterial({ color: 0xffd33f, roughness: 0.7 });
    const cyan = new THREE.MeshStandardMaterial({ color: 0x42c5d4, roughness: 0.7 });
    const ink = new THREE.MeshStandardMaterial({ color: 0x1a2932, roughness: 0.8 });
    [0.18, 0.43, 0.68, 0.87].forEach((fraction, signIndex) => {
      const group = new THREE.Group();
      const board = new THREE.Mesh(new THREE.BoxGeometry(2.15, 1.05, 0.18), signIndex % 2 === 0 ? yellow : cyan);
      board.position.y = 1.45;
      board.castShadow = true;
      group.add(board);
      const arrowA = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.18, 0.21), ink);
      arrowA.position.set(-0.28, 1.45, -0.11);
      arrowA.rotation.z = -0.5;
      group.add(arrowA);
      const arrowB = arrowA.clone();
      arrowB.position.x = 0.28;
      arrowB.rotation.z = 0.5;
      group.add(arrowB);
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.2, 0.18), ink);
      post.position.y = 0.55;
      group.add(post);
      placeAlongTrack(group, track.length * fraction, TRACK_HALF + 2.1);
      world.add(group);
    });
  }

  function createTrees() {
    const random = mulberry32(77291);
    const treeData = [];
    const minimumTrees = 1050;

    function plantTree(x, z, scale) {
      if (Math.abs(x) >= 150 || Math.abs(z) >= 116) return false;
      const trackClearance = projectToTrack(x, z).distance;
      if (trackClearance <= TRACK_HALF + 2.05 * scale + 0.65) return false;
      const clear = treeData.every((tree) => (
        Math.hypot(tree.x - x, tree.z - z) > 2.05 * Math.min(scale, tree.scale)
      ));
      if (!clear) return false;
      treeData.push({ x, z, scale, rotation: random() * Math.PI * 2, color: random() });
      return true;
    }

    // Two irregular tree belts follow the whole lap, so even start/finish and
    // the final corners are visibly enclosed by forest.
    const tracksideSamples = Math.max(300, Math.round(track.length / 1.75));
    for (let index = 0; index < tracksideSamples; index += 1) {
      const s = (index + random() * 0.72) / tracksideSamples * track.length;
      [-1, 1].forEach((side) => {
        const offset = TRACK_HALF + 4.6 + random() * 12.8;
        const p = pointAtDistance(s, side * offset);
        plantTree(p.x, p.z, 0.72 + random() * 0.66);
      });
    }

    // Fill the infield and the complete horizon with a dense, lightly
    // jittered forest grid. Track projection keeps every trunk off the road.
    const forestSpacing = 8.4;
    for (let z = -112; z <= 112; z += forestSpacing) {
      for (let x = -147; x <= 147; x += forestSpacing) {
        const px = x + (random() - 0.5) * 5.2;
        const pz = z + (random() - 0.5) * 5.2;
        plantTree(px, pz, 0.68 + random() * 0.64);
      }
    }

    // Close any remaining sparse pockets without creating a visible pattern.
    for (let attempt = 0; attempt < 1800 && treeData.length < minimumTrees; attempt += 1) {
      const x = (random() - 0.5) * 292;
      const z = (random() - 0.5) * 220;
      plantTree(x, z, 0.7 + random() * 0.66);
    }

    const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.42, 2.0, 6);
    const lowerGeometry = new THREE.ConeGeometry(1.45, 2.8, 7);
    const upperGeometry = new THREE.ConeGeometry(1.05, 2.5, 7);
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x755039, roughness: 1, flatShading: true });
    const leafMaterial = new THREE.MeshStandardMaterial({ color: 0x2f8247, roughness: 1, flatShading: true, vertexColors: true });
    const upperMaterial = new THREE.MeshStandardMaterial({ color: 0x489b4e, roughness: 1, flatShading: true, vertexColors: true });
    const trunks = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, treeData.length);
    const crowns = new THREE.InstancedMesh(lowerGeometry, leafMaterial, treeData.length);
    const tops = new THREE.InstancedMesh(upperGeometry, upperMaterial, treeData.length);
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    treeData.forEach((tree, index) => {
      dummy.position.set(tree.x, tree.scale, tree.z);
      dummy.rotation.set(0, tree.rotation, 0);
      dummy.scale.setScalar(tree.scale);
      dummy.updateMatrix();
      trunks.setMatrixAt(index, dummy.matrix);

      dummy.position.y = 3.0 * tree.scale;
      dummy.rotation.y = tree.rotation + 0.2;
      dummy.updateMatrix();
      crowns.setMatrixAt(index, dummy.matrix);
      color.setHSL(0.315 + tree.color * 0.035, 0.44 + tree.color * 0.12, 0.31 + tree.color * 0.08);
      crowns.setColorAt(index, color);

      dummy.position.y = 4.05 * tree.scale;
      dummy.rotation.y = tree.rotation - 0.3;
      dummy.scale.setScalar(tree.scale * 0.92);
      dummy.updateMatrix();
      tops.setMatrixAt(index, dummy.matrix);
      color.setHSL(0.29 + tree.color * 0.045, 0.48, 0.39 + tree.color * 0.08);
      tops.setColorAt(index, color);
    });

    [trunks, crowns, tops].forEach((mesh) => {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      world.add(mesh);
    });
    return { count: treeData.length, trunks, crowns, tops };
  }

  function buildDustSystem() {
    const positions = new Float32Array(MAX_DUST * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setDrawRange(0, 0);
    const material = new THREE.PointsMaterial({
      color: 0xdac38a,
      size: 0.48,
      transparent: true,
      opacity: 0.66,
      depthWrite: false,
      sizeAttenuation: true
    });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    scene.add(points);
    return { particles: [], positions, geometry, points };
  }

  function spawnDust(x, z, angle) {
    if (dust.particles.length >= MAX_DUST) dust.particles.shift();
    const spread = (Math.random() - 0.5) * 1.5;
    dust.particles.push({
      x: x - Math.sin(angle) * 0.8 + Math.cos(angle) * spread,
      y: 0.24 + Math.random() * 0.12,
      z: z - Math.cos(angle) * 0.8 - Math.sin(angle) * spread,
      vx: (Math.random() - 0.5) * 1.5,
      vy: 0.45 + Math.random() * 0.7,
      vz: (Math.random() - 0.5) * 1.5,
      life: 0.6 + Math.random() * 0.45,
      maxLife: 1.05
    });
  }

  function updateDust(dt) {
    for (let index = dust.particles.length - 1; index >= 0; index -= 1) {
      const particle = dust.particles[index];
      particle.life -= dt;
      if (particle.life <= 0) {
        dust.particles.splice(index, 1);
        continue;
      }
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.z += particle.vz * dt;
      particle.vx *= Math.exp(-2.4 * dt);
      particle.vy *= Math.exp(-2.9 * dt);
      particle.vz *= Math.exp(-2.4 * dt);
    }

    dust.particles.forEach((particle, index) => {
      const offset = index * 3;
      dust.positions[offset] = particle.x;
      dust.positions[offset + 1] = particle.y;
      dust.positions[offset + 2] = particle.z;
    });
    dust.geometry.attributes.position.needsUpdate = true;
    dust.geometry.setDrawRange(0, dust.particles.length);
  }

  function createKartMesh(color, accent, isPlayer = false) {
    const root = new THREE.Group();
    const visual = new THREE.Group();
    root.add(visual);

    const bodyMaterial = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.03, flatShading: true });
    const accentMaterial = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.68, flatShading: true });
    const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x20262b, roughness: 0.92, flatShading: true });
    const metalMaterial = new THREE.MeshStandardMaterial({ color: 0x8c999e, roughness: 0.52, metalness: 0.32 });

    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(1.18, 18),
      new THREE.MeshBasicMaterial({ color: 0x142018, transparent: true, opacity: 0.24, depthWrite: false })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.scale.set(1, 1.42, 1);
    shadow.position.y = 0.018;
    root.add(shadow);

    const chassis = makeBox(1.42, 0.26, 2.12, bodyMaterial, 0, 0.42, 0);
    visual.add(chassis);
    const nose = makeBox(1.06, 0.26, 0.73, accentMaterial, 0, 0.57, 0.86);
    visual.add(nose);
    const rear = makeBox(1.22, 0.35, 0.55, bodyMaterial, 0, 0.61, -0.77);
    visual.add(rear);
    const seat = makeBox(0.72, 0.58, 0.62, darkMaterial, 0, 0.8, -0.28);
    visual.add(seat);

    const helmetMaterial = new THREE.MeshStandardMaterial({ color, roughness: 0.58, flatShading: true });
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.34, 9, 6), helmetMaterial);
    helmet.position.set(0, 1.17, -0.28);
    helmet.castShadow = true;
    visual.add(helmet);
    const visor = makeBox(0.43, 0.13, 0.08, darkMaterial, 0, 1.19, -0.57);
    visual.add(visor);

    const bumperFront = makeBox(1.6, 0.13, 0.14, metalMaterial, 0, 0.29, 1.1);
    const bumperRear = makeBox(1.48, 0.13, 0.14, metalMaterial, 0, 0.31, -1.1);
    visual.add(bumperFront, bumperRear);

    const spoilerBar = makeBox(1.45, 0.13, 0.33, darkMaterial, 0, 1.03, -0.92);
    visual.add(spoilerBar);
    [-0.48, 0.48].forEach((x) => visual.add(makeBox(0.1, 0.38, 0.1, darkMaterial, x, 0.84, -0.84)));

    const tyres = [];
    const frontPivots = [];
    [[-0.82, 0.7, true], [0.82, 0.7, true], [-0.82, -0.7, false], [0.82, -0.7, false]].forEach(([x, z, front]) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, 0.35, z);
      const axle = new THREE.Group();
      axle.rotation.z = Math.PI / 2;
      const tyre = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.3, 10), darkMaterial);
      tyre.castShadow = true;
      axle.add(tyre);
      pivot.add(axle);
      visual.add(pivot);
      tyres.push(tyre);
      if (front) frontPivots.push(pivot);
    });

    if (isPlayer) {
      const marker = new THREE.Mesh(
        new THREE.ConeGeometry(0.26, 0.55, 3),
        new THREE.MeshStandardMaterial({ color: 0xfff4b0, emissive: 0x5f4b05, emissiveIntensity: 0.18 })
      );
      marker.position.y = 2.25;
      marker.rotation.x = Math.PI;
      root.add(marker);
    }

    visual.traverse((object) => {
      if (object.isMesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
    root.userData = { visual, tyres, frontPivots, wheelSpin: 0 };
    world.add(root);
    return root;
  }

  function makeBox(width, height, depth, material, x, y, z) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  function ensureKartMeshes() {
    if (kartMeshes.size) return;
    kartMeshes.set("player", createKartMesh(0xffd33f, 0xfff4b0, true));
    kartMeshes.set("tom", createKartMesh(0xf0605f, 0xffdfd8));
    kartMeshes.set("kim", createKartMesh(0x42c5d4, 0xdcfbff));
  }

  function createPlayer() {
    const startDistance = -2.7;
    const p = pointAtDistance(startDistance, 0);
    return {
      id: "player",
      name: "Sunny (Du)",
      shortName: "Du",
      color: "#ffd33f",
      x: p.x,
      z: p.z,
      previousX: p.x,
      previousZ: p.z,
      angle: Math.atan2(p.tx, p.tz),
      speed: 0,
      maxSpeed: 20.8,
      steerVisual: 0,
      lap: 0,
      nextGate: 1,
      lastGate: 0,
      lapStartTime: 0,
      lapTimes: [],
      finishTime: null,
      projection: projectToTrack(p.x, p.z),
      offRoadTime: 0,
      lastRoadS: startDistance,
      raceDistance: 0,
      liveDistance: 0,
      lastProjectionS: projectToTrack(p.x, p.z).s,
      maxRecordedSpeed: 0,
      autoPilot: false,
      autoDistance: startDistance
    };
  }

  function createBot(id, name, color, startDistance, lane, topSpeed, seed) {
    const p = pointAtDistance(startDistance, lane);
    return {
      id,
      name,
      shortName: name.split(" ")[0],
      color,
      x: p.x,
      z: p.z,
      previousX: p.x,
      previousZ: p.z,
      angle: Math.atan2(p.tx, p.tz),
      speed: 0,
      distance: startDistance,
      lane,
      topSpeed,
      seed,
      steerVisual: 0,
      lap: 0,
      lapStartTime: 0,
      lapTimes: [],
      finishTime: null,
      raceDistance: 0,
      maxRecordedSpeed: 0
    };
  }

  function resetRace() {
    clearControls();
    dust.particles.length = 0;
    updateDust(0);
    raceTime = 0;
    accumulator = 0;
    debugTimeScale = 1;
    player = createPlayer();
    bots = [
      createBot("tom", "Turbo Tom", "#f0605f", -5.0, -1.25, 17.25, 1.8),
      createBot("kim", "Kurven-Kim", "#42c5d4", -7.4, 1.25, 16.65, 4.4)
    ];
    cars = [player, ...bots];
    ensureKartMeshes();
    syncKartMeshes(0);
    updateRaceDistances();
    updateHud();
  }

  function startRace(options = {}) {
    window.clearTimeout(countdownHideTimer);
    resetRace();
    if (options.autoPilot) {
      player.autoPilot = true;
      debugTimeScale = clamp(Number(options.timeScale) || 1, 1, 12);
    }
    startScreen.hidden = true;
    resultScreen.hidden = true;
    hud.hidden = false;
    touchControls.hidden = false;
    countdown.hidden = false;
    countdownLeft = 3.4;
    lastCountdownLabel = "";
    phase = "countdown";
    setCountdownLabel("3");
    snapChaseCamera();
    canvas.focus();
  }

  function showMenu() {
    window.clearTimeout(countdownHideTimer);
    phase = "menu";
    resetRace();
    startScreen.hidden = false;
    resultScreen.hidden = true;
    hud.hidden = true;
    countdown.hidden = true;
    touchControls.hidden = true;
    cameraReady = false;
    startButton.focus();
  }

  function update(dt) {
    sceneTime += dt;

    if (phase === "countdown") {
      countdownLeft -= dt;
      if (countdownLeft > 2.4) setCountdownLabel("3");
      else if (countdownLeft > 1.4) setCountdownLabel("2");
      else if (countdownLeft > 0.4) setCountdownLabel("1");
      else setCountdownLabel("LOS!");

      if (countdownLeft <= 0) {
        phase = "racing";
        raceTime = 0;
        player.lapStartTime = 0;
        bots.forEach((bot) => { bot.lapStartTime = 0; });
        countdown.classList.add("go");
        countdownHideTimer = window.setTimeout(() => { countdown.hidden = true; }, 430);
      }
      updateDust(dt);
      return;
    }

    if (phase !== "racing") {
      updateDust(dt);
      return;
    }

    raceTime += dt;
    if (player.autoPilot) updateAutoPlayer(dt);
    else updatePlayer(dt);
    bots.forEach((bot) => updateBot(bot, dt));
    resolvePlayerBotContacts();
    updateDust(dt);
    updateRaceDistances();

    if (cars.every((car) => car.finishTime !== null)) showResults();
  }

  function updatePlayer(dt) {
    if (player.finishTime !== null) {
      player.speed *= Math.exp(-2.1 * dt);
      player.previousX = player.x;
      player.previousZ = player.z;
      player.x += Math.sin(player.angle) * player.speed * dt;
      player.z += Math.cos(player.angle) * player.speed * dt;
      return;
    }

    const beforeProjection = player.projection || projectToTrack(player.x, player.z);
    const onRoad = beforeProjection.distance <= TRACK_HALF - 0.06;
    const throttle = controls.up ? 1 : 0;
    const braking = controls.down;
    const steer = (controls.left ? 1 : 0) - (controls.right ? 1 : 0);
    player.steerVisual += (steer - player.steerVisual) * (1 - Math.exp(-10 * dt));

    if (throttle) player.speed += (onRoad ? 13.2 : 7.2) * dt;
    else if (!braking) player.speed *= Math.exp(-(onRoad ? 0.48 : 2.25) * dt);

    if (braking) {
      if (player.speed > 0.8) player.speed -= 21.5 * dt;
      else player.speed -= (onRoad ? 6.2 : 4.1) * dt;
    }

    const forwardLimit = onRoad ? player.maxSpeed : 7.6;
    player.speed = clamp(player.speed, -5.2, forwardLimit);
    player.maxRecordedSpeed = Math.max(player.maxRecordedSpeed, Math.abs(player.speed));
    const speedRatio = Math.min(1, Math.abs(player.speed) / 5.4);
    const highSpeedStability = 1 - 0.28 * Math.min(1, Math.abs(player.speed) / player.maxSpeed);
    player.angle += steer * 1.72 * speedRatio * highSpeedStability * Math.sign(player.speed || 1) * dt;

    player.previousX = player.x;
    player.previousZ = player.z;
    player.x += Math.sin(player.angle) * player.speed * dt;
    player.z += Math.cos(player.angle) * player.speed * dt;

    if (Math.abs(player.x) > 156) {
      player.x = clamp(player.x, -156, 156);
      player.speed *= 0.42;
    }
    if (Math.abs(player.z) > 122) {
      player.z = clamp(player.z, -122, 122);
      player.speed *= 0.42;
    }

    player.projection = projectToTrack(player.x, player.z);
    updatePlayerLiveProgress();
    const nowOnRoad = player.projection.distance <= TRACK_HALF;
    if (nowOnRoad) {
      player.offRoadTime = 0;
      player.lastRoadS = player.projection.s;
    } else {
      player.offRoadTime += dt;
      if (Math.abs(player.speed) > 4 && Math.random() < dt * 18) spawnDust(player.x, player.z, player.angle);
    }

    if (player.offRoadTime > 3.6 && player.projection.distance > TRACK_HALF + 6.8) {
      respawnPlayer();
      return;
    }
    updatePlayerLap();
  }

  function updateAutoPlayer(dt) {
    if (player.finishTime !== null) return;
    const near = pointAtDistance(player.autoDistance + 2.3);
    const far = pointAtDistance(player.autoDistance + 8.5);
    const curve = Math.abs(angleDifference(Math.atan2(far.tx, far.tz), Math.atan2(near.tx, near.tz)));
    const targetSpeed = clamp(18.1 - curve * 5.3, 12.8, 18.1);
    player.speed += clamp(targetSpeed - player.speed, -11.5 * dt, 8.8 * dt);
    player.previousX = player.x;
    player.previousZ = player.z;
    player.autoDistance += player.speed * dt;
    const p = pointAtDistance(player.autoDistance, 0);
    const nextAngle = Math.atan2(p.tx, p.tz);
    player.steerVisual = clamp(angleDifference(nextAngle, player.angle) * 4, -1, 1);
    player.x = p.x;
    player.z = p.z;
    player.angle = nextAngle;
    player.projection = projectToTrack(player.x, player.z);
    updatePlayerLiveProgress();
    player.maxRecordedSpeed = Math.max(player.maxRecordedSpeed, player.speed);
    updatePlayerLap();
  }

  function updatePlayerLap() {
    if (player.finishTime !== null) return;
    const gate = track.gates[player.nextGate];
    if (!crossedGateForward(player, gate)) return;

    player.lastGate = player.nextGate;
    if (player.nextGate === 0) {
      player.lap += 1;
      const lapTime = raceTime - player.lapStartTime;
      player.lapTimes.push(lapTime);
      player.lapStartTime = raceTime;
      if (player.lap >= LAPS_TO_WIN) {
        player.finishTime = raceTime;
        player.speed *= 0.72;
        showToast("Ziel! Die Gegner beenden noch ihre Runde.");
      } else {
        showToast(`Runde ${player.lap} geschafft · ${formatTime(lapTime)}`);
      }
    }
    player.nextGate = (player.nextGate + 1) % GATE_COUNT;
  }

  function updatePlayerLiveProgress() {
    const projectedS = player.projection.s;
    const delta = signedWrappedDistance(projectedS - player.lastProjectionS, track.length);
    const plausibleStep = Math.max(1.2, Math.abs(player.speed) * FIXED_STEP * 4 + 0.5);
    if (Math.abs(delta) <= plausibleStep) {
      player.liveDistance = clamp(
        player.liveDistance + delta,
        0,
        LAPS_TO_WIN * track.length
      );
    }
    player.lastProjectionS = projectedS;
  }

  function crossedGateForward(car, gate) {
    const oldDX = car.previousX - gate.x;
    const oldDZ = car.previousZ - gate.z;
    const newDX = car.x - gate.x;
    const newDZ = car.z - gate.z;
    const before = oldDX * gate.tx + oldDZ * gate.tz;
    const after = newDX * gate.tx + newDZ * gate.tz;
    if (!(before < 0 && after >= 0)) return false;
    const mix = before / (before - after || 1);
    const hitX = lerp(car.previousX, car.x, mix);
    const hitZ = lerp(car.previousZ, car.z, mix);
    const lateral = (hitX - gate.x) * gate.nx + (hitZ - gate.z) * gate.nz;
    return Math.abs(lateral) <= TRACK_HALF * 0.95;
  }

  function updateBot(bot, dt) {
    bot.previousX = bot.x;
    bot.previousZ = bot.z;

    if (bot.finishTime !== null) {
      bot.speed *= Math.exp(-1.7 * dt);
      bot.distance += bot.speed * dt;
    } else {
      const near = pointAtDistance(bot.distance + 2.0);
      const far = pointAtDistance(bot.distance + 9.2);
      const curve = Math.abs(angleDifference(Math.atan2(far.tx, far.tz), Math.atan2(near.tx, near.tz)));
      const rhythm = Math.sin(raceTime * 0.72 + bot.seed) * 0.25 + Math.sin(bot.distance * 0.19 + bot.seed) * 0.22;
      const targetSpeed = clamp(bot.topSpeed - curve * 6.5 + rhythm, 11.4, bot.topSpeed + 0.2);
      const change = targetSpeed > bot.speed ? 8.1 : 13.5;
      bot.speed += clamp(targetSpeed - bot.speed, -change * dt, change * dt);
      bot.distance += bot.speed * dt;
      bot.maxRecordedSpeed = Math.max(bot.maxRecordedSpeed, bot.speed);

      while (bot.lap < LAPS_TO_WIN && bot.distance >= (bot.lap + 1) * track.length) {
        bot.lap += 1;
        bot.lapTimes.push(raceTime - bot.lapStartTime);
        bot.lapStartTime = raceTime;
        if (bot.lap >= LAPS_TO_WIN) bot.finishTime = raceTime;
      }
    }

    const laneWobble = Math.sin(bot.distance * 0.15 + bot.seed) * 0.13;
    const p = pointAtDistance(bot.distance, bot.lane + laneWobble);
    const nextAngle = Math.atan2(p.tx, p.tz);
    bot.steerVisual += (clamp(angleDifference(nextAngle, bot.angle) * 4.5, -1, 1) - bot.steerVisual) * (1 - Math.exp(-8 * dt));
    bot.x = p.x;
    bot.z = p.z;
    bot.angle = nextAngle;
  }

  function updateRaceDistances() {
    if (player.finishTime !== null) {
      player.raceDistance = LAPS_TO_WIN * track.length;
    } else {
      player.raceDistance = clamp(
        Math.max(player.liveDistance, player.lap * track.length),
        0,
        LAPS_TO_WIN * track.length - 0.001
      );
    }
    bots.forEach((bot) => {
      bot.raceDistance = bot.finishTime !== null
        ? LAPS_TO_WIN * track.length
        : clamp(bot.distance, 0, LAPS_TO_WIN * track.length);
    });
  }

  function resolvePlayerBotContacts() {
    if (player.finishTime !== null) return;
    bots.forEach((bot) => {
      const dx = player.x - bot.x;
      const dz = player.z - bot.z;
      const distanceBetween = Math.hypot(dx, dz);
      if (distanceBetween > 0 && distanceBetween < 1.42) {
        const overlap = 1.42 - distanceBetween;
        player.x += dx / distanceBetween * overlap * 0.72;
        player.z += dz / distanceBetween * overlap * 0.72;
        player.speed *= 0.78;
        player.projection = projectToTrack(player.x, player.z);
      }
    });
  }

  function respawnPlayer() {
    const p = pointAtDistance(player.lastRoadS - 0.7);
    player.x = p.x;
    player.z = p.z;
    player.previousX = p.x;
    player.previousZ = p.z;
    player.angle = Math.atan2(p.tx, p.tz);
    player.speed = 0;
    player.projection = projectToTrack(p.x, p.z);
    player.lastProjectionS = player.projection.s;
    player.offRoadTime = 0;
    syncKartMeshes(0);
    snapChaseCamera();
    showToast("Zurück auf die Strecke");
  }

  function getStandings() {
    return cars.slice().sort((a, b) => {
      if (a.finishTime !== null && b.finishTime !== null) return a.finishTime - b.finishTime;
      if (a.finishTime !== null) return -1;
      if (b.finishTime !== null) return 1;
      if (Math.abs(a.raceDistance - b.raceDistance) < 0.0001) return cars.indexOf(a) - cars.indexOf(b);
      return b.raceDistance - a.raceDistance;
    });
  }

  function showResults() {
    phase = "results";
    clearControls();
    touchControls.hidden = true;
    const ranking = getStandings();
    const rank = ranking.indexOf(player) + 1;
    const titles = ["Du holst den 3D-Pokal!", "Knapp am Sieg vorbei!", "Stark bis ins Ziel!"];
    resultBadge.textContent = `${rank}.`;
    resultEyebrow.textContent = rank === 1 ? "SIEG IM MINI KART CUP 3D" : "RENNEN BEENDET";
    resultTitle.textContent = titles[rank - 1];
    resultTime.textContent = formatTime(player.finishTime);
    resultRows.innerHTML = ranking.map((car, index) => {
      const bestLap = Math.min(...car.lapTimes);
      return `
        <tr class="${car.id === "player" ? "is-player" : ""}">
          <td>${index + 1}.</td>
          <td><span class="driver-name"><i style="background:${car.color}"></i>${car.name}</span></td>
          <td>${formatTime(car.finishTime)}</td>
          <td>${formatTime(bestLap)}</td>
          <td>${Math.round(averageSpeed(car))} km/h</td>
        </tr>`;
    }).join("");

    const bestPlayerLap = Math.min(...player.lapTimes);
    lapSummary.innerHTML = player.lapTimes.map((lap, index) => `
      <div class="lap-pill ${lap === bestPlayerLap ? "is-best" : ""}">
        Runde ${index + 1}<strong>${formatTime(lap)}</strong>
      </div>`).join("");
    hud.hidden = true;
    resultScreen.hidden = false;
    restartButton.focus();
  }

  function averageSpeed(car) {
    const meters = LAPS_TO_WIN * track.length * METERS_PER_UNIT;
    return car.finishTime > 0 ? meters / car.finishTime * 3.6 : 0;
  }

  function syncKartMeshes(dt) {
    cars.forEach((car) => {
      const mesh = kartMeshes.get(car.id);
      if (!mesh) return;
      mesh.position.set(car.x, 0.075, car.z);
      mesh.rotation.y = car.angle;
      const data = mesh.userData;
      data.visual.rotation.z = -car.steerVisual * Math.min(1, Math.abs(car.speed) / 11) * 0.055;
      data.wheelSpin += car.speed * dt / 0.29;
      data.tyres.forEach((tyre) => { tyre.rotation.y = data.wheelSpin; });
      data.frontPivots.forEach((pivot) => { pivot.rotation.y = car.steerVisual * 0.35; });
    });
    if (player && scenery.sun && scenery.sunTarget) {
      scenery.sun.position.set(player.x - 32, 46, player.z - 29);
      scenery.sunTarget.position.set(player.x, 0, player.z);
      scenery.sunTarget.updateMatrixWorld();
    }
  }

  function snapChaseCamera() {
    const forwardX = Math.sin(player.angle);
    const forwardZ = Math.cos(player.angle);
    camera.position.set(player.x - forwardX * 8.4, 4.9, player.z - forwardZ * 8.4);
    cameraLook.set(player.x + forwardX * 5.2, 0.95, player.z + forwardZ * 5.2);
    camera.lookAt(cameraLook);
    cameraReady = true;
  }

  function updateCamera(dt) {
    const desiredPosition = new THREE.Vector3();
    const desiredLook = new THREE.Vector3();
    let targetFov = 59;

    if (phase === "menu") {
      const orbit = sceneTime * 0.075 - 1.1;
      desiredPosition.set(Math.cos(orbit) * 130, 82, Math.sin(orbit) * 105);
      desiredLook.set(-3, 0.2, 0);
      targetFov = 55;
    } else if (phase === "results") {
      const finish = pointAtDistance(0);
      const orbit = sceneTime * 0.2;
      desiredPosition.set(finish.x + Math.cos(orbit) * 14, 7.5, finish.z + Math.sin(orbit) * 14);
      desiredLook.set(finish.x, 1.0, finish.z);
      targetFov = 56;
    } else {
      const forwardX = Math.sin(player.angle);
      const forwardZ = Math.cos(player.angle);
      const speedRatio = clamp(Math.abs(player.speed) / player.maxSpeed, 0, 1);
      const followDistance = 8.2 + speedRatio * 1.1;
      desiredPosition.set(
        player.x - forwardX * followDistance - Math.cos(player.angle) * player.steerVisual * 0.35,
        4.75 + speedRatio * 0.45,
        player.z - forwardZ * followDistance + Math.sin(player.angle) * player.steerVisual * 0.35
      );
      desiredLook.set(
        player.x + forwardX * (5.2 + speedRatio * 2.4),
        0.9,
        player.z + forwardZ * (5.2 + speedRatio * 2.4)
      );
      targetFov = 59 + speedRatio * 7;
    }

    if (!cameraReady) {
      camera.position.copy(desiredPosition);
      cameraLook.copy(desiredLook);
      cameraReady = true;
    } else {
      const positionMix = 1 - Math.exp(-5.4 * dt);
      const lookMix = 1 - Math.exp(-7.2 * dt);
      camera.position.lerp(desiredPosition, positionMix);
      cameraLook.lerp(desiredLook, lookMix);
    }
    camera.fov += (targetFov - camera.fov) * (1 - Math.exp(-3.8 * dt));
    camera.updateProjectionMatrix();
    camera.lookAt(cameraLook);
  }

  function updateHud() {
    if (!player) return;
    const ranking = getStandings();
    const rank = ranking.indexOf(player) + 1;
    lapValue.textContent = String(Math.min(LAPS_TO_WIN, player.lap + 1));
    positionValue.textContent = String(rank);
    timeValue.textContent = formatTime(player.finishTime ?? raceTime);
    const kph = Math.max(0, Math.round(Math.abs(player.speed) * 3.6));
    speedValue.textContent = String(kph);
    speedBar.style.width = `${clamp(kph / 76 * 100, 0, 100)}%`;
    standings.innerHTML = ranking.map((car, index) => {
      const status = car.finishTime !== null ? "ZIEL" : `R${Math.min(LAPS_TO_WIN, car.lap + 1)}`;
      return `
        <div class="standing-row ${car.id === "player" ? "is-player" : ""}">
          <span class="standing-rank">${index + 1}</span>
          <i class="standing-dot" style="background:${car.color}"></i>
          <span>${car.shortName}</span>
          <small class="standing-status">${status}</small>
        </div>`;
    }).join("");
  }

  function setCountdownLabel(label) {
    if (label === lastCountdownLabel) return;
    lastCountdownLabel = label;
    countdown.textContent = label;
    countdown.classList.toggle("go", label === "LOS!");
    countdown.style.animation = "none";
    void countdown.offsetWidth;
    countdown.style.animation = "";
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    trackToast.textContent = message;
    trackToast.classList.add("show");
    toastTimer = window.setTimeout(() => trackToast.classList.remove("show"), 2100);
  }

  function resizeRenderer() {
    const width = Math.max(1, gameShell.clientWidth);
    const height = Math.max(1, gameShell.clientHeight);
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function loop(timestamp) {
    const frameTime = Math.min(0.1, Math.max(0, (timestamp - lastTimestamp) / 1000));
    lastTimestamp = timestamp;
    accumulator += frameTime * debugTimeScale;
    let safety = 0;
    while (accumulator >= FIXED_STEP && safety < 30) {
      update(FIXED_STEP);
      accumulator -= FIXED_STEP;
      safety += 1;
    }
    if (safety >= 30) accumulator = 0;
    syncKartMeshes(frameTime);
    updateCamera(frameTime);
    if (phase === "racing" || phase === "countdown") updateHud();
    renderer.render(scene, camera);
    window.requestAnimationFrame(loop);
  }

  function keyForEvent(code) {
    if (code === "ArrowUp" || code === "KeyW") return "up";
    if (code === "ArrowDown" || code === "KeyS") return "down";
    if (code === "ArrowLeft" || code === "KeyA") return "left";
    if (code === "ArrowRight" || code === "KeyD") return "right";
    return null;
  }

  function clearControls() {
    Object.keys(controls).forEach((key) => { controls[key] = false; });
    document.querySelectorAll("[data-control].active").forEach((button) => button.classList.remove("active"));
  }

  function bindEvents() {
    startButton.addEventListener("click", () => startRace());
    restartButton.addEventListener("click", () => startRace());
    menuButton.addEventListener("click", showMenu);
    window.addEventListener("resize", resizeRenderer, { passive: true });
    window.addEventListener("blur", clearControls);
    document.addEventListener("visibilitychange", () => {
      clearControls();
      lastTimestamp = performance.now();
      accumulator = 0;
    });

    canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      showToast("3D-Darstellung kurz unterbrochen …");
    });
    canvas.addEventListener("webglcontextrestored", () => showToast("3D-Darstellung wiederhergestellt"));

    window.addEventListener("keydown", (event) => {
      const control = keyForEvent(event.code);
      if (control) {
        controls[control] = true;
        event.preventDefault();
      }
      if (event.code === "Enter" && phase === "menu") {
        startRace();
        event.preventDefault();
      } else if ((event.code === "Enter" || event.code === "KeyR") && phase === "results") {
        startRace();
        event.preventDefault();
      }
    }, { passive: false });

    window.addEventListener("keyup", (event) => {
      const control = keyForEvent(event.code);
      if (control) {
        controls[control] = false;
        event.preventDefault();
      }
    }, { passive: false });

    document.querySelectorAll("[data-control]").forEach((button) => {
      const control = button.dataset.control;
      const press = (event) => {
        event.preventDefault();
        button.setPointerCapture?.(event.pointerId);
        controls[control] = true;
        button.classList.add("active");
      };
      const release = (event) => {
        event.preventDefault();
        controls[control] = false;
        button.classList.remove("active");
      };
      button.addEventListener("pointerdown", press);
      button.addEventListener("pointerup", release);
      button.addEventListener("pointercancel", release);
      button.addEventListener("lostpointercapture", release);
    });
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "--:--.---";
    const milliseconds = Math.floor((seconds + 0.00001) * 1000);
    const minutes = Math.floor(milliseconds / 60000);
    const remainingSeconds = Math.floor((milliseconds % 60000) / 1000);
    const remainingMilliseconds = milliseconds % 1000;
    return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}.${String(remainingMilliseconds).padStart(3, "0")}`;
  }

  function lerp(a, b, mix) {
    return a + (b - a) * mix;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function mod(value, divisor) {
    return ((value % divisor) + divisor) % divisor;
  }

  function signedWrappedDistance(value, length) {
    return mod(value + length * 0.5, length) - length * 0.5;
  }

  function angleDifference(a, b) {
    return Math.atan2(Math.sin(a - b), Math.cos(a - b));
  }

  function mulberry32(seed) {
    return function random() {
      let value = seed += 0x6D2B79F5;
      value = Math.imul(value ^ value >>> 15, value | 1);
      value ^= value + Math.imul(value ^ value >>> 7, value | 61);
      return ((value ^ value >>> 14) >>> 0) / 4294967296;
    };
  }

  function showFatalError(message) {
    const intro = document.querySelector(".intro-copy");
    if (intro) intro.textContent = message;
    startButton.disabled = true;
    startButton.textContent = "3D nicht verfügbar";
  }

  function getSnapshot() {
    const playerMesh = kartMeshes.get("player");
    return {
      phase,
      renderer: "WebGL",
      raceTime: Number(raceTime.toFixed(3)),
      trackLength: Number(track.length.toFixed(2)),
      trees: scenery.treeCount,
      drawCalls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      cameraDistance: playerMesh ? Number(camera.position.distanceTo(playerMesh.position).toFixed(2)) : null,
      player: player ? {
        lap: player.lap,
        nextGate: player.nextGate,
        speed: Number(player.speed.toFixed(2)),
        finishTime: player.finishTime,
        onRoad: player.projection.distance <= TRACK_HALF,
        finite: [player.x, player.z, player.angle, player.speed].every(Number.isFinite)
      } : null,
      bots: bots.map((bot) => ({
        id: bot.id,
        lap: bot.lap,
        finishTime: bot.finishTime,
        speed: Number(bot.speed.toFixed(2)),
        finite: [bot.x, bot.z, bot.angle, bot.speed].every(Number.isFinite)
      })),
      standings: cars.length ? getStandings().map((car) => car.id) : []
    };
  }

  function runGeometryChecks() {
    const start = pointAtDistance(0);
    const wrapped = pointAtDistance(track.length);
    const seamError = Math.hypot(start.x - wrapped.x, start.z - wrapped.z);
    const positions = track.roadGeometry.attributes.position.array;
    let finite = true;
    for (let index = 0; index < positions.length; index += 1) {
      if (!Number.isFinite(positions[index])) {
        finite = false;
        break;
      }
    }
    return {
      closedTrackError: Number(seamError.toFixed(7)),
      trackSamples: track.nodes.length,
      gateCount: track.gates.length,
      trees: scenery.treeCount,
      roadVertices: track.roadGeometry.attributes.position.count,
      finiteGeometry: finite,
      valid: seamError < 0.0001 && track.gates.length === GATE_COUNT && scenery.treeCount >= 250 && finite
    };
  }

  window.__kartGame = Object.freeze({
    getSnapshot,
    runGeometryChecks,
    start: () => startRace(),
    testAutoplay: (timeScale = 8) => startRace({ autoPilot: true, timeScale })
  });

  ensureKartMeshes();
  resizeRenderer();
  resetRace();
  bindEvents();
  if (window.ResizeObserver) {
    resizeObserver = new ResizeObserver(resizeRenderer);
    resizeObserver.observe(gameShell);
  }
  window.requestAnimationFrame(loop);
})();
