import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, MessageSquare, Shield, Heart, Coins, Backpack, Sword, Dices, FastForward } from 'lucide-react';
import DiceBox from './DiceBox';
import { useParams } from 'react-router-dom';

const TypewriterText = ({ text, onComplete, isNew, onSkip }) => {
    const [displayedText, setDisplayedText] = useState(isNew ? '' : text);
    const [isSkipped, setIsSkipped] = useState(!isNew);
    const indexRef = useRef(0);

    useEffect(() => {
        if (!isNew || isSkipped) {
            setDisplayedText(text);
            onComplete?.();
            return;
        }

        const interval = setInterval(() => {
            if (indexRef.current < text.length) {
                setDisplayedText(prev => prev + text.charAt(indexRef.current));
                indexRef.current++;
            } else {
                clearInterval(interval);
                onComplete?.();
            }
        }, 30); // Vitesse de frappe (~30ms par caractère)

        return () => clearInterval(interval);
    }, [text, isNew, isSkipped, onComplete]);

    // Fonction de formatage locale pour gérer le rendu progressif
    const formatContent = (content) => {
        if (!content) return null;
        return content.split('\n').map((line, i) => {
            const trimmed = line.trim();
            if (!trimmed) return <div key={i} className="h-2" />;
            
            if (trimmed.match(/^[-*•]\s/) || trimmed.match(/^\d+\.\s/)) {
                return (
                    <div key={i} className="my-2 ml-2 md:ml-4 p-3 bg-black/40 border-l-4 border-indigo-500 rounded-r-lg text-indigo-100 shadow-sm hover:bg-zinc-900/60 transition-colors font-sans animate-in slide-in-from-left-2 fade-in duration-300">
                        {line}
                    </div>
                );
            }
            return <p key={i} className="mb-2">{line}</p>;
        });
    };

    return (
        <div className="relative group">
            {formatContent(displayedText)}
            {isNew && !isSkipped && displayedText.length < text.length && (
                <button 
                    onClick={() => { setIsSkipped(true); onSkip?.(); }}
                    className="absolute bottom-0 right-0 translate-y-full bg-zinc-800 text-xs px-2 py-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-700 flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <FastForward className="w-3 h-3" /> Passer
                </button>
            )}
        </div>
    );
};

const VoiceInput = ({ initialCharacterSheet, initialHistory }) => {
  const { id: campaignId } = useParams(); // Récupérer l'ID de la campagne depuis l'URL
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Initialiser la conversation avec l'historique chargé si présent
  const [conversation, setConversation] = useState(
      initialHistory ? initialHistory.map(msg => ({
          type: msg.role === 'user' ? 'user' : 'ai',
          text: msg.content,
          isNew: false // Marquer les anciens messages comme non-nouveaux
      })) : []
  );
  
  const [summary, setSummary] = useState(""); 
  const [characterSheet, setCharacterSheet] = useState(initialCharacterSheet || null); 
  const [diceRoll, setDiceRoll] = useState(null); 
  
  const [mobileTab, setMobileTab] = useState('chat');

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const chatContainerRef = useRef(null);
  const audioRef = useRef(null); // Référence pour l'objet Audio

  // Scroll auto quand la conversation change
  useEffect(() => {
    if(chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [conversation.length]);

  const stopAudio = () => {
      if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
      }
  };

  const startRecording = async () => {
    stopAudio(); // Arrêter l'audio précédent si on parle
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = handleStop;
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Erreur micro", err);
      alert("Impossible d'accéder au micro. Vérifiez vos permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleStop = async () => {
    const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
    setIsProcessing(true);

    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    
    // On envoie l'ID de la campagne pour la persistance
    if (campaignId) {
        formData.append('campaignId', campaignId);
    }

    const historyToSend = conversation.slice(-10).map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.text
    }));
    formData.append('history', JSON.stringify(historyToSend));
    formData.append('summary', summary);
    if(characterSheet) {
        formData.append('characterSheet', JSON.stringify(characterSheet));
    }

    try {
      const response = await fetch('/api/voice/chat', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Erreur réseau');

      const data = await response.json();
      
      setConversation(prev => [
        ...prev,
        { type: 'user', text: data.userText, isNew: true },
        { type: 'ai', text: data.aiResponse, isNew: true } // Marquer comme nouveau pour l'animation
      ]);

      if (data.newSummary) setSummary(data.newSummary);
      if (data.characterSheet) setCharacterSheet(data.characterSheet);
      
      // Jouer l'audio du MJ
      if (data.audio) {
          stopAudio();
          try {
              const audio = new Audio(`data:audio/mp3;base64,${data.audio}`);
              audioRef.current = audio;
              audio.play();
          } catch (e) {
              console.error("Erreur lecture audio:", e);
          }
      }

      if (data.diceRoll) setDiceRoll(data.diceRoll);

    } catch (error) {
      console.error("Erreur:", error);
      setConversation(prev => [...prev, { type: 'error', text: "Erreur de communication avec le MJ." }]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl max-w-7xl mx-auto mb-4 h-[85vh] flex flex-col relative">
      
      {/* MOBILE TABS HEADER */}
      <div className="md:hidden flex border-b border-zinc-800 bg-black z-30 relative shrink-0">
        <button onClick={() => setMobileTab('dice')} className={`flex-1 p-3 flex justify-center items-center gap-2 text-sm font-bold ${mobileTab === 'dice' ? 'text-indigo-400 bg-zinc-900' : 'text-zinc-500'}`}><Dices className="w-4 h-4" /> Dés</button>
        <button onClick={() => setMobileTab('chat')} className={`flex-1 p-3 flex justify-center items-center gap-2 text-sm font-bold ${mobileTab === 'chat' ? 'text-indigo-400 bg-zinc-900' : 'text-zinc-500'}`}><MessageSquare className="w-4 h-4" /> Jeu</button>
        <button onClick={() => setMobileTab('character')} className={`flex-1 p-3 flex justify-center items-center gap-2 text-sm font-bold ${mobileTab === 'character' ? 'text-indigo-400 bg-zinc-900' : 'text-zinc-500'}`}><Shield className="w-4 h-4" /> Perso</button>
      </div>

      <div className="flex flex-1 md:flex-row relative overflow-hidden">

      {/* COLONNE GAUCHE : DÉS (20%) */}
      <div className={`bg-black border-r border-zinc-800 flex flex-col h-full overflow-hidden ${mobileTab === 'dice' ? 'flex absolute z-20 inset-0 w-full md:relative md:z-0 md:w-[20%]' : 'hidden md:flex relative md:w-[20%]'}`}>
        <div className="absolute top-0 left-0 w-full p-4 z-10 bg-gradient-to-b from-black/80 to-transparent">
            <h3 className="text-zinc-400 font-serif tracking-widest text-xs uppercase flex items-center gap-2">
                <Dices className="w-4 h-4" /> Zone de Lancer
            </h3>
        </div>
        <div className="flex-1 w-full h-full">
            <DiceBox rollTrigger={diceRoll} />
        </div>
      </div>

      {/* COLONNE CENTRALE : DIALOGUE (55%) */}
      <div className={`flex flex-col bg-zinc-900/95 border-r border-zinc-800 h-full ${mobileTab === 'chat' ? 'flex absolute z-20 inset-0 w-full md:relative md:z-0 md:w-[55%]' : 'hidden md:flex relative md:w-[55%]'}`}>
        {/* Zone de chat */}
        <div 
            ref={chatContainerRef}
            className="flex-1 p-6 overflow-y-auto space-y-6 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent"
        >
            {conversation.length === 0 && (
                <div className="text-center mt-20 text-zinc-600">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="italic">Le silence règne...</p>
                    <p className="text-sm mt-2">Appuyez sur le bouton pour commencer l'aventure.</p>
                </div>
            )}

            {conversation.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[90%] p-4 rounded-2xl text-sm leading-relaxed shadow-lg ${
                        msg.type === 'user' 
                            ? 'bg-indigo-900/40 text-indigo-100 border border-indigo-800/50 rounded-br-none' 
                            : msg.type === 'error'
                                ? 'bg-red-900/20 text-red-400 border border-red-900'
                                : 'bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-bl-none font-serif'
                    }`}>
                        {msg.type === 'ai' && <span className="block text-xs text-zinc-500 mb-1 font-sans uppercase tracking-wider">Maître du Jeu</span>}
                        
                        {msg.type === 'ai' ? (
                            <TypewriterText 
                                text={msg.text} 
                                isNew={msg.isNew} 
                                onSkip={stopAudio}
                            />
                        ) : (
                            msg.text
                        )}
                    </div>
                </div>
            ))}

            {isProcessing && (
                <div className="flex justify-start animate-pulse">
                    <div className="bg-zinc-800 p-4 rounded-2xl rounded-bl-none border border-zinc-700 flex items-center gap-3">
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                        <span className="text-zinc-400 text-xs">Le MJ réfléchit...</span>
                    </div>
                </div>
            )}
        </div>

        {/* Barre de contrôles */}
        <div className="p-6 bg-black/40 border-t border-zinc-800 flex justify-center items-center gap-4 backdrop-blur-sm">
             {!isRecording ? (
                <button 
                    onClick={startRecording}
                    disabled={isProcessing}
                    className={`group relative flex items-center justify-center w-16 h-16 rounded-full transition-all ${
                        isProcessing 
                            ? 'bg-zinc-800 cursor-not-allowed' 
                            : 'bg-indigo-600 hover:bg-indigo-500 hover:scale-105 shadow-[0_0_20px_rgba(79,70,229,0.3)]'
                    }`}
                >
                    <Mic className={`w-6 h-6 text-white ${isProcessing ? 'opacity-50' : ''}`} />
                    {!isProcessing && <span className="absolute -top-10 bg-zinc-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Parler</span>}
                </button>
            ) : (
                <button 
                    onClick={stopRecording}
                    className="group relative flex items-center justify-center w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 hover:scale-105 transition-all shadow-[0_0_20px_rgba(239,68,68,0.4)] animate-pulse"
                >
                    <Square className="w-6 h-6 text-white fill-current" />
                    <span className="absolute -top-10 bg-red-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Arrêter</span>
                </button>
            )}
        </div>
      </div>

      {/* COLONNE DROITE : PERSONNAGE (25%) */}
      <div className={`bg-zinc-900/80 p-6 flex flex-col border-l border-black/50 overflow-y-auto h-full scrollbar-thin scrollbar-thumb-zinc-700 ${mobileTab === 'character' ? 'flex absolute z-20 inset-0 w-full md:relative md:z-0 md:w-[25%]' : 'hidden md:flex relative md:w-[25%]'}`}>
        <h3 className="text-zinc-400 font-serif tracking-widest text-xs uppercase mb-6 flex items-center gap-2 sticky top-0 bg-zinc-900/95 py-2 z-10 w-full">
            <Shield className="w-4 h-4" /> Fiche Personnage
        </h3>

        {characterSheet ? (
            <div className="space-y-6 animate-in fade-in duration-500">
                {/* Header Perso */}
                <div className="border-b border-zinc-700 pb-4">
                    <h2 className="text-xl font-bold text-indigo-100 font-serif">{characterSheet.name || "Inconnu"}</h2>
                    <p className="text-zinc-400 text-sm">{characterSheet.race} {characterSheet.class} (Niv. {characterSheet.level})</p>
                </div>

                {/* Stats Vitales */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-red-900/20 border border-red-900/50 p-3 rounded-lg flex flex-col items-center">
                        <Heart className="w-5 h-5 text-red-500 mb-1" />
                        <span className="text-lg font-bold text-red-100">
                            {characterSheet.hp_current ?? characterSheet.hp?.current ?? '?'}/{characterSheet.hp_max ?? characterSheet.hp?.max ?? '?'}
                        </span>
                        <span className="text-xs text-red-400">PV</span>
                    </div>
                    <div className="bg-amber-900/20 border border-amber-900/50 p-3 rounded-lg flex flex-col items-center">
                        <Coins className="w-5 h-5 text-amber-500 mb-1" />
                        <span className="text-lg font-bold text-amber-100">{characterSheet.gold}</span>
                        <span className="text-xs text-amber-400">Or</span>
                    </div>
                </div>

                {/* Attributs */}
                <div className="space-y-2">
                    <h4 className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Attributs</h4>
                    {characterSheet.stats && Object.entries(characterSheet.stats).map(([stat, val]) => (
                        <div key={stat} className="flex justify-between items-center bg-black/20 px-3 py-2 rounded border border-zinc-800">
                            <span className="text-zinc-400 capitalize text-sm">{stat}</span>
                            <span className="font-bold text-indigo-300">{val}</span>
                        </div>
                    ))}
                </div>

                {/* Inventaire */}
                <div>
                    <h4 className="text-xs text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Backpack className="w-3 h-3" /> Inventaire
                    </h4>
                    <div className="space-y-2">
                        {characterSheet.inventory && characterSheet.inventory.length > 0 ? (
                            characterSheet.inventory.map((item, i) => (
                                <div key={i} className="bg-zinc-800/50 px-3 py-2 rounded text-sm text-zinc-300 border border-zinc-800 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/50"></div>
                                    {item}
                                </div>
                            ))
                        ) : (
                            <p className="text-zinc-600 text-xs italic">Sac vide...</p>
                        )}
                    </div>
                </div>
            </div>
        ) : (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-600 text-center p-4 border-2 border-dashed border-zinc-800 rounded-xl">
                <Sword className="w-8 h-8 mb-3 opacity-20" />
                <p className="text-sm">Aucun personnage actif.</p>
                <p className="text-xs mt-2">Commencez l'aventure pour créer votre héros.</p>
            </div>
        )}
      </div>

      </div>
    </div>
  );
};

export default VoiceInput;
