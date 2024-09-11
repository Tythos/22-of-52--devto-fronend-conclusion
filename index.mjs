/**
 * index.mjs
 */

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const spatialScale = 5e-1;

window.app = {
    "renderer": null,
    "scene": null,
    "camera": null,
    "controls": null,
    "raycaster": null,
    "mouse_pos": new THREE.Vector2(0, 0)
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
    }
];

function buildPlanet(radius, initialPosition, angularVelocity, color) {
    const geometry = new THREE.SphereGeometry(1e2 * radius, 32, 32);
    const material = new THREE.MeshBasicMaterial({ "color": color });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
        spatialScale * initialPosition.x,
        spatialScale * initialPosition.y,
        spatialScale * initialPosition.z
    );
    return mesh;
}

function buildOrbitTrace(radius) {
    const points = [];
    const n = 1e2;
    for (var i = 0; i < (n + 1); i += 1) {
        const ang_rad = 2 * Math.PI * i / n;
        points.push(new THREE.Vector3(
            spatialScale * radius * Math.cos(ang_rad),
            spatialScale * radius * Math.sin(ang_rad),
            spatialScale * 0.0
        ));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
        "color": 0x555555
    });
    const line = new THREE.Line(geometry, material);
    return line;
}

function animate(time) {
    window.app.controls.update();
    window.app.renderer.render(window.app.scene, window.app.camera);
    window.app.raycaster.setFromCamera(window.app.mouse_pos, window.app.camera);
    const intersections = window.app.raycaster.intersectObjects(window.app.scene.children);
    if (intersections.length > 0) { console.log(intersections); }
}

function onPointerMove(event) {
    window.app.mouse_pos.x = (event.clientX / window.innerWidth) * 2 - 1;
    window.app.mouse_pos.y = (event.clientY / window.innerHeight) * 2 - 1;
}

function onWindowLoad(event) {
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
    const geometry = new THREE.SphereGeometry(7e5, 32, 32);
    const material = new THREE.MeshBasicMaterial({ "color": 0xffff55 });
    const mesh = new THREE.Mesh(geometry, material);
    window.app.scene.add(mesh);

    // planet constructor is: radius, initial position, angular velocity, color
    planets.forEach(p => {
        window.app.scene.add(buildPlanet(p.radius_km, new THREE.Vector3(p.semiMajorAxis_km, 0, 0), 2 * Math.PI / 86400 / p.orbitalPeriod_days, p.approximateColor_hex));
        window.app.scene.add(buildOrbitTrace(p.semiMajorAxis_km));
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
}

window.addEventListener("load", onWindowLoad);
