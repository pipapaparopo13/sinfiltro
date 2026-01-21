"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
    createLibrary,
    getLibrary,
    updateLibrary,
    deleteLibrary,
    getLocalLibraries,
    saveLibraryToLocal,
    verifyLibraryPassword,
    CustomLibrary
} from "@/lib/customPrompts";

type ViewMode = 'home' | 'create' | 'join' | 'view' | 'edit';

export default function BibliotecaPage() {
    const [viewMode, setViewMode] = useState<ViewMode>('home');
    const [libraryName, setLibraryName] = useState('');
    const [libraryPassword, setLibraryPassword] = useState('');
    const [prompts, setPrompts] = useState<string[]>(['', '', '', '', '']);
    const [joinCode, setJoinCode] = useState('');
    const [viewPassword, setViewPassword] = useState('');
    const [currentLibrary, setCurrentLibrary] = useState<CustomLibrary | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [localLibraries, setLocalLibraries] = useState<{ code: string; name: string; addedAt: number }[]>([]);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [aiTopic, setAiTopic] = useState('');
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);
    const [aiResults, setAiResults] = useState<string[]>([]);

    useEffect(() => {
        setLocalLibraries(getLocalLibraries());
    }, []);

    const showMessage = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 4000);
    };

    const resetForm = () => {
        setLibraryName('');
        setLibraryPassword('');
        setPrompts(['', '', '', '', '']);
        setJoinCode('');
        setViewPassword('');
        setAiTopic('');
        setAiResults([]);
    };

    const goHome = () => {
        setViewMode('home');
        setCurrentLibrary(null);
        resetForm();
    };

    // ========== CREATE LIBRARY ==========
    const handleCreate = async () => {
        if (!libraryName.trim()) {
            showMessage('error', 'Dale un nombre a tu biblioteca');
            return;
        }
        if (!libraryPassword.trim()) {
            showMessage('error', 'Necesitas una contraseña');
            return;
        }
        const validPrompts = prompts.filter(p => p.trim());
        if (validPrompts.length < 3) {
            showMessage('error', 'Añade al menos 3 preguntas');
            return;
        }

        setIsLoading(true);
        const result = await createLibrary(libraryName, validPrompts, libraryPassword);
        setIsLoading(false);

        if (result.success && result.code) {
            showMessage('success', `¡Biblioteca creada! Código: ${result.code}`);
            setLocalLibraries(getLocalLibraries());
            await openLibrary(result.code);
        } else {
            showMessage('error', result.error || 'Error al crear');
        }
    };

    // ========== JOIN LIBRARY ==========
    const handleJoin = async () => {
        if (!joinCode.trim()) {
            showMessage('error', 'Introduce el código');
            return;
        }
        await openLibrary(joinCode);
    };

    // ========== OPEN LIBRARY ==========
    const openLibrary = async (code: string) => {
        setIsLoading(true);
        const library = await getLibrary(code);
        setIsLoading(false);

        if (library) {
            setCurrentLibrary(library);
            saveLibraryToLocal(library.id, library.name);
            setLocalLibraries(getLocalLibraries());
            setViewMode('view');
            resetForm();
        } else {
            showMessage('error', 'Biblioteca no encontrada');
        }
    };

    // ========== START EDIT ==========
    const startEdit = async () => {
        if (!currentLibrary) return;

        if (currentLibrary.passwordHash && !viewPassword) {
            showMessage('error', 'Introduce la contraseña para editar');
            return;
        }

        if (currentLibrary.passwordHash) {
            const isValid = await verifyLibraryPassword(currentLibrary.id, viewPassword);
            if (!isValid) {
                showMessage('error', 'Contraseña incorrecta');
                return;
            }
        }

        setLibraryName(currentLibrary.name);
        setPrompts([...currentLibrary.prompts, '', '']);
        setViewMode('edit');
    };

    // ========== SAVE EDIT ==========
    const saveEdit = async () => {
        if (!currentLibrary) return;

        const validPrompts = prompts.filter(p => p.trim());
        if (validPrompts.length < 3) {
            showMessage('error', 'Necesitas al menos 3 preguntas');
            return;
        }

        setIsLoading(true);
        const result = await updateLibrary(
            currentLibrary.id,
            { name: libraryName, prompts: validPrompts },
            viewPassword
        );
        setIsLoading(false);

        if (result.success) {
            showMessage('success', '¡Guardado!');
            await openLibrary(currentLibrary.id);
        } else {
            showMessage('error', result.error || 'Error al guardar');
        }
    };

    // ========== DELETE ==========
    const handleDelete = async () => {
        if (!currentLibrary) return;

        setIsLoading(true);
        const result = await deleteLibrary(currentLibrary.id, viewPassword);
        setIsLoading(false);

        if (result.success) {
            showMessage('success', 'Biblioteca eliminada');
            setLocalLibraries(getLocalLibraries());
            goHome();
        } else {
            showMessage('error', result.error || 'Error al eliminar');
        }
        setShowDeleteModal(false);
    };

    // ========== AI GENERATION ==========
    const generateAI = async () => {
        if (!aiTopic.trim()) {
            showMessage('error', 'Escribe un tema');
            return;
        }

        setIsGeneratingAi(true);
        try {
            const res = await fetch('/api/generate-prompts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic: aiTopic })
            });
            const data = await res.json();

            if (data.success && Array.isArray(data.prompts)) {
                setAiResults(data.prompts);
                showMessage('success', '¡Preguntas generadas! Haz clic para añadir');
            } else {
                showMessage('error', data.error || 'Error al generar');
            }
        } catch (e) {
            showMessage('error', 'Error de conexión');
        } finally {
            setIsGeneratingAi(false);
        }
    };

    const addAiPrompt = (prompt: string, index: number) => {
        const emptyIndex = prompts.findIndex(p => !p.trim());
        if (emptyIndex >= 0) {
            const newPrompts = [...prompts];
            newPrompts[emptyIndex] = prompt;
            setPrompts(newPrompts);
        } else {
            setPrompts([...prompts, prompt]);
        }
        setAiResults(aiResults.filter((_, i) => i !== index));
    };

    const updatePrompt = (index: number, value: string) => {
        const newPrompts = [...prompts];
        newPrompts[index] = value;
        setPrompts(newPrompts);
    };

    const removePrompt = (index: number) => {
        if (prompts.length > 3) {
            setPrompts(prompts.filter((_, i) => i !== index));
        }
    };

    return (
        <main className="min-h-screen bg-lobby p-3 sm:p-4 md:p-8">
            {/* Message Toast */}
            <AnimatePresence>
                {message && (
                    <motion.div
                        initial={{ opacity: 0, y: -50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 20, scale: 1 }}
                        exit={{ opacity: 0, y: -50, scale: 0.9 }}
                        className={`fixed top-0 left-1/2 -translate-x-1/2 z-50 px-8 py-4 rounded-2xl font-black text-lg shadow-2xl ${message.type === 'success'
                            ? 'bg-gradient-to-r from-green-400 to-green-600 text-white'
                            : 'bg-gradient-to-r from-red-400 to-red-600 text-white'
                            }`}
                    >
                        {message.text}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Back Arrow - Only when not on home */}
            {viewMode !== 'home' && (
                <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="mb-4"
                >
                    <button
                        onClick={goHome}
                        className="flex items-center gap-2 text-black/70 hover:text-black transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                        </svg>
                        <span className="font-bold text-sm">Volver</span>
                    </button>
                </motion.div>
            )}

            {/* Header */}
            <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="mb-6"
            >
                <div className="text-center">
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-black mb-2"
                        style={{
                            background: 'linear-gradient(135deg, #9333ea 0%, #ec4899 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            textShadow: '0 4px 20px rgba(147, 51, 234, 0.3)'
                        }}
                    >
                        🧪 Laboratorio de Caos
                    </h1>
                    <p className="text-sm sm:text-base text-black/70 font-bold px-4">
                        Crea preguntas épicas y juega con tus amigos
                    </p>
                </div>
            </motion.div>

            <div className="max-w-6xl mx-auto">
                {/* ========== HOME VIEW ========== */}
                {viewMode === 'home' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                    >
                        {/* Action Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Create Card */}
                            <motion.div
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setViewMode('create')}
                                className="glass-card p-6 sm:p-8 cursor-pointer bg-gradient-to-br from-green-100 to-emerald-100 border-4 border-green-400 active:border-green-600 transition-all"
                            >
                                <div className="text-5xl sm:text-6xl mb-3">➕</div>
                                <h2 className="text-2xl sm:text-3xl font-black text-black mb-2">Crear Nueva</h2>
                                <p className="text-base sm:text-lg text-black/70 font-semibold">
                                    Crea una biblioteca privada con contraseña
                                </p>
                            </motion.div>

                            {/* Join Card */}
                            <motion.div
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setViewMode('join')}
                                className="glass-card p-6 sm:p-8 cursor-pointer bg-gradient-to-br from-blue-100 to-indigo-100 border-4 border-blue-400 active:border-blue-600 transition-all"
                            >
                                <div className="text-5xl sm:text-6xl mb-3">🔑</div>
                                <h2 className="text-2xl sm:text-3xl font-black text-black mb-2">Unirse a Grupo</h2>
                                <p className="text-base sm:text-lg text-black/70 font-semibold">
                                    Introduce el código de tus amigos
                                </p>
                            </motion.div>
                        </div>

                        {/* My Libraries */}
                        <div className="glass-card p-4 sm:p-6">
                            <h2 className="text-xl sm:text-2xl font-black text-black mb-4">📚 Mis Bibliotecas</h2>
                            {localLibraries.length === 0 ? (
                                <div className="text-center py-8 sm:py-12">
                                    <div className="text-6xl sm:text-8xl mb-4">📭</div>
                                    <p className="text-base sm:text-lg text-black/60 font-bold mb-4">
                                        No tienes bibliotecas guardadas
                                    </p>
                                    <button
                                        onClick={() => setViewMode('create')}
                                        className="glow-button text-base sm:text-lg"
                                    >
                                        ¡Crea tu primera!
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {localLibraries.map((lib) => (
                                        <motion.div
                                            key={lib.code}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => openLibrary(lib.code)}
                                            className="glass-card p-4 sm:p-5 cursor-pointer bg-gradient-to-br from-purple-100 to-pink-100 border-3 border-purple-300 active:border-purple-500 transition-all"
                                        >
                                            <div className="text-3xl sm:text-4xl mb-2">📖</div>
                                            <h3 className="text-lg sm:text-xl font-black text-black mb-1 truncate">
                                                {lib.name}
                                            </h3>
                                            <p className="text-xs sm:text-sm font-mono text-black/60 font-bold">
                                                {lib.code}
                                            </p>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* ========== CREATE VIEW ========== */}
                {viewMode === 'create' && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="glass-card p-4 sm:p-6 md:p-8"
                    >
                        <h2 className="text-2xl sm:text-3xl font-black text-black mb-4 sm:mb-6">➕ Crear Biblioteca</h2>

                        <div className="space-y-4 sm:space-y-6">
                            {/* Name */}
                            <div>
                                <label className="block text-base sm:text-lg font-black text-black mb-2">
                                    Nombre
                                </label>
                                <input
                                    type="text"
                                    value={libraryName}
                                    onChange={(e) => setLibraryName(e.target.value)}
                                    placeholder="Ej: Preguntas Picantes 🌶️"
                                    className="w-full px-4 py-3 sm:px-6 sm:py-4 rounded-xl sm:rounded-2xl border-3 sm:border-4 border-black/20 bg-white text-black text-base sm:text-lg font-bold focus:border-purple-500 focus:outline-none transition-all"
                                    maxLength={50}
                                />
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-base sm:text-lg font-black text-black mb-2">
                                    Contraseña <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="password"
                                    value={libraryPassword}
                                    onChange={(e) => setLibraryPassword(e.target.value)}
                                    placeholder="Algo fácil de recordar"
                                    className="w-full px-4 py-3 sm:px-6 sm:py-4 rounded-xl sm:rounded-2xl border-3 sm:border-4 border-black/20 bg-white text-black text-base sm:text-lg font-bold focus:border-purple-500 focus:outline-none transition-all"
                                />
                                <p className="mt-2 text-xs sm:text-sm text-yellow-800 bg-yellow-100 p-2 sm:p-3 rounded-lg font-bold">
                                    ⚠️ Compártela con tus amigos
                                </p>
                            </div>

                            {/* AI Generator */}
                            <div className="bg-gradient-to-r from-purple-200 via-pink-200 to-purple-200 p-4 sm:p-5 rounded-xl sm:rounded-2xl border-3 sm:border-4 border-purple-400">
                                <h3 className="text-base sm:text-lg font-black text-purple-900 mb-3">
                                    ✨ Generador de IA
                                </h3>
                                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-3">
                                    <input
                                        type="text"
                                        value={aiTopic}
                                        onChange={(e) => setAiTopic(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && generateAI()}
                                        placeholder="Tema: Pizza, Superhéroes..."
                                        className="flex-1 px-4 py-3 rounded-xl border-2 sm:border-3 border-purple-300 text-black font-bold focus:border-purple-600 focus:outline-none text-base"
                                    />
                                    <button
                                        onClick={generateAI}
                                        disabled={isGeneratingAi || !aiTopic.trim()}
                                        className="bg-purple-600 active:bg-purple-700 text-white px-6 py-3 rounded-xl font-black disabled:opacity-50 transition-all whitespace-nowrap"
                                    >
                                        {isGeneratingAi ? '🔮 ...' : '✨ Generar'}
                                    </button>
                                </div>

                                {/* AI Results */}
                                <AnimatePresence>
                                    {aiResults.length > 0 && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="space-y-2"
                                        >
                                            {aiResults.map((prompt, idx) => (
                                                <motion.div
                                                    key={idx}
                                                    initial={{ x: -20, opacity: 0 }}
                                                    animate={{ x: 0, opacity: 1 }}
                                                    transition={{ delay: idx * 0.05 }}
                                                    onClick={() => addAiPrompt(prompt, idx)}
                                                    className="bg-white p-3 rounded-xl cursor-pointer active:bg-green-100 transition-all border-2 border-transparent active:border-green-500"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="bg-green-500 text-white rounded-full w-7 h-7 flex items-center justify-center font-black text-lg flex-shrink-0">
                                                            +
                                                        </div>
                                                        <span className="text-black font-semibold flex-1 text-sm sm:text-base">{prompt}</span>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Questions */}
                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <label className="text-base sm:text-lg font-black text-black">
                                        Preguntas ({prompts.filter(p => p.trim()).length})
                                    </label>
                                    <button
                                        onClick={() => setPrompts([...prompts, ''])}
                                        className="text-purple-600 font-black active:text-purple-800 text-sm sm:text-base"
                                    >
                                        + Añadir
                                    </button>
                                </div>
                                <div className="space-y-2 max-h-80 overflow-y-auto">
                                    {prompts.map((prompt, index) => (
                                        <div key={index} className="flex gap-2">
                                            <input
                                                type="text"
                                                value={prompt}
                                                onChange={(e) => updatePrompt(index, e.target.value)}
                                                placeholder={`${index + 1}. Tu pregunta...`}
                                                className="flex-1 px-3 py-2 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl border-2 sm:border-3 border-black/20 bg-white text-black font-semibold focus:border-purple-500 focus:outline-none text-sm sm:text-base"
                                            />
                                            {prompts.length > 3 && (
                                                <button
                                                    onClick={() => removePrompt(index)}
                                                    className="text-red-500 active:text-red-700 text-xl sm:text-2xl px-2 sm:px-3 font-bold"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Create Button */}
                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                                <button
                                    onClick={goHome}
                                    className="flex-1 bg-gray-300 active:bg-gray-400 text-black px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black text-base sm:text-lg transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleCreate}
                                    disabled={isLoading}
                                    className="flex-1 glow-button text-base sm:text-lg disabled:opacity-50"
                                >
                                    {isLoading ? '⏳ ...' : '🚀 Crear'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* ========== JOIN VIEW ========== */}
                {viewMode === 'join' && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="glass-card p-4 sm:p-6 md:p-8 max-w-2xl mx-auto"
                    >
                        <h2 className="text-2xl sm:text-3xl font-black text-black mb-6">🔑 Unirse a Grupo</h2>

                        <div className="space-y-6">
                            <div className="text-center py-6 sm:py-8">
                                <div className="text-6xl sm:text-8xl mb-4 sm:mb-6">🎯</div>
                                <p className="text-base sm:text-lg text-black/70 font-bold mb-4 px-4">
                                    Introduce el código de 6 caracteres
                                </p>
                            </div>

                            <div>
                                <input
                                    type="text"
                                    value={joinCode}
                                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                    placeholder="ABC123"
                                    maxLength={6}
                                    className="w-full px-4 py-4 sm:px-6 sm:py-6 rounded-xl sm:rounded-2xl border-3 sm:border-4 border-black/20 bg-white text-black font-mono text-2xl sm:text-3xl md:text-4xl text-center tracking-widest uppercase focus:border-blue-500 focus:outline-none transition-all font-black"
                                />
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                                <button
                                    onClick={goHome}
                                    className="flex-1 bg-gray-300 active:bg-gray-400 text-black px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black text-base sm:text-lg transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleJoin}
                                    disabled={isLoading || joinCode.length < 4}
                                    className="flex-1 glow-button text-base sm:text-lg disabled:opacity-50"
                                >
                                    {isLoading ? '⏳ ...' : '🔍 Buscar'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* ========== VIEW LIBRARY ========== */}
                {viewMode === 'view' && currentLibrary && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass-card p-8"
                    >
                        <div className="flex items-start justify-between mb-6">
                            <div className="flex-1">
                                <h2 className="text-4xl font-black text-black mb-2">{currentLibrary.name}</h2>
                                <div className="flex gap-4 items-center">
                                    <p className="text-lg font-mono text-black/60 font-bold">
                                        Código: {currentLibrary.id}
                                    </p>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(currentLibrary.id);
                                            showMessage('success', '¡Código copiado!');
                                        }}
                                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-bold transition-all"
                                    >
                                        📋 Copiar
                                    </button>
                                </div>
                            </div>
                            <button onClick={goHome} className="text-4xl hover:scale-110 transition-transform">
                                ✕
                            </button>
                        </div>

                        {/* Stats */}
                        <div className="bg-gradient-to-r from-purple-100 to-pink-100 p-6 rounded-2xl mb-6 border-3 border-purple-300">
                            <div className="flex flex-wrap gap-6 text-lg font-black text-black">
                                <div>📊 {currentLibrary.prompts.length} preguntas</div>
                                <div>🎮 {currentLibrary.playCount || 0} partidas</div>
                                <div>{currentLibrary.passwordHash ? '🔒 Protegida' : '🔓 Pública'}</div>
                            </div>
                        </div>

                        {/* Share Info */}
                        {currentLibrary.passwordHash && (
                            <div className="bg-yellow-50 p-6 rounded-2xl mb-6 border-3 border-yellow-400">
                                <h3 className="text-xl font-black text-yellow-900 mb-3">
                                    🎉 Comparte con tus amigos
                                </h3>
                                <p className="text-yellow-800 font-bold mb-3">
                                    Para que puedan unirse y editar preguntas, compárteles:
                                </p>
                                <div className="bg-white p-4 rounded-xl mb-2">
                                    <p className="text-sm text-black/50 font-bold">Código:</p>
                                    <p className="text-2xl font-mono font-black text-black">{currentLibrary.id}</p>
                                </div>
                                <p className="text-sm text-yellow-800 font-bold">
                                    ⚠️ No olvides darles también la <strong>contraseña</strong>
                                </p>
                            </div>
                        )}

                        {/* Questions List */}
                        <div className="mb-6">
                            <h3 className="text-2xl font-black text-black mb-4">📝 Preguntas</h3>
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                {currentLibrary.prompts.map((prompt, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="bg-white/70 p-4 rounded-xl border-2 border-black/10"
                                    >
                                        <span className="text-purple-600 font-black mr-3">{index + 1}.</span>
                                        <span className="text-black font-semibold">{prompt}</span>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        {/* Password Input for Edit */}
                        {currentLibrary.passwordHash && (
                            <div className="mb-6">
                                <label className="block text-xl font-black text-black mb-2">
                                    Contraseña para editar
                                </label>
                                <input
                                    type="password"
                                    value={viewPassword}
                                    onChange={(e) => setViewPassword(e.target.value)}
                                    placeholder="Introduce la contraseña"
                                    className="w-full px-6 py-4 rounded-2xl border-4 border-black/20 bg-white text-black text-xl font-bold focus:border-purple-500 focus:outline-none"
                                />
                            </div>
                        )}

                        {/* Actions */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <button
                                onClick={startEdit}
                                className="bg-yellow-500 hover:bg-yellow-600 text-black px-6 py-4 rounded-2xl font-black text-xl transition-all transform hover:scale-105"
                            >
                                ✏️ Editar Preguntas
                            </button>
                            <button
                                onClick={() => setShowDeleteModal(true)}
                                className="bg-red-500 hover:bg-red-600 text-white px-6 py-4 rounded-2xl font-black text-xl transition-all transform hover:scale-105"
                            >
                                🗑️ Eliminar
                            </button>
                        </div>

                        {/* Play Link */}
                        <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 rounded-2xl text-white">
                            <h3 className="text-2xl font-black mb-3">🎮 ¿Listo para jugar?</h3>
                            <p className="mb-4 text-lg font-semibold opacity-90">
                                Crea una sala y carga esta biblioteca
                            </p>
                            <Link
                                href={`/tv/new?library=${currentLibrary.id}`}
                                className="inline-block bg-white text-purple-600 px-8 py-4 rounded-xl font-black text-xl hover:bg-gray-100 transition-all transform hover:scale-105"
                            >
                                Crear Sala →
                            </Link>
                        </div>
                    </motion.div>
                )}

                {/* ========== EDIT MODE ========== */}
                {viewMode === 'edit' && currentLibrary && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="glass-card p-8"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-3xl font-black text-black">✏️ Editando: {currentLibrary.name}</h2>
                            <button
                                onClick={() => setViewMode('view')}
                                className="text-4xl hover:scale-110 transition-transform"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Name */}
                            <div>
                                <label className="block text-xl font-black text-black mb-2">Nombre</label>
                                <input
                                    type="text"
                                    value={libraryName}
                                    onChange={(e) => setLibraryName(e.target.value)}
                                    className="w-full px-6 py-4 rounded-2xl border-4 border-black/20 bg-white text-black text-xl font-bold focus:border-purple-500 focus:outline-none"
                                />
                            </div>

                            {/* AI Generator */}
                            <div className="bg-gradient-to-r from-purple-200 via-pink-200 to-purple-200 p-6 rounded-2xl border-4 border-purple-400">
                                <h3 className="text-xl font-black text-purple-900 mb-3">
                                    ✨ Generador Mágico de IA
                                </h3>
                                <div className="flex gap-3 mb-3">
                                    <input
                                        type="text"
                                        value={aiTopic}
                                        onChange={(e) => setAiTopic(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && generateAI()}
                                        placeholder="Tema: Ej. Pizza, Superhéroes..."
                                        className="flex-1 px-4 py-3 rounded-xl border-3 border-purple-300 text-black font-bold focus:border-purple-600 focus:outline-none"
                                    />
                                    <button
                                        onClick={generateAI}
                                        disabled={isGeneratingAi || !aiTopic.trim()}
                                        className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-black disabled:opacity-50 transition-all whitespace-nowrap"
                                    >
                                        {isGeneratingAi ? '🔮 ...' : '✨ Generar'}
                                    </button>
                                </div>

                                <AnimatePresence>
                                    {aiResults.length > 0 && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="space-y-2"
                                        >
                                            {aiResults.map((prompt, idx) => (
                                                <motion.div
                                                    key={idx}
                                                    initial={{ x: -20, opacity: 0 }}
                                                    animate={{ x: 0, opacity: 1 }}
                                                    onClick={() => addAiPrompt(prompt, idx)}
                                                    className="bg-white p-4 rounded-xl cursor-pointer hover:bg-green-100 transition-all border-2 border-transparent hover:border-green-500 group"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="bg-green-500 group-hover:bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-black text-xl">
                                                            +
                                                        </div>
                                                        <span className="text-black font-bold flex-1">{prompt}</span>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Questions */}
                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <label className="text-xl font-black text-black">
                                        Preguntas ({prompts.filter(p => p.trim()).length})
                                    </label>
                                    <button
                                        onClick={() => setPrompts([...prompts, ''])}
                                        className="text-purple-600 font-black hover:text-purple-800"
                                    >
                                        + Añadir
                                    </button>
                                </div>
                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                    {prompts.map((prompt, index) => (
                                        <div key={index} className="flex gap-2">
                                            <input
                                                type="text"
                                                value={prompt}
                                                onChange={(e) => updatePrompt(index, e.target.value)}
                                                placeholder={`Pregunta ${index + 1}...`}
                                                className="flex-1 px-4 py-3 rounded-xl border-3 border-black/20 bg-white text-black font-semibold focus:border-purple-500 focus:outline-none"
                                            />
                                            {prompts.length > 3 && (
                                                <button
                                                    onClick={() => removePrompt(index)}
                                                    className="text-red-500 hover:text-red-700 text-2xl px-3 font-bold"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Save Button */}
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setViewMode('view')}
                                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-black px-6 py-4 rounded-2xl font-black text-xl transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={saveEdit}
                                    disabled={isLoading}
                                    className="flex-1 glow-button text-xl disabled:opacity-50"
                                >
                                    {isLoading ? '⏳ Guardando...' : '💾 Guardar Cambios'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {showDeleteModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
                        onClick={() => setShowDeleteModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.8, y: 50 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.8, y: 50 }}
                            className="bg-white rounded-3xl p-8 max-w-md w-full"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="text-6xl mb-4 text-center">⚠️</div>
                            <h3 className="text-2xl font-black text-black mb-3 text-center">
                                ¿Eliminar biblioteca?
                            </h3>
                            <p className="text-black/70 mb-6 text-center font-bold">
                                Esta acción no se puede deshacer. Se eliminarán todas las {currentLibrary?.prompts.length} preguntas.
                            </p>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-black py-3 rounded-xl font-black text-lg transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={isLoading}
                                    className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-black text-lg disabled:opacity-50 transition-all"
                                >
                                    {isLoading ? 'Eliminando...' : 'Sí, Eliminar'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </main>
    );
}
