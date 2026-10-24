import { doctor, ocr, chat } from "../services/sovereignKernel.js";
async function run(){
  const d = doctor();
  console.log(`DOCTOR: ${d.status}`);
  try{ await ocr(); console.error("FAIL: ocr should BLOCK"); process.exit(1);}catch(e){
    if(e.sovereign?.code !== "MODEL_UNAVAILABLE"){ console.error("FAIL ocr code", e); process.exit(1); }
  }
  try{ await chat({url:"https://external.com"}); console.error("FAIL chat should BLOCK"); process.exit(1);}catch(e){
    if(e.sovereign?.code !== "POLICY_BLOCKED"){ console.error("FAIL chat code", e); process.exit(1); }
  }
  console.log("DOCTOR: EGYPT_ONLY - LOCAL MODE - OK - BEHAVIORAL PASS");
}
run();
