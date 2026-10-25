"use client";
import { useState, useEffect } from "react";

export default function SovereignChat(){
  const [prompt, setPrompt] = useState("");
  const [history, setHistory] = useState([]);
  const [doctor, setDoctor] = useState(null);
  const [doctorError, setDoctorError] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(()=>{
    fetch("/api/sovereign-chat")
      .then(r=>r.json())
      .then(setDoctor)
      .catch(()=>setDoctorError(true));
  }, []);

  async function send(){
    if(!prompt.trim()) return;
    setLoading(true);
    const userMsg = { role: "user", text: prompt, ts: Date.now() };
    setHistory(h=>[...h, userMsg]);
    setPrompt("");
    try{
      const res = await fetch("/api/sovereign-chat", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ prompt: userMsg.text }) });
      const data = await res.json();
      if(!res.ok){
        setHistory(h=>[...h, { role: "error", text: `${data.error}: ${data.sovereign?.msg || ""}`, decision: data.decision, code: data.error, ts: Date.now() }]);
      }else{
        setHistory(h=>[...h, { role: "assistant", text: data.response, decision: data.decision, model: data.model, prevHash: data.prevHash?.slice(0,8), ts: Date.now() }]);
      }
      if(data.doctor) setDoctor(data.doctor);
    }catch(e){
      setHistory(h=>[...h, { role: "error", text: `MODEL_UNAVAILABLE: ${e.message}`, decision: "BLOCKED", code: "MODEL_UNAVAILABLE" }]);
    }
    setLoading(false);
  }

  return (
    <div className="max-w-2xl mx-auto p-4 border rounded-xl bg-black text-white">
      <div className="flex justify-between items-center mb-3 text-xs font-mono">
        {doctorError ? (
          <span className="bg-red-900 px-2 py-1 rounded">DOCTOR UNREACHABLE - CHECK SERVER</span>
        ) : (
          <span className={`${doctor?.status?.includes("OK")?"bg-green-900":"bg-gray-800"} px-2 py-1 rounded`}>{doctor?.status || "LOADING..."}</span>
        )}
        <span className="bg-gray-800 px-2 py-1 rounded">{doctor?.model || "qwen2.5:1.5b"} | {doctor?.prevHash?.slice(0,8) || "GENESIS"}</span>
      </div>
      <div className="h-96 overflow-y-auto space-y-2 mb-3 bg-zinc-900 p-3 rounded">
        {history.map((m,i)=>(
          <div key={i} className={`${m.role==="user"?"text-right":"text-left"}`}>
            <div className={`inline-block px-3 py-2 rounded-lg text-sm ${m.role==="user"?"bg-blue-600":m.role==="error"?"bg-red-900":"bg-zinc-700"} `}>
              <div>{m.text}</div>
              <div className="text-[10px] opacity-60 mt-1 font-mono">{m.decision || "OK"} {m.code?` - ${m.code}`:""} {m.model?` - ${m.model}`:""} {m.prevHash?` - ${m.prevHash}`:""}</div>
            </div>
          </div>
        ))}
        {loading && <div className="text-xs opacity-50">qwen2.5:1.5b thinking locally...</div>}
      </div>
      <div className="flex gap-2">
        <input value={prompt} onChange={e=>setPrompt(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="اسأل المساعد السيادي..." className="flex-1 p-2 rounded bg-zinc-800 text-white text-sm" />
        <button onClick={send} disabled={loading} className="px-4 py-2 bg-white text-black rounded text-sm font-bold">ارسال</button>
      </div>
    </div>
  );
}