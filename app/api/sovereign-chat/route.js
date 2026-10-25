import { chat, doctor } from "../../../services/sovereignKernel.js";

export async function POST(req){
  try{
    const body = await req.json();
    const result = await chat({ prompt: body.prompt, url: body.url });
    return new Response(JSON.stringify({ ...result, doctor: doctor() }), { status: 200, headers: {"Content-Type":"application/json"} });
  }catch(e){
    const sov = e.sovereign || { code: e.code || "UNKNOWN", decision: "BLOCKED", msg: e.message };
    const status = sov.code === "MODEL_UNAVAILABLE" ? 503 : sov.code === "POLICY_BLOCKED" ? 403 : 400;
    return new Response(JSON.stringify({ error: sov.code, decision: sov.decision || "BLOCKED", sovereign: sov, doctor: doctor() }), { status, headers: {"Content-Type":"application/json"} });
  }
}
export async function GET(){
  return new Response(JSON.stringify(doctor()), { status: 200, headers: {"Content-Type":"application/json"} });
}