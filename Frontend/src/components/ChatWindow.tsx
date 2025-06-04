// src/components/ChatWindow.tsx
interface SpeechRecognition {
    start(): void;
    stop(): void;
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: (event: any) => void;
    onerror: (event: any) => void;
    onend: () => void;
}

declare global {
    interface Window {
        webkitSpeechRecognition: typeof SpeechRecognition;
    }
}

declare var webkitSpeechRecognition: typeof SpeechRecognition;

import React, { useState, useEffect, useRef } from 'react';
import { Send, X, Mic, MicOff, ChevronDown, Loader, Maximize, Minimize } from 'lucide-react';
import EventsDropdown from './EventsDropdown';
import ClubsDropdown from './ClubsDropdown';
import FunctionBoxes from './FunctionBoxes';

interface Message {
    text: string;
    sender: 'user' | 'bot';
    timestamp: Date;
    buttons?: { label: string; onClick: () => void }[];
}

interface ChatWindowProps {
    messages: Message[];
    onClose: () => void;
    onSendMessage: (query: string, response?: string, requiresBackend?: boolean) => void;
    isTyping: boolean;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ messages, onClose, onSendMessage, isTyping }: ChatWindowProps) => {
    const [input, setInput] = useState<string>('');
    const [isRecording, setIsRecording] = useState<boolean>(false);
    const [isEventsOpen, setIsEventsOpen] = useState<boolean>(false);
    const [isClubsOpen, setIsClubsOpen] = useState<boolean>(false);
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<SpeechRecognition | null>(null);

    const scrollToBottom = () => {
        setTimeout(() => {
            if (messagesEndRef.current) {
                messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
            } else if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
            }
        }, 100);
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    useEffect(() => {
        if ('webkitSpeechRecognition' in window) {
            const recognition = new webkitSpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US';

            recognition.onresult = (event: SpeechRecognitionEvent) => {
                const transcript = event.results[0][0].transcript;
                setInput(transcript);
                setIsRecording(false);
            };

            recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
                console.error('Speech recognition error:', event.error);
                setIsRecording(false);
                onSendMessage('Sorry, I couldn\'t understand your speech. Please try typing instead.');
            };

            recognition.onend = () => {
                setIsRecording(false);
            };

            recognitionRef.current = recognition;
        }

        return () => {
            const recognition = recognitionRef.current;
            if (recognition) {
                recognition.stop();
            }
        };
    }, [onSendMessage]);

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isFullscreen) {
                setIsFullscreen(false);
                scrollToBottom();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isFullscreen]);

    const handleSend = () => {
        if (input.trim()) {
            onSendMessage(input);
            setInput('');
            scrollToBottom();
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && input.trim()) {
            handleSend();
        }
    };

    const toggleRecording = () => {
        if (!('webkitSpeechRecognition' in window)) {
            onSendMessage('Speech recognition is not supported in this browser. Please try typing instead.');
            return;
        }

        if (isRecording) {
            recognitionRef.current?.stop();
        } else {
            setIsRecording(true);
            recognitionRef.current?.start();
        }
    };

    const toggleFullscreen = () => {
        setIsFullscreen((prev: boolean) => !prev);
        scrollToBottom();
    };

    const formatTimestamp = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div
            className={`bg-white rounded-lg shadow-2xl flex flex-col fixed bottom-16 right-4 z-50 transition-all duration-300 ${isFullscreen ? 'w-screen h-screen bottom-0 right-0 rounded-none' : 'w-96 h-[32rem]'
                }`}
        >
            {/* Header (Fixed) */}
            <div className="bg-kmit-teal text-white p-4 rounded-t-lg flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center">
                    <h2 className="text-lg font-semibold">Vidya - KMIT Assistant</h2>
                </div>
                    <button
                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => onClose()}
                        className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div
                    ref={scrollContainerRef as React.RefObject<HTMLDivElement>}
                    className="h-full overflow-y-auto p-6 space-y-4"
                >
                style={{ minHeight: '0' }}
            >
                {/* Dropdowns Section */}
                <div className="border-b">
                    <div className="flex items-center p-3 gap-2">
                        <button
                            onClick={() => setIsEventsOpen((prev) => !prev)}
                            className="bg-gray-100 hover:bg-gray-200 p-2 rounded-full"
                            aria-label="Upcoming Events"
                        >
                            <ChevronDown size={20} className={`${isEventsOpen ? 'rotate-180' : ''}`} />
                        </button>
                        <button
                            onClick={() => setIsClubsOpen((prev) => !prev)}
                            className="bg-gray-100 hover:bg-gray-200 p-2 rounded-full"
                            aria-label="Clubs at KMIT"
                        >
                            <ChevronDown size={20} className={`${isClubsOpen ? 'rotate-180' : ''}`} />
                        </button>
                    </div>
                    {isEventsOpen && <EventsDropdown onSelect={onSendMessage} />}
                    {isClubsOpen && <ClubsDropdown />}
                </div>

                {/* Function Boxes */}
                <FunctionBoxes onSelect={onSendMessage} />

                {/* Conversation Area */}
                <div className="p-4">
                    {messages.map((message, index) => (
                        <div
                            key={index}
                            className={`mb-4 flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[80%] p-3 rounded-lg ${message.sender === 'user' ? 'bg-kmit-teal/80 text-white' : 'bg-gray-100 text-gray-800'
                                    }`}
                            >
                                <p>{message.text}</p>
                                <span className="text-xs text-gray-400 mt-1 block">
                                    {formatTimestamp(message.timestamp)}
                                </span>
                                {message.buttons && (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {message.buttons.map((button, idx) => (
                                            <button
                                                key={idx}
                                                onClick={button.onClick}
                                                className="bg-kmit-teal/90 hover:bg-kmit-teal text-white px-3 py-1 rounded-full text-sm"
                                            >
                                                {button.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {isTyping && (
                        <div className="flex justify-start mb-4">
                            <div className="bg-gray-100 p-3 rounded-lg flex items-center">
                                <Loader className="animate-spin text-kmit-teal" size={20} />
                                <span className="ml-2 text-gray-600">Typing...</span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
        </div>

        {/* Input Area (Fixed) */}
        <div className="p-3 border-t flex items-center gap-2 sticky bottom-0 bg-white z-10">
            <input
                type="text"
                value={input}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="flex-1 p-2 rounded-full border border-gray-300 focus:outline-none focus:border-kmit-teal"
            />
            <button
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => toggleRecording()}
                className={`p-2 rounded-full ${isRecording ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600'
                    } hover:opacity-90`}
                aria-label={isRecording ? 'Stop recording' : 'Start recording'}
            >
                {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
            <button
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => handleSend()}
                className="bg-kmit-teal hover:bg-kmit-teal/90 text-white p-2 rounded-full"
                aria-label="Send message"
            >
                <Send size={20} />
            </button>
        </div>
    </div>
);
    );
};

export default ChatWindow;