import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import * as THREE from 'three';
import { campaignApi } from '../services/api';
import VoiceInput from '../components/VoiceInput';
import CharacterCreationModal from '../components/CharacterCreationModal';

// --- UTILS ---
const generatePixelTexture = (type) => {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // Fill background
    ctx.fillStyle = type === 'stone' ? '#3a3b3c' : type === 'grass' ? '#2a4a2a' : '#5a3a2a';
    ctx.fillRect(0, 0, size, size);

    // Add noise/details
    for (let i = 0; i < 400; i++) {
        const x = Math.floor(Math.random() * size);
        const y = Math.floor(Math.random() * size);
        const w = Math.floor(Math.random() * 3) + 1;
        const h = Math.floor(Math.random() * 3) + 1;
        
        ctx.fillStyle = type === 'stone' 
            ? (Math.random() > 0.5 ? '#4a4b4c' : '#2a2b2c') 
            : type === 'grass' ? '#3a5a3a' : '#4a2a1a';
        ctx.fillRect(x, y, w, h);
    }

    // Brick pattern for stone
    if (type === 'stone') {
        ctx.strokeStyle = '#202020';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for(let y=0; y<=size; y+=16) {
            ctx.moveTo(0, y);
            ctx.lineTo(size, y);
        }
        for(let x=0; x<=size; x+=16) {
            for(let y=0; y<=size; y+=16) {
                if ((y/16)%2 === 0) ctx.moveTo(x, y);
                else ctx.moveTo(x+8, y);
                ctx.lineTo(x, y+16);
            }
        }
        ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    return texture;
};

const disposeScene = (scene) => {
    const geometries = new Set();
    const materials = new Set();
    const textures = new Set();

    scene.traverse((object) => {
        if (object.geometry) geometries.add(object.geometry);
        if (object.shadow?.map) textures.add(object.shadow.map);
        const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
        objectMaterials.filter(Boolean).forEach((material) => {
            materials.add(material);
            Object.values(material).forEach((value) => {
                if (value?.isTexture) textures.add(value);
            });
        });
    });

    textures.forEach((texture) => texture.dispose());
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
};

export default function CampaignPlayPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [campaign, setCampaign] = useState(null);
    const [session, setSession] = useState(null);
    const [showCharacterCreation, setShowCharacterCreation] = useState(true);
    const [loading, setLoading] = useState(true);
    const [pageError, setPageError] = useState('');
    const [savingCharacter, setSavingCharacter] = useState(false);
    
    const mountRef = useRef(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setPageError('');

        Promise.all([campaignApi.get(id), campaignApi.getSession(id)])
            .then(async ([campaignData, sessionData]) => {
                if (cancelled) return;
                let loadedSession = sessionData;

                if (!loadedSession.characterSheet) {
                    try {
                        const legacyCharacter = JSON.parse(localStorage.getItem(`character_${id}`) || 'null');
                        if (legacyCharacter) {
                            loadedSession = await campaignApi.saveCharacterSheet(id, legacyCharacter);
                            localStorage.removeItem(`character_${id}`);
                        }
                    } catch (error) {
                        console.error('Unable to migrate the local character sheet:', error);
                    }
                }

                if (cancelled) return;
                setCampaign(campaignData);
                setSession(loadedSession);
                setShowCharacterCreation(!loadedSession.characterSheet);
            })
            .catch((error) => {
                if (!cancelled) setPageError(error.message || 'Impossible de charger la campagne.');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => { cancelled = true; };
    }, [id]);

    const handleCharacterCreate = async (newCharacter) => {
        setSavingCharacter(true);
        setPageError('');
        try {
            const updatedSession = await campaignApi.saveCharacterSheet(id, newCharacter);
            setSession(updatedSession);
            setShowCharacterCreation(false);
        } catch (error) {
            setPageError(error.message || 'Impossible de sauvegarder le personnage.');
        } finally {
            setSavingCharacter(false);
        }
    };

    useEffect(() => {
        if (!mountRef.current) return;

        // --- SCENE SETUP ---
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x050510); // Dark blue void
        scene.fog = new THREE.FogExp2(0x050510, 0.02); // Reduced fog density for better visibility

        // --- CAMERA ---
        const aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
        const camera = new THREE.PerspectiveCamera(35, aspect, 0.1, 1000);
        camera.position.set(20, 20, 20);
        camera.lookAt(0, 0, 0);

        const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
        renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.domElement.style.imageRendering = 'pixelated'; // CSS crispness
        mountRef.current.appendChild(renderer.domElement);

        // --- ASSETS ---
        const stoneTex = generatePixelTexture('stone');
        
        // --- LIGHTING ---
        const ambientLight = new THREE.AmbientLight(0x404060, 1.5); 
        scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xaaccff, 0.8);
        dirLight.position.set(-10, 20, -10);
        dirLight.castShadow = true;
        scene.add(dirLight);

        // Warm Torches
        const torches = [];
        const createTorch = (x, z) => {
            const light = new THREE.PointLight(0xffaa00, 2, 10);
            light.position.set(x, 2.5, z);
            light.castShadow = true;
            light.shadow.bias = -0.001;
            scene.add(light);
            
            const geo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
            const mat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.copy(light.position);
            scene.add(mesh);
            
            torches.push({ light, mesh, baseIntensity: 2, timeOffset: Math.random() * 100 });
        };

        createTorch(3, 3);
        createTorch(-3, -2);
        createTorch(0, -4);

        // --- WORLD GENERATION (InstancedMesh) ---
        const gridSize = 12;
        const boxGeo = new THREE.BoxGeometry(1, 1, 1);
        
        const floorMat = new THREE.MeshStandardMaterial({ 
            map: stoneTex, roughness: 0.9, metalness: 0.1 
        });
        const floorMesh = new THREE.InstancedMesh(boxGeo, floorMat, gridSize * gridSize);
        floorMesh.receiveShadow = true;
        
        let idx = 0;
        const dummy = new THREE.Object3D();
        for(let x = -gridSize/2; x < gridSize/2; x++) {
            for(let z = -gridSize/2; z < gridSize/2; z++) {
                dummy.position.set(x, 0, z);
                dummy.position.y = Math.random() * -0.05; 
                dummy.updateMatrix();
                floorMesh.setMatrixAt(idx++, dummy.matrix);
            }
        }
        scene.add(floorMesh);

        // Walls / Ruins
        const wallMat = new THREE.MeshStandardMaterial({ 
            map: stoneTex, roughness: 0.8 
        });
        const wallMesh = new THREE.InstancedMesh(boxGeo, wallMat, 100);
        wallMesh.castShadow = true;
        wallMesh.receiveShadow = true;
        
        let wallIdx = 0;
        for(let x = -5; x <= 5; x++) {
            if (Math.random() > 0.7) continue; 
            for(let h = 1; h <= (Math.random() > 0.5 ? 2 : 1); h++) {
                dummy.position.set(x, h, -5);
                dummy.updateMatrix();
                wallMesh.setMatrixAt(wallIdx++, dummy.matrix);
            }
        }
        wallMesh.count = wallIdx;
        scene.add(wallMesh);

        // --- ANIMATION LOOP ---
        const clock = new THREE.Clock();
        let animationId;
        
        const animate = () => {
            animationId = requestAnimationFrame(animate);
            const time = clock.getElapsedTime();

            torches.forEach(t => {
                t.light.intensity = t.baseIntensity + Math.sin(time * 10 + t.timeOffset) * 0.5 + Math.cos(time * 23) * 0.2;
                t.mesh.position.y = 2.5 + Math.sin(time * 5 + t.timeOffset) * 0.05;
            });

            camera.position.x = 20 + Math.sin(time * 0.2) * 2;
            camera.lookAt(0, 0, 0);

            renderer.render(scene, camera);
        };
        animate();

        const resizeObserver = new ResizeObserver(([entry]) => {
            if (!entry) return;
            const w = Math.max(1, entry.contentRect.width);
            const h = Math.max(1, entry.contentRect.height);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        });
        resizeObserver.observe(mountRef.current);

        return () => {
            cancelAnimationFrame(animationId);
            resizeObserver.disconnect();
            renderer.domElement.remove();
            disposeScene(scene);
            renderer.renderLists.dispose();
            renderer.dispose();
            renderer.forceContextLoss();
        };
    }, []);

    if (loading) return <div className="p-10 text-center">Chargement de la campagne...</div>;
    if (!campaign || !session) return <div className="p-10 text-center">{pageError || 'Campagne introuvable'}</div>;

    return (
        <div className="h-screen w-full bg-zinc-950 relative overflow-hidden">
            
            {/* 3D Background */}
            <div ref={mountRef} className="absolute inset-0 z-0" />
            
            {/* Overlay Gradient */}
            <div className="absolute inset-0 bg-black/60 z-10 pointer-events-none"></div>

            {/* Content Layer */}
            <div className="relative z-20 h-full flex flex-col">
                <div className="absolute top-2 left-2 md:top-4 md:left-4">
                    <button
                        onClick={() => navigate('/')}
                        aria-label="Retour au menu des campagnes"
                        className="flex items-center gap-2 rounded border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-white transition hover:bg-indigo-600"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span className="hidden text-sm sm:inline">Menu</span>
                    </button>
                </div>

                <div className="flex-1 flex items-center justify-center p-2 md:p-8 h-full overflow-hidden">
                    {/* Si on a un personnage, on affiche l'interface de jeu. Sinon le modal de création. */}
                    {!showCharacterCreation && session.characterSheet ? (
                        <div className="w-full max-w-7xl h-full animate-in fade-in duration-700 slide-in-from-bottom-4">
                            <VoiceInput
                                campaignId={id}
                                initialCharacterSheet={session.characterSheet}
                                initialConversation={session.conversation}
                            />
                        </div>
                    ) : (
                        <CharacterCreationModal onCreate={handleCharacterCreate} isSaving={savingCharacter} />
                    )}
                    {pageError && <p className="absolute bottom-4 left-4 right-4 text-center text-sm text-red-300">{pageError}</p>}
                </div>
            </div>
        </div>
    );
}
