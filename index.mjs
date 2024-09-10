/**
 * index.mjs
 */

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const app = {
    "renderer": null,
    "scene": null,
    "camera": null,
    "controls": null
};

function animate(time) {
    const mesh = app.scene.children[0];
    mesh.rotation.x = time / 2000;
    mesh.rotation.y = time / 1000;
    app.controls.update();
    app.renderer.render(app.scene, app.camera);
}

function onWindowLoad(event) {
    const width = window.innerWidth;
    const height = window.innerHeight;
    app.camera = new THREE.PerspectiveCamera(70, width / height, 1e-3, 1e3);
    app.camera.position.z = 10;
    app.scene = new THREE.Scene();
    const geometry = new THREE.BoxGeometry(1.0, 1.0, 1.0);
    const material = new THREE.MeshNormalMaterial();
    const mesh = new THREE.Mesh(geometry, material);
    app.scene.add(mesh);
    app.scene.add(new THREE.AxesHelper(3));
    app.renderer = new THREE.WebGLRenderer({
        "antialias": true
    });
    app.renderer.setSize(width, height);
    app.renderer.setAnimationLoop(animate);
    app.controls = new OrbitControls(app.camera, app.renderer.domElement);
    document.body.appendChild(app.renderer.domElement);
}

window.addEventListener("load", onWindowLoad);
