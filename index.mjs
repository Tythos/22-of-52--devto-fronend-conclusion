/**
 * index.mjs
 */

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import * as solarplanets from "solarplanets";
import CATALOG from "./standish_catalog.json?raw";

const spatialScale = 5e-1;
const RADIAL_SCALE = 2e2;
const MU_SUN_KM3PS2 = 1.327e11;

window.app = {
    "renderer": null,
    "scene": null,
    "camera": null,
    "controls": null,
    "raycaster": null,
    "mouse_pos": new THREE.Vector2(0, 0),
    "is_mouse_down": false,
    "catalog": {},
    "now": new Date()
};

const planets = [
    {
        "name": "Mercury",
        "radius_km": 2.4e3,
        "semiMajorAxis_km": 57.91e6,
        "orbitalPeriod_days": 87.9691,
        "approximateColor_hex": 0x666666
    }, {
        "name": "Venus",
        "radius_km": 6.051e3,
        "semiMajorAxis_km": 108.21e6,
        "orbitalPeriod_days": 224.701,
        "approximateColor_hex": 0xaaaa77
    }, {
        "name": "Earth",
        "radius_km": 6.3781e3,
        "semiMajorAxis_km": 1.49898023e8,
        "orbitalPeriod_days": 365.256,
        "approximateColor_hex": 0x33bb33
    }, {
        "name": "Mars",
        "radius_km": 3.389e3,
        "semiMajorAxis_km": 2.27939366e8,
        "orbitalPeriod_days": 686.980,
        "approximateColor_hex": 0xbb3333
    }, {
        "name": "Jupiter",
        "radius_km": 6.9911e4,
        "semiMajorAxis_km": 7.78479e8,
        "orbitalPeriod_days": 4332.59,
        "approximateColor_hex": 0xaa7722
    }, {
        "name": "Saturn",
        "radius_km": 5.8232e4,
        "semiMajorAxis_km": 1.43353e9,
        "orbitalPeriod_days": 10755.7,
        "approximateColor_hex": 0xccaa55
    }, {
        "name": "Uranus",
        "radius_km": 2.5362e4,
        "semiMajorAxis_km": 2.870972e9,
        "orbitalPeriod_days": 30688.5,
        "approximateColor_hex": 0x7777ff
    }, {
        "name": "Neptune",
        "radius_km": 2.4622e4,
        "semiMajorAxis_km": 4.50e9,
        "orbitalPeriod_days": 60195,
        "approximateColor_hex": 0x4422aa
    }
];

function buildPlanet(radius, initialPosition, angularVelocity, color, name) {
    const poe = window.app.catalog.hasOwnProperty(name.toLowerCase())
        ? window.app.catalog[name.toLowerCase()]
        : null;
    
    const geometry = new THREE.SphereGeometry(RADIAL_SCALE * radius, 32, 32);
    const material = new THREE.MeshBasicMaterial({ "color": color });
    const mesh = new THREE.Mesh(geometry, material);

    if (poe === null) {
        mesh.position.set(
            spatialScale * initialPosition.x,
            spatialScale * initialPosition.y,
            spatialScale * initialPosition.z
        );
    } else {
        const [r, _] = solarplanets.getRvFromElementsDatetime(poe, window.app.now);
        mesh.position.set(
            spatialScale * r[0],
            spatialScale * r[1],
            spatialScale * r[2]
        );
        mesh.name = name.toLowerCase();
        mesh.scale.set(2, 2, 2);
    }

    return mesh;
}

function getPeriodFromPoe(poe) {
    const au2km = 1.49597871e8;
    const T_s = 2 * Math.PI * Math.sqrt(Math.pow(poe.a_au * au2km, 3.0) / MU_SUN_KM3PS2);
    return T_s;
}

function buildOrbitTrace(radius, name) {
    const points = [];
    const n = 1e2;
    const poe = window.app.catalog.hasOwnProperty(name.toLowerCase())
        ? window.app.catalog[name.toLowerCase()]
        : null;

    if (poe === null) {
        for (var i = 0; i < (n + 1); i += 1) {
            const ang_rad = 2 * Math.PI * i / n;
            points.push(new THREE.Vector3(
                spatialScale * radius * Math.cos(ang_rad),
                spatialScale * radius * Math.sin(ang_rad),
                spatialScale * 0.0
            ));
        }
    } else {
        let T0 = window.app.now;
        let T_s = getPeriodFromPoe(poe);
        for (var i = 0; i < (n + 1); i += 1) {
            const t_dt = new Date(T0.valueOf() + T_s * 1e3 * i / n);
            const [r, _] = solarplanets.getRvFromElementsDatetime(poe, t_dt);
            points.push(new THREE.Vector3(
                spatialScale * r[0],
                spatialScale * r[1],
                spatialScale * r[2]              
            ));
        }
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
        "color": 0x555555
    });
    const line = new THREE.Line(geometry, material);
    return line;
}

function dialogOpen(name) {
    let dialog = window.document.body.querySelector(".Dialog");
    if (!dialog) {
        dialog = window.document.createElement("div");
        dialog.classList.add("Dialog");
        window.document.body.appendChild(dialog);
    }

    // query article content to populate dialog
    const article = window.document.body.querySelector(`article.planet.${name}`);
    if (!article) { return; }
    dialog.innerHTML = article.innerHTML;
    dialog.style.display = "block";
}

function dialogClose() {
    let dialog = window.document.body.querySelector(".Dialog");
    if (!dialog) { return; }
    dialog.style.display = "none";
}

function processCollision(intersection) {
    const name = intersection.object.name;
    const names = planets.map(p => p.name.toLowerCase());
    if (name !== "" && names.includes(name)) {
        // mouseover effects: change planet color, mouse cursor
        intersection.object.material.color.set(0xffffff);
        window.document.body.style.cursor = "pointer";
        if (window.app.is_mouse_down) {
            dialogOpen(name);
        }
        return true;
    }
    return false;
}

function animate(time) {
    window.app.controls.update();
    window.app.renderer.render(window.app.scene, window.app.camera);
    window.app.raycaster.setFromCamera(window.app.mouse_pos, window.app.camera);
    const intersections = window.app.raycaster.intersectObjects(window.app.scene.children);
    let nTriggered = 0;
    if (intersections.length > 0) {
        intersections.forEach(intersection => {
            nTriggered += processCollision(intersection)
                ? 1
                : 0;
        });
    }
    if (nTriggered == 0) {
        // reset state
        window.document.body.style.cursor = "inherit";
        planets.forEach(p => {
            const sgn = window.app.scene.getObjectByName(p.name.toLowerCase());
            if (sgn) {
                sgn.material.color.set(p.approximateColor_hex);
            }
        });
        dialogClose();
    }
}

function onPointerMove(event) {
    window.app.mouse_pos.x = (event.clientX / window.innerWidth) * 2 - 1;
    window.app.mouse_pos.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function onMouseDown(event) {
    window.app.is_mouse_down = true;
}

function onMouseUp(event) {
    window.app.is_mouse_down = false;
}

function onWindowLoad(event) {
    // parse catalog details
    window.app.catalog = JSON.parse(CATALOG);

    // camera instantiation
    const width = window.innerWidth;
    const height = window.innerHeight;
    window.app.camera = new THREE.PerspectiveCamera(60, width / height, 8e9, 8e3);
    window.app.camera.position.z = 1e7;
    window.app.camera.up.set(0, 0, 1.0);

    // scene instantiation
    window.app.scene = new THREE.Scene();
    window.app.scene.add(new THREE.AxesHelper(1e6));

    // construct sun manually
    const geometry = new THREE.SphereGeometry(1e1 * 7e5, 32, 32);
    const material = new THREE.MeshBasicMaterial({ "color": 0xffff55 });
    const mesh = new THREE.Mesh(geometry, material);
    window.app.scene.add(mesh);

    // planet constructor is: radius, initial position, angular velocity, color
    planets.forEach(p => {
        window.app.scene.add(buildPlanet(p.radius_km, new THREE.Vector3(p.semiMajorAxis_km, 0, 0), 2 * Math.PI / 86400 / p.orbitalPeriod_days, p.approximateColor_hex, p.name));
        window.app.scene.add(buildOrbitTrace(p.semiMajorAxis_km, p.name));
    });

    // renderer instantiation
    window.app.renderer = new THREE.WebGLRenderer({
        "antialias": true
    });
    window.app.renderer.setSize(width, height);
    window.app.renderer.setAnimationLoop(animate);
    document.body.appendChild(window.app.renderer.domElement);

    // controls instantiation
    window.app.controls = new OrbitControls(window.app.camera, window.app.renderer.domElement);
    window.app.raycaster = new THREE.Raycaster();
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
}

window.addEventListener("load", onWindowLoad);
