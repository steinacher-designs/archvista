import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
const r = new THREE.WebGLRenderer({ antialias: true }); r.setSize(innerWidth, innerHeight); document.body.appendChild(r.domElement);
const s = new THREE.Scene(); s.background = new THREE.Color("#8ab"); const c = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 100);
s.add(new THREE.HemisphereLight("#fff", "#444", 2)); const d = new THREE.DirectionalLight("#fff", 2); d.position.set(3, 5, 2); s.add(d);
const file = location.hash.slice(1) || "tree_a";
new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).load(`lib/models/${file}.glb`, (g) => {
  s.add(g.scene); const b = new THREE.Box3().setFromObject(g.scene); const ctr = b.getCenter(new THREE.Vector3()); const sz = b.getSize(new THREE.Vector3()).length();
  c.position.set(ctr.x + sz * 0.8, ctr.y + sz * 0.2, ctr.z + sz * 0.8); c.lookAt(ctr); r.render(s, c);
  (window as any).archvista = { renderOnce: async () => r.render(s, c) };
}, undefined, (e) => console.error("LOAD", e?.message ?? e));
