import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, BookOpen } from 'lucide-react';
import * as THREE from 'three';
import { useAuth } from '../context/AuthContext';
import { campaignApi, characterApi } from '../services/api';
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

const CharacterSelectionModal = ({ characters, onSelect, onCreateNew }) => (
    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl max-w-lg w-full animate-in fade-in slide-in-from-bottom-4">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Users className="text-indigo-500" /> Choisir un Aventurier
        </h2>
        <p className="text-zinc-400 mb-6">Sélectionnez un personnage existant pour rejoindre cette aventure.</p>
        
        <div className="space-y-3 max-h-64 overflow-y-auto pr-2 mb-6 scrollbar-thin scrollbar-thumb-zinc-700">
            {characters.length === 0 ? (
                <p className="text-zinc-500 italic text-center py-4">Aucun personnage disponible.</p>
            ) : (
                characters.map(char => (
                    <button 
                        key={char.id}
                        onClick={() => onSelect(char)}
                        className="w-full flex justify-between items-center p-3 bg-black border border-zinc-800 rounded hover:border-indigo-500 hover:bg-zinc-900 transition-all group text-left"
                    >
                        <div>
                            <div className="font-bold text-indigo-100">{char.name}</div>
                            <div className="text-xs text-zinc-500">{char.race} {char.class} (Niv. {char.level})</div>
                        </div>
                        <span className="text-xs bg-indigo-900/30 text-indigo-400 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">Choisir</span>
                    </button>
                ))
            )}
        </div>

        <div className="flex flex-col gap-3 pt-4 border-t border-zinc-800">
            <button 
                onClick={onCreateNew}
                className="w-full py-3 bg-white text-black font-bold rounded hover:bg-zinc-200 transition-colors"
            >
                Créer un nouveau personnage
            </button>
        </div>
    </div>
);

export default function CampaignPlayPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { token } = useAuth();
    const [campaign, setCampaign] = useState(null);
    const [character, setCharacter] = useState(null);
    const [userCharacters, setUserCharacters] = useState([]);
    
    // 'selection' | 'creation' | 'play'
    const [mode, setMode] = useState('loading'); 
    
    const mountRef = useRef(null);

    // 1. Init: Check localStorage OR Load User Characters
    useEffect(() => {
        const init = async () => {
            try {
                // Load Campaign Info
                const camp = await campaignApi.get(token, id);
                setCampaign(camp);

                // Check LocalStorage first (Quick Resume)
                const savedChar = localStorage.getItem(`character_${id}`);
                if (savedChar) {
                    setCharacter(JSON.parse(savedChar));
                    setMode('play');
                    return;
                }

                // Load User Characters from DB
                const chars = await characterApi.list(token);
                setUserCharacters(chars);
                setMode('selection');

            } catch (err) {
                console.error("Error loading campaign data", err);
                navigate('/');
            }
        };
        if(token && id) init();
    }, [id, token, navigate]);

    const handleCharacterSelect = (char) => {
        // TODO: Lier le personnage à la campagne dans le backend (campaign_players)
        setCharacter(char);
        localStorage.setItem(`character_${id}`, JSON.stringify(char));
        setMode('play');
    };

    const handleCharacterCreate = async (newCharacterData) => {
        // 1. Save to DB
        try {
            // Si l'ID n'est pas présent (création locale via modal), on le crée en DB
            if (!newCharacterData.id) {
                const created = await characterApi.create(token, newCharacterData);
                newCharacterData = created;
            }
            
            setCharacter(newCharacterData);
            localStorage.setItem(`character_${id}`, JSON.stringify(newCharacterData));
            setMode('play');
        } catch(err) {
            console.error("Failed to create character", err);
        }
    };

    const handleCloseChapter = async () => {
        if (!window.confirm("Voulez-vous clôturer ce chapitre ?\n\n- L'IA générera un résumé de vos aventures.\n- L'historique du chat sera archivé.\n- Un nouveau chapitre commencera.")) return;
        
        try {
            await campaignApi.closeChapter(token, id);
            // Recharger la page pour repartir à zéro
            window.location.reload();
        } catch (e) {
            console.error(e);
            alert("Erreur lors de la clôture du chapitre");
        }
    };

    // 3D SCENE EFFECT
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
        
        const animate = () => {
            requestAnimationFrame(animate);
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

        const handleResize = () => {
            if (!mountRef.current) return;
            const w = mountRef.current.clientWidth;
            const h = mountRef.current.clientHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (mountRef.current) mountRef.current.removeChild(renderer.domElement);
            renderer.dispose();
        };
    }, []);

    if (mode === 'loading') return <div className="bg-black h-screen flex items-center justify-center text-white">Chargement du plan d'existence...</div>;
    
    // Get last chapter summary if history is empty
    const lastChapter = campaign?.chapters?.[campaign.chapters.length - 1];
    const initialSummary = (!campaign?.history || campaign.history.length === 0) ? (lastChapter?.summary || "") : "";

    return (
        <div className="h-screen w-full bg-zinc-950 relative overflow-hidden">
            
            {/* 3D Background */}
            <div ref={mountRef} className="absolute inset-0 z-0" />
            
            {/* Overlay Gradient */}
            <div className="absolute inset-0 bg-black/60 z-10 pointer-events-none"></div>

            {/* Content Layer */}
            <div className="relative z-20 h-full flex flex-col">
                <div className="absolute top-2 left-2 md:top-4 md:left-4 flex gap-2">
                    <button onClick={() => navigate('/')} className="bg-zinc-900/80 text-white p-2 rounded hover:bg-indigo-600 transition border border-zinc-700">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    {mode === 'play' && (
                        <button 
                            onClick={handleCloseChapter}
                            className="bg-zinc-900/80 text-indigo-400 p-2 rounded hover:bg-indigo-600 hover:text-white transition border border-zinc-700 flex items-center gap-2 text-sm font-medium"
                            title="Terminer le chapitre et archiver l'histoire"
                        >
                            <BookOpen className="w-4 h-4" /> <span className="hidden md:inline">Finir Chapitre</span>
                        </button>
                    )}
                </div>

                <div className="flex-1 flex items-center justify-center p-2 md:p-8 h-full overflow-hidden">
                    {/* SWITCH MODE */}
                    {mode === 'play' && character && (
                        <div className="w-full max-w-7xl h-full animate-in fade-in duration-700 slide-in-from-bottom-4">
                            <VoiceInput 
                                initialCharacterSheet={character} 
                                initialHistory={campaign?.history || []}
                                initialSummary={initialSummary}
                                audioEnabled={campaign?.audio_enabled}
                            />
                        </div>
                    )}

                    {mode === 'selection' && (
                        <CharacterSelectionModal 
                            characters={userCharacters} 
                            onSelect={handleCharacterSelect}
                            onCreateNew={() => setMode('creation')}
                        />
                    )}

                    {mode === 'creation' && (
                        <CharacterCreationModal onCreate={handleCharacterCreate} onCancel={() => setMode('selection')} />
                    )}
                </div>
            </div>
        </div>
    );
}
