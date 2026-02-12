
import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import { DEPARTMENTS, SERVICES, CONTACT_INFO } from './components/components/constants';
import { chatWithGemini, generateSpeech } from './geminiService';
import { Message, Service } from './types';

// Types for User State
type UserType = 'reviewer' | 'manager' | 'serviceProvider';
interface User {
  type: UserType;
  name: string;
  nationalId?: string;
  phone?: string;
  id?: string;
}

// Add types for Web Speech API
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

// Helper functions for audio
function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'assistant', 
      content: 'مرحباً بكم في مكتب الوطن للخدمات الإلكترونية المساندة لجميع المنصات الحكومية والخاصة وبرمجة نظم المعلومات (تخصص SAP). نتشرف بخدمتكم تحت إدارة وإشراف السيد ماجد سعود العميري، مدير عام الموقع والمشرف العام. كيف نقدر نخدمكم اليوم؟ أبشروا بعزكم وفالكم طيب.' 
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  
  const [showReviewerLoginModal, setShowReviewerLoginModal] = useState(false);
  const [showManagerLoginModal, setShowManagerLoginModal] = useState(false);
  const [showServiceProviderLoginModal, setShowServiceProviderLoginModal] = useState(false);
  const [showRaedCardModal, setShowRaedCardModal] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const [isListening, setIsListening] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const handleFirstInteraction = () => {
      if (!hasInteracted) {
        setHasInteracted(true);
        playResponseAudio('يا هلا والله ومسهلا بكم في مكتب الوطن للخدمات الإلكترونية المساندة وبرمجة نظم المعلومات تخصص ساب. نعتز بخدمتكم تحت إشراف السيد ماجد سعود العميري. وش بخاطركم اليوم؟ أبشروا بعزكم وفالكم طيب.');
        window.removeEventListener('click', handleFirstInteraction);
      }
    };
    window.addEventListener('click', handleFirstInteraction);
    return () => window.removeEventListener('click', handleFirstInteraction);
  }, [hasInteracted]);

  useEffect(() => {
    if (user && user.type === 'reviewer') {
      const loginGreeting = `يا هلا بك يا ${user.name} في بوابتك الخاصة بمكتب الوطن. تحت إشراف الأستاذ ماجد العميري، كل معاملاتك ومشاريعك التقنية نتابعها بدقة. كيف نقدر نخدمك اليوم؟`;
      setMessages(prev => [...prev, { role: 'assistant', content: loginGreeting }]);
      playResponseAudio(loginGreeting);
    }
  }, [user]);

  const playResponseAudio = async (text: string) => {
    const base64Audio = await generateSpeech(text);
    if (!base64Audio) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    
    try {
      setIsAudioPlaying(true);
      const audioBytes = decodeBase64(base64Audio);
      const audioBuffer = await decodeAudioData(audioBytes, ctx, 24000, 1);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => setIsAudioPlaying(false);
      source.start();
    } catch (e) {
      console.error("Audio playback error", e);
      setIsAudioPlaying(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    const history = messages.map(m => ({
      role: m.role === 'user' ? 'user' as const : 'model' as const,
      parts: [{ text: m.content }]
    }));

    const response = await chatWithGemini(userMsg, history);
    setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    setIsLoading(false);
    
    playResponseAudio(response);
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'ar-SA';
      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (e: any) => setInput(e.results[0][0].transcript);
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
      recognition.start();
    }
  };

  const handleLogout = () => {
    setUser(null);
    setMessages([{ role: 'assistant', content: 'في أمان الله، ننتظر تشريفكم لنا مرة ثانية في مكتب الوطن. مع السلامة!' }]);
    playResponseAudio('في أمان الله، ننتظر تشريفكم لنا مرة ثانية في مكتب الوطن. مع السلامة!');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-['Cairo']">
      <Header 
        onReviewerLoginClick={() => setShowReviewerLoginModal(true)} 
        onManagerLoginClick={() => setShowManagerLoginModal(true)} 
        onServiceProviderLoginClick={() => setShowServiceProviderLoginModal(true)}
        user={user}
        onLogout={handleLogout}
      />

      <main className="flex-grow overflow-x-hidden">
        {!user && (
          <section className="relative pt-24 pb-40 overflow-hidden bg-[#064e3b] text-white">
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-400 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3"></div>
              <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-amber-400 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4"></div>
            </div>
            
            <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full mb-8 border border-white/20">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                <span className="text-xs font-bold tracking-wide uppercase">برمجة نظم المعلومات SAP والخدمات المساندة</span>
              </div>
              
              <h2 className="text-4xl md:text-7xl font-black mb-8 leading-[1.15] animate-fade-in-up">
                مكتب الوطن <br/> 
                <span className="text-emerald-400">للخدمات والحلول التقنية</span>
              </h2>
              
              <p className="text-lg md:text-xl mb-12 max-w-4xl mx-auto text-emerald-10/80 leading-relaxed font-medium animate-fade-in-up delay-100">
                مرحباً بكم في وجهتكم الموثوقة للخدمات الإلكترونية وبرمجة نظم المعلومات (SAP). نعمل باحترافية تحت إدارة وإشراف السيد <span className="text-white font-black">ماجد سعود العميري</span> لتقديم أفضل الحلول للمنصات الحكومية والخاصة.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-5 animate-fade-in-up delay-200">
                <button 
                  onClick={() => setShowReviewerLoginModal(true)} 
                  className="w-full sm:w-auto bg-white text-[#064e3b] px-12 py-4 rounded-2xl font-black text-lg shadow-2xl hover:bg-slate-50 transition-all hover:scale-105 active:scale-95"
                >
                  بوابة المراجعين 📁
                </button>
                <a 
                  href="#support" 
                  className="w-full sm:w-auto bg-emerald-500 text-white px-12 py-4 rounded-2xl font-black text-lg shadow-xl hover:bg-emerald-600 transition-all hover:scale-105 active:scale-95 border border-emerald-400/30"
                >
                  تحدث مع نورة ✨
                </a>
              </div>

              {!hasInteracted && (
                <div className="mt-8 animate-bounce text-emerald-200 text-sm font-bold">
                  اضغط في أي مكان لتسمع الترحيب الرسمي 🎙️
                </div>
              )}
            </div>
          </section>
        )}

        {user && (
          <div className="max-w-7xl mx-auto px-6 py-16">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
              <div>
                <h2 className="text-4xl font-black text-emerald-900 mb-2">يا هلا، {user.name} 👋</h2>
                <p className="text-gray-500 font-bold">مرحباً بك في لوحة تحكم مكتب الوطن الرقمية | إشراف: ماجد العميري</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
              <div className="group bg-white p-10 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-50 transition-all hover:-translate-y-2 hover:shadow-2xl">
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">💻</div>
                <h3 className="font-black text-2xl mb-3 text-slate-800">نظم المعلومات SAP</h3>
                <p className="text-gray-500 font-medium mb-6 leading-relaxed">متابعة مشاريع البرمجة وتطوير الأنظمة الخاصة بمنشأتك.</p>
                <button className="text-blue-600 font-black text-sm flex items-center gap-2 hover:gap-4 transition-all">دخول القسم ←</button>
              </div>
              
              <div className="group bg-white p-10 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-50 transition-all hover:-translate-y-2 hover:shadow-2xl">
                <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">🏛️</div>
                <h3 className="font-black text-2xl mb-3 text-slate-800">المنصات الحكومية</h3>
                <p className="text-gray-500 font-medium mb-6 leading-relaxed">استعراض حالة طلبات أبشر، قوى، ومدد المنجزة.</p>
                <button className="text-amber-600 font-black text-sm flex items-center gap-2 hover:gap-4 transition-all">دخول القسم ←</button>
              </div>
              
              <div 
                onClick={() => setShowRaedCardModal(true)}
                className="group bg-emerald-50 p-10 rounded-[2.5rem] shadow-xl shadow-emerald-200/30 border border-emerald-100 transition-all hover:-translate-y-2 hover:shadow-2xl cursor-pointer"
              >
                <div className="w-16 h-16 bg-emerald-600 text-white rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">💳</div>
                <h3 className="font-black text-2xl mb-3 text-emerald-900">بطاقة رائد</h3>
                <p className="text-emerald-700 font-medium mb-6 leading-relaxed">عرض وتحميل بطاقة العمل الحر المعتمدة.</p>
                <button className="text-emerald-600 font-black text-sm flex items-center gap-2 hover:gap-4 transition-all">عرض البطاقة ←</button>
              </div>
            </div>
          </div>
        )}

        <section id="services" className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-black text-emerald-900 mb-4">خدماتنا الشاملة</h2>
              <p className="text-gray-500 font-bold max-w-2xl mx-auto">نغطي كافة المنصات الحكومية والخاصة، بالإضافة إلى برمجة وتطوير نظم المعلومات (SAP).</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {SERVICES.map((service) => (
                <div key={service.id} className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 transition-all hover:bg-white hover:shadow-xl hover:border-emerald-100 group">
                  <div className="text-4xl mb-6 group-hover:scale-125 transition-transform inline-block">{service.icon}</div>
                  <h3 className="text-xl font-black text-emerald-900 mb-3">{service.title}</h3>
                  <p className="text-gray-500 text-sm mb-6 leading-relaxed font-medium">{service.description}</p>
                  <ul className="space-y-2 mb-8">
                    {service.features.slice(0, 3).map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs font-bold text-gray-400">
                        <span className="text-emerald-500">✓</span> {f}
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center justify-between border-t border-slate-100 pt-6">
                    <span className="text-emerald-700 font-black text-sm">{service.priceRange || 'تواصل معنا'}</span>
                    <a href={CONTACT_INFO.socials.whatsapp} className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-xl text-xs font-black hover:bg-emerald-200 transition-colors">اطلب الآن</a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="support" className="py-24 bg-white">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-12">
              <span className="bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full text-xs font-black mb-4 inline-block border border-emerald-100">بنت الوطن الذكية</span>
              <h2 className="text-3xl md:text-5xl font-black text-emerald-900 mb-4">تحدث مع نورة</h2>
              <p className="text-gray-500 font-bold">خبيرة المنصات الحكومية ونظم SAP في خدمتكم.</p>
            </div>
            
            <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col h-[650px] border border-slate-100 relative">
              <div className="bg-[#065f46] p-6 text-white flex justify-between items-center shadow-lg relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-2xl animate-pulse">✨</div>
                  <div>
                    <h3 className="font-black text-lg">نورة | خبيرة الوطن</h3>
                    <p className="text-emerald-200 text-xs font-bold">متصل الآن - إشراف ماجد العميري</p>
                  </div>
                </div>
                <div className="flex gap-2">
                   <button onClick={() => setMessages([{ role: 'assistant', content: 'أبشروا، تم تصفير المحادثة. كيف أقدر أساعدكم في خدمات SAP أو المنصات الحكومية اليوم؟' }])} className="text-xs font-black bg-white/10 px-4 py-2 rounded-xl hover:bg-white/20">تصفير ↺</button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-[#fdfdfd] shadow-inner">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
                    <div className={`relative max-w-[85%] p-5 rounded-[1.5rem] shadow-sm leading-relaxed text-sm md:text-base font-medium ${
                      msg.role === 'user' 
                        ? 'bg-[#059669] text-white rounded-tr-none shadow-lg shadow-emerald-200' 
                        : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
                    }`}>
                      {msg.content}
                      {msg.role === 'assistant' && (
                        <button 
                          onClick={() => playResponseAudio(msg.content)}
                          className="absolute bottom-2 left-2 text-emerald-600 hover:text-emerald-800 opacity-50 hover:opacity-100 transition-opacity"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isAudioPlaying ? 'animate-pulse' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-100 p-5 rounded-[1.5rem] animate-pulse flex items-center gap-2">
                       <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"></span>
                       <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                       <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              
              <div className="p-6 bg-white border-t border-slate-50 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1 flex items-center bg-[#f8fafc] rounded-2xl border border-slate-200 px-4 py-1 transition-all focus-within:ring-2 focus-within:ring-emerald-500 focus-within:bg-white">
                    <input 
                      type="text" 
                      value={input} 
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                      placeholder="اسأل نورة عن SAP أو أي منصة حكومية..."
                      className="flex-1 bg-transparent py-4 outline-none text-slate-700 text-sm font-bold"
                    />
                    <button 
                      onClick={toggleListening} 
                      className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all ${
                        isListening ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-200' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                      }`}
                    >
                      🎤
                    </button>
                  </div>
                  <button 
                    onClick={handleSend} 
                    disabled={isLoading}
                    className="bg-[#059669] text-white px-10 py-5 rounded-2xl font-black text-sm shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50"
                  >
                    إرسال
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 bg-emerald-950 text-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-black mb-4">فريق خدمة العملاء</h2>
              <p className="text-emerald-300 font-bold">بإشراف مباشر من الأستاذ ماجد سعود العميري</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {CONTACT_INFO.phones.map((phone, i) => (
                <a 
                  key={phone} 
                  href={`tel:${phone}`}
                  className="bg-white/5 border border-white/10 p-6 rounded-2xl text-center hover:bg-white/10 transition-all hover:-translate-y-1 group"
                >
                  <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">📞</div>
                  <div className="text-sm font-black text-emerald-400 mb-1">خدمة العملاء</div>
                  <div className="text-xs font-bold opacity-80">{phone}</div>
                </a>
              ))}
            </div>
          </div>
        </section>
      </main>

      {showReviewerLoginModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[70] flex items-center justify-center p-6">
          <div className="bg-white p-12 rounded-[3rem] max-w-md w-full shadow-2xl relative animate-fade-in-up">
            <button onClick={() => setShowReviewerLoginModal(false)} className="absolute top-8 left-8 text-gray-400 hover:text-red-500 transition-colors text-xl font-bold">✕</button>
            <div className="w-20 h-20 bg-emerald-100 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-8 shadow-inner">👤</div>
            <h3 className="text-3xl font-black text-emerald-900 mb-2 text-center">دخول المراجعين</h3>
            <p className="text-center text-gray-500 font-bold text-sm mb-8">تحت إشراف الأستاذ ماجد سعود العميري</p>
            
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 mr-2 uppercase tracking-wider">رقم الهوية الوطنية</label>
                <input type="text" placeholder="1XXXXXXXXX" id="login-id" className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all font-bold text-lg" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 mr-2 uppercase tracking-wider">رقم الجوال</label>
                <input type="tel" placeholder="05XXXXXXXX" className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all font-bold text-lg" />
              </div>
              <button onClick={() => { 
                const idInput = document.getElementById('login-id') as HTMLInputElement;
                setUser({type: 'reviewer', name: 'مراجع الوطن العزيز', nationalId: idInput?.value || '1234567890'}); 
                setShowReviewerLoginModal(false); 
              }} className="w-full bg-[#059669] text-white py-5 rounded-2xl font-black text-xl shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all hover:scale-[1.02] active:scale-95 mt-6">دخول آمن</button>
            </div>
          </div>
        </div>
      )}

      {showRaedCardModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[80] flex items-center justify-center p-6">
          <div className="bg-white p-1 rounded-[2.5rem] max-w-sm w-full shadow-[0_0_50px_rgba(16,185,129,0.3)] relative animate-fade-in-up overflow-hidden">
             <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 p-10 text-center relative overflow-hidden rounded-[2.4rem]">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                <button onClick={() => setShowRaedCardModal(false)} className="absolute top-6 left-6 text-white/50 hover:text-white transition-colors">✕</button>
                
                <div className="w-28 h-28 bg-white p-1 rounded-full mx-auto mb-6 shadow-2xl relative z-10">
                  <div className="w-full h-full bg-emerald-50 rounded-full flex items-center justify-center text-5xl">👨‍💻</div>
                </div>
                
                <h3 className="font-black text-2xl text-white mb-1 relative z-10">{CONTACT_INFO.ceo.name}</h3>
                <p className="text-emerald-100 text-sm font-bold mb-8 opacity-80 relative z-10">برمجة نظم المعلومات - SAP</p>
                
                <div className="bg-white p-6 rounded-3xl shadow-inner mb-6 flex flex-col items-center">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_Sample.svg" alt="QR" className="w-40 h-40" />
                  <p className="mt-4 text-[10px] text-gray-400 font-black">رقم الوثيقة: FL-298374-HW</p>
                </div>
                
                <div className="space-y-2 text-white/80 font-bold text-xs uppercase tracking-widest">
                  <p>Freelancer License</p>
                  <p className="text-[10px] opacity-60">Verified by Ministry of Human Resources</p>
                </div>
             </div>
          </div>
        </div>
      )}

      <a 
        href={CONTACT_INFO.socials.whatsapp} 
        target="_blank" 
        rel="noopener noreferrer"
        className="fixed bottom-8 left-8 z-[100] bg-emerald-500 text-white w-16 h-16 rounded-full shadow-2xl flex items-center justify-center text-3xl hover:scale-110 hover:bg-emerald-600 transition-all active:scale-90"
        title="تواصل واتساب"
      >
        <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24"><path d="M12.031 6.172c-2.32 0-4.208 1.887-4.208 4.208 0 2.32 1.888 4.208 4.208 4.208 2.32 0 4.208-1.888 4.208-4.208 0-2.32-1.888-4.208-4.208-4.208zm0 6.641c-1.341 0-2.433-1.092-2.433-2.433 0-1.341 1.092-2.433 2.433-2.433 1.341 0 2.433 1.092 2.433 2.433 1.341 0 2.433 1.092 2.433 2.433 0 1.341-1.092 2.433-2.433 2.433zm.103-9.813C6.315 3 1.5 7.815 1.5 13.604c0 1.851.482 3.587 1.325 5.099L1.5 24l5.441-1.428c1.42.748 3.033 1.173 4.742 1.173 5.799 0 10.513-4.715 10.513-10.141 0-5.789-4.715-10.604-10.065-10.604zm-.103 18.784c-1.613 0-3.123-.427-4.444-1.177l-.319-.181-3.301.866.881-3.213-.199-.316a8.55 8.55 0 0 1-1.311-4.521c0-4.746 3.857-8.604 8.604-8.604 4.746 0 8.604 3.858 8.604 8.604.001 4.746-3.857 8.604-8.604 8.604z"/></svg>
      </a>

      <footer className="bg-slate-900 text-white pt-24 pb-12 rounded-t-[5rem]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 mb-20">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                 <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-2xl font-black">و</div>
                 <h2 className="text-2xl font-black">منصة الوطن</h2>
              </div>
              <p className="text-slate-400 font-bold leading-relaxed">
                وجهتكم الموثوقة للحلول التقنية والخدمات المساندة وبرمجة SAP تحت إشراف <span className="text-white">ماجد سعود العميري</span>.
              </p>
            </div>
            
            <div>
              <h4 className="text-xl font-black mb-8">روابط سريعة</h4>
              <ul className="space-y-4 font-bold text-slate-400">
                <li><a href="#" className="hover:text-emerald-500 transition-colors">الرئيسية</a></li>
                <li><a href="#services" className="hover:text-emerald-500 transition-colors">خدماتنا</a></li>
                <li><a href="#support" className="hover:text-emerald-500 transition-colors">الدعم الذكي</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-xl font-black mb-8">تواصل معنا</h4>
              <ul className="space-y-4 font-bold text-slate-400">
                <li className="flex items-center gap-3">📍 الرياض، حي العليا</li>
                <li className="flex items-center gap-3">📞 {CONTACT_INFO.ceo.phone}</li>
                <li className="flex items-center gap-3">✉️ {CONTACT_INFO.email}</li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-slate-800 text-center space-y-4">
            <p className="text-slate-500 font-bold text-sm">جميع الحقوق محفوظة © مكتب الوطن - إدارة ماجد سعود العميري 2026</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
