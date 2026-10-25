import fs from "fs";
import path from "path";

const LOG_DIR = path.join(process.cwd(), "data");
const LOG_FILE = path.join(LOG_DIR, "sovereign-audit.jsonl");

function ensureDir(){
  if(!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
  if(!fs.existsSync(LOG_FILE)) fs.writeFileSync(LOG_FILE, "", "utf8");
}

export function append(entry){
  ensureDir();
  const line = JSON.stringify({ ...entry, ts: Date.now() }) + "\n";
  fs.appendFileSync(LOG_FILE, line, "utf8");
  return entry;
}

export function readAll(){
  ensureDir();
  try{
    const raw = fs.readFileSync(LOG_FILE, "utf8").trim();
    if(!raw) return [];
    return raw.split("\n").filter(Boolean).map(l=>{
      try{ return JSON.parse(l); }catch{ return null; }
    }).filter(Boolean);
  }catch{ return []; }
}

export function getLastHash(){
  const all = readAll();
  if(all.length===0) return "GENESIS";
  return all[all.length-1].hash || all[all.length-1].prevHash || "GENESIS";
}

export function getCount(){ return readAll().length; }
export function getLogPath(){ return LOG_FILE; }