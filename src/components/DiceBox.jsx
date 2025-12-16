import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const DiceBox = ({ rollTrigger }) => {
    const mountRef = useRef(null);
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);
    const rendererRef = useRef(null);
    const diceRefs = useRef([]);
    const physicsRef = useRef({ velocity: [], angularVelocity: [] });

    // --- TEXTURE GENERATOR FOR NUMBERS ---
    const createDiceTexture = (text, color = 'white', bgColor = 'transparent') => {
        const size = 128; // Higher res for text
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Background
        if (bgColor !== 'transparent') {
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, size, size);
        }

        // Text
        ctx.fillStyle = color;
        ctx.font = 'bold 60px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, size / 2, size / 2);

        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    };

    const createD6 = (size = 1) => {
        const materials = [
            new THREE.MeshStandardMaterial({ map: createDiceTexture('1', 'black', '#ffaaaa') }),
            new THREE.MeshStandardMaterial({ map: createDiceTexture('6', 'black', '#ffaaaa') }),
            new THREE.MeshStandardMaterial({ map: createDiceTexture('2', 'black', '#ffaaaa') }),
            new THREE.MeshStandardMaterial({ map: createDiceTexture('5', 'black', '#ffaaaa') }),
            new THREE.MeshStandardMaterial({ map: createDiceTexture('3', 'black', '#ffaaaa') }),
            new THREE.MeshStandardMaterial({ map: createDiceTexture('4', 'black', '#ffaaaa') }),
        ];
        const geometry = new THREE.BoxGeometry(size, size, size);
        return { geometry, material: materials };
    };

    const createD20 = (size = 1) => {
        const geometry = new THREE.IcosahedronGeometry(size * 0.8);
        // D20 mapping is complex, using a simple single texture for now or simple color
        // To show numbers properly on a D20 without UV mapping complex textures is hard in procedural code.
        // For now, let's use a simple approach: make it look like a crystal with a number floating or just geometric faces.
        // IMPROVEMENT: Use a single number texture repeated? Or try to map faces.
        // Let's stick to a solid color D20 for now but maybe adding a label sprite attached to it?
        // OR: Simpler - just put a number on the dice material itself?
        
        // Let's try to map a texture that has some numbers scattered.
        // Better yet, for this MVP, let's return a specific material.
        const material = new THREE.MeshStandardMaterial({ 
            color: 0x3333ff, 
            roughness: 0.2, 
            metalness: 0.1,
            flatShading: true
        });
        return { geometry, material };
    };

    useEffect(() => {
        if (!mountRef.current) return;

        // 1. SETUP
        const width = mountRef.current.clientWidth;
        const height = mountRef.current.clientHeight;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x111111); // Dark background
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
        camera.position.set(0, 10, 10);
        camera.lookAt(0, 0, 0);
        cameraRef.current = camera;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.shadowMap.enabled = true;
        mountRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // 2. LIGHTS
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(5, 10, 5);
        dirLight.castShadow = true;
        scene.add(dirLight);

        // 3. FLOOR (Invisible catcher)
        const floorGeo = new THREE.PlaneGeometry(20, 20);
        const floorMat = new THREE.ShadowMaterial({ opacity: 0.3 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -2;
        floor.receiveShadow = true;
        scene.add(floor);

        // 4. ANIMATION LOOP
        let animationId;
        const animate = () => {
            animationId = requestAnimationFrame(animate);

            // Simple Physics Simulation
            diceRefs.current.forEach((dice, i) => {
                if (dice.position.y > -1.5) {
                    physicsRef.current.velocity[i].y -= 0.02; // Gravity
                    
                    dice.position.add(physicsRef.current.velocity[i]);
                    dice.rotation.x += physicsRef.current.angularVelocity[i].x;
                    dice.rotation.y += physicsRef.current.angularVelocity[i].y;
                    dice.rotation.z += physicsRef.current.angularVelocity[i].z;

                    // Bounce floor
                    if (dice.position.y <= -1.5) {
                        dice.position.y = -1.5;
                        physicsRef.current.velocity[i].y *= -0.5; // Dampen
                        physicsRef.current.velocity[i].x *= 0.9; // Friction
                        physicsRef.current.velocity[i].z *= 0.9;
                        
                        // Stop if slow
                        if (Math.abs(physicsRef.current.velocity[i].y) < 0.01) {
                            physicsRef.current.velocity[i].y = 0;
                        }
                    }
                }
            });

            renderer.render(scene, camera);
        };
        animate();

        // Cleanup
        return () => {
            cancelAnimationFrame(animationId);
            if (mountRef.current && renderer.domElement) {
                mountRef.current.removeChild(renderer.domElement);
            }
            renderer.dispose();
        };
    }, []);

    // Handle Resize
    useEffect(() => {
        const handleResize = () => {
            if (!mountRef.current || !cameraRef.current || !rendererRef.current) return;
            const w = mountRef.current.clientWidth;
            const h = mountRef.current.clientHeight;
            cameraRef.current.aspect = w / h;
            cameraRef.current.updateProjectionMatrix();
            rendererRef.current.setSize(w, h);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // ROLL TRIGGER
    useEffect(() => {
        if (rollTrigger && sceneRef.current) {
            rollDice(rollTrigger);
        }
    }, [rollTrigger]);

    const rollDice = (diceConfig) => {
        // Clear old dice
        diceRefs.current.forEach(d => sceneRef.current.remove(d));
        diceRefs.current = [];
        physicsRef.current = { velocity: [], angularVelocity: [] };

        const { type = 'd20', count = 1 } = diceConfig;

        for (let i = 0; i < count; i++) {
            let mesh;
            
            if (type === 'd6') {
                const { geometry, material } = createD6();
                mesh = new THREE.Mesh(geometry, material);
            } else {
                const { geometry, material } = createD20();
                mesh = new THREE.Mesh(geometry, material);
                
                // Add a text sprite inside/above the D20 to show a "result" number? 
                // Or just rely on flat shading for now since UV mapping a D20 procedurally is tricky.
                // Let's add wireframe to make it look cooler at least.
                const wireframe = new THREE.LineSegments(
                    new THREE.WireframeGeometry(geometry),
                    new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 })
                );
                mesh.add(wireframe);
            }
            
            // Random start pos above
            mesh.position.set((Math.random() - 0.5) * 2, 3 + Math.random() * 2, (Math.random() - 0.5) * 2);
            mesh.castShadow = true;
            
            sceneRef.current.add(mesh);
            diceRefs.current.push(mesh);

            // Initial Velocity (Throw)
            physicsRef.current.velocity.push(new THREE.Vector3(
                (Math.random() - 0.5) * 0.1,
                0,
                (Math.random() - 0.5) * 0.1
            ));
            
            // Initial Spin
            physicsRef.current.angularVelocity.push(new THREE.Vector3(
                Math.random() * 0.2,
                Math.random() * 0.2,
                Math.random() * 0.2
            ));
        }
    };

    return <div ref={mountRef} className="w-full h-full" />;
};

export default DiceBox;

